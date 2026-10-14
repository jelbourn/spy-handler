import { and, isNotNull, isNull, lte } from 'drizzle-orm';
import { db } from '../db/index.ts';
import { gameSessions, npcCalls } from '../db/schema.ts';
import { finishCall, placeNextCall } from './calls.ts';

/** How often to check for calls that are due. */
const POLL_MS = 5_000;
/** A call with no webhook after this long is given up on, so the game can't stall on it. */
const CALL_TIMEOUT_MS = 15 * 60_000;

/** Places each game's next call once its `nextCallTime` passes, and times out lost calls. */
export function startScheduler(): void {
  setInterval(() => {
    try {
      placeDueCalls();
      timeOutLostCalls();
    } catch (error) {
      console.error('Scheduler tick failed:', error);
    }
  }, POLL_MS);
}

function placeDueCalls(): void {
  const now = new Date().toISOString();
  const due = db
    .select({ id: gameSessions.id })
    .from(gameSessions)
    .where(
      and(
        isNull(gameSessions.endTime),
        isNotNull(gameSessions.nextCallTime),
        lte(gameSessions.nextCallTime, now),
      ),
    )
    .all();
  for (const { id } of due) {
    placeNextCall(id).catch((error: unknown) => {
      console.error(`Couldn't place the next call for game session ${id}:`, error);
    });
  }
}

function timeOutLostCalls(): void {
  const cutoff = new Date(Date.now() - CALL_TIMEOUT_MS).toISOString();
  const lost = db
    .select({ id: npcCalls.id })
    .from(npcCalls)
    .where(and(isNull(npcCalls.endTime), lte(npcCalls.startTime, cutoff)))
    .all();
  for (const { id } of lost) {
    finishCall(id, 'timeout');
  }
}
