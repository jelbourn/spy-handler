import { and, eq } from 'drizzle-orm';
import { randomInt } from 'node:crypto';
import type { NpcSession } from '../../shared/models.ts';
import { db } from '../db/index.ts';
import { npcSessions } from '../db/schema.ts';

/**
 * Picks which operative calls next: a random one among those who have called the fewest times, so
 * the player hears from everyone before anyone calls again, in a different order each round.
 * Operatives whose ending has been reported are out. Returns undefined once nobody is left.
 */
export function pickNextCaller(gameSessionId: number): NpcSession | undefined {
  const active = db
    .select()
    .from(npcSessions)
    .where(and(eq(npcSessions.gameSessionId, gameSessionId), eq(npcSessions.status, 'in-progress')))
    .all();
  if (active.length === 0) {
    return undefined;
  }
  const fewestCalls = Math.min(...active.map((npcSession) => npcSession.callCount));
  const due = active.filter((npcSession) => npcSession.callCount === fewestCalls);
  return due[randomInt(due.length)];
}
