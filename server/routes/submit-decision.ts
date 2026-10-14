import { and, eq, isNull } from 'drizzle-orm';
import type { Context, MiddlewareHandler } from 'hono';
import type { NpcCall } from '../../shared/models.ts';
import { config } from '../config.ts';
import { db } from '../db/index.ts';
import { gameSessions, gameTemplates, npcCalls, npcSessions, npcTemplates } from '../db/schema.ts';
import type { SubmitDecisionParams } from '../elevenlabs/types.ts';
import { attemptChallenge, hangUpAfterDecision } from '../game/calls.ts';
import { getNode } from '../game/decision-tree.ts';

/** Rejects tool calls without the shared secret. Skipped when ELEVENLABS_TOOL_SECRET is unset. */
export const verifyToolSecret: MiddlewareHandler = async (c, next) => {
  const { toolSecret } = config.elevenLabs;
  if (toolSecret && c.req.header('X-Tool-Secret') !== toolSecret) {
    console.warn('Tool call rejected: missing or wrong X-Tool-Secret');
    return c.json({ error: 'Invalid tool secret' }, 401);
  }
  return next();
};

/**
 * The agent's `submit_decision` server tool, called once the player picks an order. The calling
 * operative rolls the challenge and the mission moves on, but the agent isn't told the result: the
 * next call's briefing reveals it. Only one order is accepted per call.
 *
 * Game errors are 200 with `{error}`, so the agent can relay them to the player.
 */
export async function submitDecision(c: Context) {
  const params = await c.req
    .json<Partial<SubmitDecisionParams>>()
    .catch((): Partial<SubmitDecisionParams> => ({}));
  // The agent fills this from a dynamic variable, which may arrive as a string.
  const npcSessionId = Number(params.npc_session_id);

  const row = findActiveOperative(npcSessionId);
  if (!row) {
    return c.json({ error: `No active operative with npc_session_id ${params.npc_session_id}` });
  }

  const { npc, game, tree } = row;
  // Once an order is given the mission moves on, so without this the agent could keep ordering on
  // later nodes in the same call.
  const call = findCallInProgress(npcSessionId);
  if (call && (call.decision || call.nodeId !== game.decisionNodeId)) {
    return c.json({
      error:
        "You already have your orders for this call. Don't take another one: acknowledge, say " +
        "you'll call back once it's done, and end the call.",
    });
  }

  const node = getNode(tree, game.decisionNodeId);
  if (node.type === 'ending') {
    return c.json({ error: 'Your mission is over; there is nothing left to decide.' });
  }
  const choice = node.choices.find((choice) => choice.id === params.choice_id);
  if (!choice) {
    const validIds = node.choices.map((choice) => choice.id).join(', ');
    return c.json({ error: `Unknown choice_id "${params.choice_id}". Valid IDs: ${validIds}` });
  }

  attemptChallenge({
    gameSessionId: game.id,
    npcSessionId,
    stats: npc.stats,
    node,
    challengeId: choice.id,
    pickedBy: 'handler',
    callId: call?.id,
  });
  if (call) {
    hangUpAfterDecision(call);
  }

  return c.json({
    instructions:
      "In one short sentence, acknowledge the order and say you'll call back once it's done, then " +
      "end the call. Don't guess whether it will work. The line will cut out in a few seconds.",
  });
}

/** An operative in a game that hasn't ended, with their stats and the mission's tree. */
function findActiveOperative(npcSessionId: number) {
  return db
    .select({
      npc: npcTemplates,
      game: gameSessions,
      tree: gameTemplates.decisionTree,
    })
    .from(npcSessions)
    .innerJoin(npcTemplates, eq(npcSessions.npcTemplateId, npcTemplates.id))
    .innerJoin(gameSessions, eq(npcSessions.gameSessionId, gameSessions.id))
    .innerJoin(gameTemplates, eq(gameSessions.gameTemplateId, gameTemplates.id))
    .where(and(eq(npcSessions.id, npcSessionId), isNull(gameSessions.endTime)))
    .get();
}

/** The operative's call that hasn't ended yet, if any. Calls are one at a time per operative. */
function findCallInProgress(npcSessionId: number): NpcCall | undefined {
  return db
    .select()
    .from(npcCalls)
    .where(and(eq(npcCalls.npcSessionId, npcSessionId), isNull(npcCalls.endTime)))
    .get();
}
