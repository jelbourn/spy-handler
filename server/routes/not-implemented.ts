import type { Context } from 'hono';

/** Placeholder handler for endpoints that aren't built yet. */
export function notImplemented(c: Context) {
  return c.json({ error: `${c.req.method} ${c.req.path} is not implemented yet` }, 501);
}
