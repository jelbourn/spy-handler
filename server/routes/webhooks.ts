import { Hono } from 'hono';
import { handlePostCallWebhook } from './post-call-webhook.ts';
import { receiveSms, verifyTwilioSignature } from './sms.ts';
import { submitDecision, verifyToolSecret } from './submit-decision.ts';

/** Endpoints ElevenLabs and Twilio call. They need `PUBLIC_URL` to be reachable from outside. */
export const webhooks = new Hono();

webhooks.post('/elevenlabs/tools/submit-decision', verifyToolSecret, submitDecision);

webhooks.post('/elevenlabs/webhooks', handlePostCallWebhook);

webhooks.post('/twilio/sms', verifyTwilioSignature, receiveSms);
