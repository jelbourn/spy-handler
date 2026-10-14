import type { MiddlewareHandler } from 'hono';
import { config } from './config.ts';

/** The only paths reachable from the internet: the endpoints ElevenLabs calls. */
const PUBLIC_PATH_PREFIXES = ['/elevenlabs/'];

const publicHost = config.publicUrl ? new URL(config.publicUrl).host : undefined;

/**
 * Hides everything but the ElevenLabs endpoints from requests that come through the public tunnel,
 * since `/api/*` has no authentication: anyone could otherwise create a user and have operatives
 * call any number. Tailscale Funnel marks its requests with `Tailscale-Funnel-Request`; other
 * tunnels (e.g. ngrok) are recognized by the `PUBLIC_URL` host.
 */
export const restrictPublicAccess: MiddlewareHandler = async (c, next) => {
  const isPublic =
    c.req.header('Tailscale-Funnel-Request') !== undefined ||
    (publicHost !== undefined && c.req.header('Host') === publicHost);
  if (isPublic && !PUBLIC_PATH_PREFIXES.some((prefix) => c.req.path.startsWith(prefix))) {
    return c.notFound();
  }
  return next();
};
