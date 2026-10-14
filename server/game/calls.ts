import { and, eq, isNull } from 'drizzle-orm';
import type {
  ChallengeRoll,
  ChoiceNode,
  NpcCall,
  NpcCallOutcome,
  NpcSession,
  Stats,
} from '../../shared/models.ts';
import { db } from '../db/index.ts';
import { gameSessions, gameTemplates, npcCalls, npcSessions, npcTemplates } from '../db/schema.ts';
import { hangUpCall } from '../twilio/client.ts';
import { getNode, rollChallenge, tossCoin } from './decision-tree.ts';
import { countFailure, endGameSession } from './game-sessions.ts';

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

export interface ChallengeAttempt {
  gameSessionId: number;
  /** The operative attempting it, whose stats set the odds. */
  npcSessionId: number;
  stats: Stats;
  node: ChoiceNode;
  challengeId: string;
  pickedBy: ChallengeRoll['pickedBy'];
  /** The call it was decided on, which the roll is saved to. */
  callId?: number;
}

/**
 * Rolls the picked challenge and moves the mission to the node's success or failure child. A
 * failure that passes the scenario's `allowedFailures` loses the game instead.
 */
export function attemptChallenge(attempt: ChallengeAttempt): ChallengeRoll {
  const { gameSessionId, node, pickedBy, callId } = attempt;
  const challenge = node.choices.find((choice) => choice.id === attempt.challengeId)!;
  const decision = rollChallenge(challenge, attempt.stats, pickedBy);
  if (callId !== undefined) {
    updateCall(callId, { decision });
  }
  if (pickedBy === 'handler') {
    updateNpcSession(attempt.npcSessionId, { lastCommsTime: new Date().toISOString() });
  }

  if (decision.succeeded) {
    moveMissionTo(gameSessionId, node.onSuccess);
  } else if (countFailure(gameSessionId) > getAllowedFailures(gameSessionId)) {
    endGameSession(gameSessionId, 'failure');
  } else {
    // Seeding checks that a failure branch exists wherever the team can still afford a failure.
    moveMissionTo(gameSessionId, node.onFailure!);
  }
  return decision;
}

/**
 * Marks a call as over and uses up the operative's turn. A call about a choice node always settles
 * it: without an order from the handler, the operative picks by coin toss. A call reporting the
 * ending wins the game. Otherwise the next call is scheduled.
 */
export function finishCall(
  callId: number,
  outcome: NpcCallOutcome,
  changes: Partial<NpcCall> = {},
): NpcCall {
  const call = updateCall(callId, { ...changes, outcome, endTime: new Date().toISOString() });
  const { npcSession, npc, game, tree } = db
    .select({
      npcSession: npcSessions,
      npc: npcTemplates,
      game: gameSessions,
      tree: gameTemplates.decisionTree,
    })
    .from(npcSessions)
    .innerJoin(npcTemplates, eq(npcSessions.npcTemplateId, npcTemplates.id))
    .innerJoin(gameSessions, eq(npcSessions.gameSessionId, gameSessions.id))
    .innerJoin(gameTemplates, eq(gameSessions.gameTemplateId, gameTemplates.id))
    .where(eq(npcSessions.id, call.npcSessionId))
    .get()!;
  updateNpcSession(npcSession.id, { callCount: npcSession.callCount + 1 });
  if (game.endTime) {
    return call;
  }

  // Settled even if the player missed the call, so the game can't stall on an unanswered report.
  const calledAbout = getNode(tree, call.nodeId);
  if (calledAbout.type === 'ending') {
    endGameSession(game.id, 'success');
    return call;
  }
  if (!call.decision) {
    attemptChallenge({
      gameSessionId: game.id,
      npcSessionId: npcSession.id,
      stats: npc.stats,
      node: calledAbout,
      challengeId: tossCoin(calledAbout).id,
      pickedBy: 'operative',
      callId: call.id,
    });
  }
  scheduleNextCall(game.id, BETWEEN_CALLS_DELAY_MS);
  return call;
}

/** Sets when the next operative calls, unless the game session has ended. */
export function scheduleNextCall(gameSessionId: number, delayMs: number): void {
  db.update(gameSessions)
    .set({ nextCallTime: new Date(Date.now() + delayMs).toISOString() })
    .where(and(eq(gameSessions.id, gameSessionId), isNull(gameSessions.endTime)))
    .run();
}

function moveMissionTo(gameSessionId: number, nodeId: string): void {
  db.update(gameSessions)
    .set({ decisionNodeId: nodeId })
    .where(eq(gameSessions.id, gameSessionId))
    .run();
}

function getAllowedFailures(gameSessionId: number): number {
  return db
    .select({ allowedFailures: gameTemplates.allowedFailures })
    .from(gameSessions)
    .innerJoin(gameTemplates, eq(gameSessions.gameTemplateId, gameTemplates.id))
    .where(eq(gameSessions.id, gameSessionId))
    .get()!.allowedFailures;
}
