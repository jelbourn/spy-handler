import { and, eq, isNull } from 'drizzle-orm';
import type {
  ChallengeRoll,
  ChoiceNode,
  NpcCall,
  NpcCallOutcome,
  NpcSession,
  NpcTemplate,
} from '../../shared/models.ts';
import { db } from '../db/index.ts';
import { gameSessions, npcCalls, npcSessions, npcTemplates } from '../db/schema.ts';
import { hangUpCall } from '../twilio/client.ts';
import { getNode, rollChallenge, tossCoin } from './decision-tree.ts';
import { resolveGameSession } from './game-sessions.ts';

// Placeholder pacing; tune once the game is playable.
/** Delay before the first operative calls after a session starts. */
export const FIRST_CALL_DELAY_MS = 15_000;
/** Gap between one call ending and the next operative calling. */
const BETWEEN_CALLS_DELAY_MS = 60_000;
/** Time the operative gets to acknowledge an order before the server hangs up. */
const HANG_UP_AFTER_DECISION_MS = 10_000;

export function updateNpcSession(npcSessionId: number, changes: Partial<NpcSession>): NpcSession {
  return db
    .update(npcSessions)
    .set(changes)
    .where(eq(npcSessions.id, npcSessionId))
    .returning()
    .get();
}

export function updateCall(callId: number, changes: Partial<NpcCall>): NpcCall {
  return db.update(npcCalls).set(changes).where(eq(npcCalls.id, callId)).returning().get();
}

/**
 * Hangs up a call shortly after the handler's order is in, in case the agent doesn't end it
 * itself: once there's an order, there's nothing left to talk about.
 */
export function hangUpAfterDecision(call: NpcCall): void {
  const { callSid } = call;
  if (!callSid) {
    return;
  }
  setTimeout(() => {
    hangUpCall(callSid).catch((error: unknown) => {
      console.error(`Couldn't hang up call ${call.id}:`, error);
    });
  }, HANG_UP_AFTER_DECISION_MS);
}

/**
 * Rolls the picked challenge and moves the operative to the node's success or failure child. The
 * roll is saved on the call it was decided on, if any.
 */
export function attemptChallenge(
  npcSession: NpcSession,
  npc: Pick<NpcTemplate, 'stats'>,
  node: ChoiceNode,
  challengeId: string,
  pickedBy: ChallengeRoll['pickedBy'],
  callId?: number,
): ChallengeRoll {
  const challenge = node.choices.find((choice) => choice.id === challengeId)!;
  const decision = rollChallenge(challenge, npc.stats, pickedBy);
  if (callId !== undefined) {
    updateCall(callId, { decision });
  }
  updateNpcSession(npcSession.id, {
    decisionNodeId: decision.succeeded ? node.onSuccess : node.onFailure,
    ...(pickedBy === 'handler' ? { lastCommsTime: new Date().toISOString() } : {}),
  });
  return decision;
}

/**
 * Marks a call as over and uses up the operative's turn. A call about a choice node always settles
 * it: without an order from the handler, the operative picks by coin toss. A call reporting an
 * ending settles the operative's status, which may end the game. Then the next call is scheduled.
 */
export function finishCall(
  callId: number,
  outcome: NpcCallOutcome,
  changes: Partial<NpcCall> = {},
): NpcCall {
  const call = updateCall(callId, { ...changes, outcome, endTime: new Date().toISOString() });
  const { npcSession, npc } = db
    .select({ npcSession: npcSessions, npc: npcTemplates })
    .from(npcSessions)
    .innerJoin(npcTemplates, eq(npcSessions.npcTemplateId, npcTemplates.id))
    .where(eq(npcSessions.id, call.npcSessionId))
    .get()!;
  updateNpcSession(npcSession.id, { callCount: npcSession.callCount + 1 });

  // Settled even if the player missed the call, so the game can't stall on an unanswered report.
  const calledAbout = getNode(npc.decisionTree, call.nodeId);
  if (calledAbout.type === 'ending') {
    updateNpcSession(npcSession.id, { status: calledAbout.result });
    resolveGameSession(npcSession.gameSessionId);
  } else if (!call.decision) {
    const challenge = tossCoin(calledAbout);
    attemptChallenge(npcSession, npc, calledAbout, challenge.id, 'operative', call.id);
  }

  scheduleNextCall(npcSession.gameSessionId, BETWEEN_CALLS_DELAY_MS);
  return call;
}

/** Sets when the next operative calls, unless the game session has ended. */
export function scheduleNextCall(gameSessionId: number, delayMs: number): void {
  db.update(gameSessions)
    .set({ nextCallTime: new Date(Date.now() + delayMs).toISOString() })
    .where(and(eq(gameSessions.id, gameSessionId), isNull(gameSessions.endTime)))
    .run();
}
