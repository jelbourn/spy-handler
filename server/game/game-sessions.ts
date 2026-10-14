import { and, eq, isNull } from 'drizzle-orm';
import type { GameSession } from '../../shared/models.ts';
import { db } from '../db/index.ts';
import { gameSessions, npcSessions } from '../db/schema.ts';

/**
 * Ends an active game session with a final status. Operatives stop calling once it has ended.
 * Returns undefined if the session doesn't exist or has already ended.
 */
export function endGameSession(
  gameSessionId: number,
  status: 'success' | 'failure',
): GameSession | undefined {
  return db
    .update(gameSessions)
    .set({ status, endTime: new Date().toISOString(), nextCallTime: null })
    .where(and(eq(gameSessions.id, gameSessionId), isNull(gameSessions.endTime)))
    .returning()
    .get();
}

/**
 * Ends the game session if its operatives have decided it: failure as soon as any operative has
 * failed, success once all of them have succeeded.
 */
export function resolveGameSession(gameSessionId: number): void {
  const statuses = db
    .select({ status: npcSessions.status })
    .from(npcSessions)
    .where(eq(npcSessions.gameSessionId, gameSessionId))
    .all()
    .map((row) => row.status);
  if (statuses.includes('failure')) {
    endGameSession(gameSessionId, 'failure');
  } else if (statuses.every((status) => status === 'success')) {
    endGameSession(gameSessionId, 'success');
  }
}
