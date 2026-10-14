import { and, eq, isNull, sql } from 'drizzle-orm';
import type { GameSession } from '../../shared/models.ts';
import { db } from '../db/index.ts';
import { gameSessions } from '../db/schema.ts';

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

/** Adds a failed roll to the game session's `failureCount`, returning the new count. */
export function countFailure(gameSessionId: number): number {
  return db
    .update(gameSessions)
    .set({ failureCount: sql`${gameSessions.failureCount} + 1` })
    .where(eq(gameSessions.id, gameSessionId))
    .returning({ failureCount: gameSessions.failureCount })
    .get()!.failureCount;
}
