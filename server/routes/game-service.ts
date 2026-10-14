import { Hono, type Context } from 'hono';
import { endSession, getSessionDetail, listSessions, startSession } from './session.ts';
import { createUser, listUserSessions } from './user.ts';

/** The player-facing API, used by the Angular app. Mounted at `/api`. */
export const gameService = new Hono();

gameService.post('/users', createUser);
gameService.get('/users/:userId/sessions', listUserSessions);

gameService.get('/sessions', listSessions);
gameService.post('/sessions', startSession);
gameService.get('/sessions/:sessionId', getSessionDetail);
gameService.post('/sessions/:sessionId/end', endSession);

// TODO: Implement.
function notImplemented(c: Context) {
  return c.json({ error: `${c.req.method} ${c.req.path} is not implemented yet` }, 501);
}

/**
 * Server-Sent Events stream of `ServerEvent`s, so the UI updates live as calls happen. Sends a
 * `ping` every 15 seconds to keep proxies from closing the idle connection.
 */
gameService.get('/events', (c) => notImplemented(c));
