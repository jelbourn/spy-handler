import { Hono, type Context } from 'hono';

/** The player-facing API, used by the Angular app. Mounted at `/api`. */
export const gameService = new Hono();

// TODO: Implement. Every endpoint is a stub that responds 501 for now.
function notImplemented(c: Context) {
  return c.json({ error: `${c.req.method} ${c.req.path} is not implemented yet` }, 501);
}

/** Lists all game sessions as `GameSession[]`, newest first. */
gameService.get('/sessions', (c) => notImplemented(c));

/**
 * Starts a game session from a `CreateGameSessionRequest`, creating an `NpcSession` per operative
 * and scheduling their first calls. Responds 201 with the `GameSession`.
 *
 * Errors: 400 for a bad body, 404 for an unknown user or template, and 409 if the user already has
 * an active session (only one is allowed at a time).
 */
gameService.post('/sessions', (c) => notImplemented(c));

/**
 * Gets a session as a `GameSessionDetail`: the session plus each operative's dossier and
 * `NpcSession`. Decision trees stay hidden from the player. Responds 404 if not found.
 */
gameService.get('/sessions/:sessionId', (c) => notImplemented(c));

/**
 * Abandons an active session, which counts as a failure. The remaining operatives stop calling.
 * Responds with the ended `GameSession`, or 404 if there's no active session with that ID.
 */
gameService.post('/sessions/:sessionId/end', (c) => notImplemented(c));

/**
 * Server-Sent Events stream of `ServerEvent`s, so the UI updates live as calls happen. Sends a
 * `ping` every 15 seconds to keep proxies from closing the idle connection.
 */
gameService.get('/events', (c) => notImplemented(c));
