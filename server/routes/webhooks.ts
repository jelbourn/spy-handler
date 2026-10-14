import { Hono } from 'hono';
import { notImplemented } from './not-implemented.ts';

/** Endpoints ElevenLabs and Twilio call. They need `PUBLIC_URL` to be reachable from outside. */
export const webhooks = new Hono();

/**
 * The agent's `submit_decision` server tool, called once the player picks an order. Rolls the
 * challenge and advances the operative, but the agent isn't told the result.
 *
 * Responds 401 for a bad `X-Tool-Secret`. Game errors are 200 with `{error}`, so the agent can relay
 * them to the player.
 */
webhooks.post('/elevenlabs/tools/submit-decision', notImplemented);

/**
 * ElevenLabs post-call webhook: a transcript after a call, or a call initiation failure. Must
 * respond 200, or ElevenLabs counts the delivery as failed. Responds 401 for a bad signature.
 */
webhooks.post('/elevenlabs/webhooks', notImplemented);

/** Inbound SMS from the player, answered with TwiML. Responds 403 for a bad Twilio signature. */
webhooks.post('/twilio/sms', notImplemented);
