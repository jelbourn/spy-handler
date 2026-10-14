import { desc, eq, or } from 'drizzle-orm';
import type { Context } from 'hono';
import type { CreateUserRequest } from '../../shared/models.ts';
import { db } from '../db/index.ts';
import { gameSessions, users } from '../db/schema.ts';

const E164 = /^\+[1-9]\d{1,14}$/;

/**
 * Creates a user from a `CreateUserRequest`. Responds 201 with the `User`.
 *
 * Errors: 400 for a bad body or a phone number that isn't E.164, and 409 if the username or phone
 * number is taken.
 */
export async function createUser(c: Context) {
  const { username, phoneNumber } = await c.req
    .json<Partial<CreateUserRequest>>()
    .catch((): Partial<CreateUserRequest> => ({}));
  if (typeof username !== 'string' || !username.trim()) {
    return c.json({ error: 'username is required' }, 400);
  }
  if (typeof phoneNumber !== 'string' || !E164.test(phoneNumber)) {
    return c.json({ error: 'phoneNumber must be E.164, e.g. +15555550100' }, 400);
  }

  const taken = db
    .select()
    .from(users)
    .where(or(eq(users.username, username), eq(users.phoneNumber, phoneNumber)))
    .get();
  if (taken) {
    const field = taken.username === username ? 'username' : 'phoneNumber';
    return c.json({ error: `${field} is already taken` }, 409);
  }

  const user = db.insert(users).values({ username, phoneNumber }).returning().get();
  return c.json(user, 201);
}

/** Lists a user's game sessions as `GameSession[]`, newest first. Responds 404 for an unknown user. */
export function listUserSessions(c: Context) {
  const userId = Number(c.req.param('userId'));
  if (!db.select().from(users).where(eq(users.id, userId)).get()) {
    return c.json({ error: `User ${c.req.param('userId')} not found` }, 404);
  }
  return c.json(
    db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.userId, userId))
      .orderBy(desc(gameSessions.startTime))
      .all(),
  );
}
