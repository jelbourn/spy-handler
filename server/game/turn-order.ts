import { eq } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { NpcSession } from '../../shared/models.ts';
import { db } from '../db/index.ts';
import { npcSessions } from '../db/schema.ts';

/**
 * Picks which operative calls next, taking the mission's current node: a random one among those
 * who have called the fewest times, so the player hears from everyone before anyone calls again,
 * in a different order each round.
 */
export function pickNextCaller(gameSessionId: number): NpcSession | undefined {
  const operatives = db
    .select()
    .from(npcSessions)
    .where(eq(npcSessions.gameSessionId, gameSessionId))
    .all();
  if (operatives.length === 0) {
    return undefined;
  }
  const fewestCalls = Math.min(...operatives.map((npcSession) => npcSession.callCount));
  const due = operatives.filter((npcSession) => npcSession.callCount === fewestCalls);
  return due[randomInt(due.length)];
}
