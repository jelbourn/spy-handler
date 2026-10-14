import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Context } from 'hono';
import type {
  Checkpoint,
  CreateGameSessionRequest,
  DecisionTree,
  GameSessionDetail,
  NpcCall,
} from '../../shared/models.ts';
import { db } from '../db/index.ts';
import {
  gameSessions,
  gameTemplates,
  npcCalls,
  npcSessions,
  npcTemplates,
  users,
} from '../db/schema.ts';
import { getNode } from '../game/decision-tree.ts';
import { FIRST_CALL_DELAY_MS } from '../game/calls.ts';
import { endGameSession } from '../game/game-sessions.ts';

/** Lists all game sessions as `GameSession[]`, newest first. */
export function listSessions(c: Context) {
  return c.json(db.select().from(gameSessions).orderBy(desc(gameSessions.startTime)).all());
}

/**
 * Starts a game session from a `CreateGameSessionRequest`, creating an `NpcSession` per operative
 * and scheduling the first call. Responds 201 with the `GameSession`.
 *
 * Errors: 400 for a bad body, 404 for an unknown user or template, and 409 if the user already has
 * an active session (only one is allowed at a time).
 */
export async function startSession(c: Context) {
  const { userId, gameTemplateId } = await c.req
    .json<Partial<CreateGameSessionRequest>>()
    .catch((): Partial<CreateGameSessionRequest> => ({}));
  if (!Number.isInteger(userId) || !Number.isInteger(gameTemplateId)) {
    return c.json({ error: 'userId and gameTemplateId must be integers' }, 400);
  }

  // better-sqlite3 transactions are synchronous, so the active-session check and insert are atomic.
  const result = db.transaction((tx) => {
    if (!tx.select().from(users).where(eq(users.id, userId!)).get()) {
      return { error: `User ${userId} not found`, status: 404 } as const;
    }
    const template = tx
      .select()
      .from(gameTemplates)
      .where(eq(gameTemplates.id, gameTemplateId!))
      .get();
    if (!template) {
      return { error: `Game template ${gameTemplateId} not found`, status: 404 } as const;
    }
    const active = tx
      .select()
      .from(gameSessions)
      .where(and(eq(gameSessions.userId, userId!), isNull(gameSessions.endTime)))
      .get();
    if (active) {
      return { error: `User already has active session ${active.id}`, status: 409 } as const;
    }

    const now = Date.now();
    const session = tx
      .insert(gameSessions)
      .values({
        userId: userId!,
        gameTemplateId: gameTemplateId!,
        startTime: new Date(now).toISOString(),
        nextCallTime: new Date(now + FIRST_CALL_DELAY_MS).toISOString(),
        decisionNodeId: template.decisionTree.startNodeId,
      })
      .returning()
      .get();
    const npcs = tx
      .select()
      .from(npcTemplates)
      .where(eq(npcTemplates.gameTemplateId, gameTemplateId!))
      .all();
    if (npcs.length > 0) {
      tx.insert(npcSessions)
        .values(
          npcs.map((npc) => ({
            gameSessionId: session.id,
            npcTemplateId: npc.id,
          })),
        )
        .run();
    }
    return { session };
  });

  if ('error' in result) {
    return c.json({ error: result.error }, result.status);
  }
  return c.json(result.session, 201);
}

/**
 * Gets a session as a `GameSessionDetail`: the session, each operative's dossier and `NpcSession`,
 * and a checkpoint per call. Only the nodes already called about are shown; the rest of the
 * decision tree stays hidden. Responds 404 if not found.
 */
export function getSessionDetail(c: Context) {
  const id = Number(c.req.param('sessionId'));
  const row = db
    .select({ session: gameSessions, template: gameTemplates })
    .from(gameSessions)
    .innerJoin(gameTemplates, eq(gameSessions.gameTemplateId, gameTemplates.id))
    .where(eq(gameSessions.id, id))
    .get();
  if (!row) {
    return c.json({ error: `Session ${c.req.param('sessionId')} not found` }, 404);
  }
  const { session, template } = row;
  const operatives = db
    .select({ npcSession: npcSessions, npc: npcTemplates })
    .from(npcSessions)
    .innerJoin(npcTemplates, eq(npcSessions.npcTemplateId, npcTemplates.id))
    .where(eq(npcSessions.gameSessionId, id))
    .orderBy(npcSessions.id)
    .all();
  const calls = db
    .select({ call: npcCalls })
    .from(npcCalls)
    .innerJoin(npcSessions, eq(npcCalls.npcSessionId, npcSessions.id))
    .where(eq(npcSessions.gameSessionId, id))
    .orderBy(npcCalls.id)
    .all()
    .map((row) => row.call);
  const detail: GameSessionDetail = {
    ...session,
    title: template.title,
    operatives: operatives.map(({ npcSession, npc }) => ({
      dossier: { name: npc.name, bio: npc.persona, stats: npc.stats },
      npcSession,
    })),
    checkpoints: calls.map((call, i) =>
      toCheckpoint(call, template.decisionTree, session.endTime !== null || i < calls.length - 1),
    ),
  };
  return c.json(detail);
}

/**
 * @param revealed Whether the roll's result can be shown: once a later call has started (its
 *     briefing reveals it) or the game has ended.
 */
function toCheckpoint(call: NpcCall, tree: DecisionTree, revealed: boolean): Checkpoint {
  const node = getNode(tree, call.nodeId);
  const base = {
    callId: call.id,
    npcSessionId: call.npcSessionId,
    situation: node.situation,
    startTime: call.startTime,
  };
  if (!call.endTime) {
    return { ...base, status: 'live', decision: null };
  }
  if (!call.decision) {
    // Only a call reporting the ending finishes without a decision.
    return { ...base, status: 'cleared', decision: null };
  }
  if (!revealed) {
    return { ...base, status: 'pending', decision: null };
  }
  return {
    ...base,
    status: call.decision.succeeded ? 'cleared' : 'failed',
    decision: call.decision,
  };
}

/**
 * Abandons an active session, which counts as a failure. The remaining operatives stop calling.
 * Responds with the ended `GameSession`, or 404 if there's no active session with that ID.
 */
export function endSession(c: Context) {
  const id = Number(c.req.param('sessionId'));
  const session = endGameSession(id, 'failure');
  if (!session) {
    return c.json({ error: `No active session ${c.req.param('sessionId')}` }, 404);
  }
  return c.json(session);
}
