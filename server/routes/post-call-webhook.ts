import { and, eq, isNull } from 'drizzle-orm';
import type { Context } from 'hono';
import { createHmac, timingSafeEqual } from 'node:crypto';
import type { NpcCall, NpcCallOutcome, NpcCallTranscriptTurn } from '../../shared/models.ts';
import { config } from '../config.ts';
import { db } from '../db/index.ts';
import { npcCalls } from '../db/schema.ts';
import type {
  CallInitiationFailure,
  PostCallTranscription,
  TranscriptTurn,
  WebhookEvent,
} from '../elevenlabs/types.ts';
import { finishCall } from '../game/calls.ts';

/** How old a signed webhook may be, to limit replays. Matches the ElevenLabs SDK's tolerance. */
const SIGNATURE_TOLERANCE_SECS = 30 * 60;

/**
 * ElevenLabs post-call webhook: stores the transcript after a call, or records why a call couldn't
 * connect. Either way the call is finished, which may schedule a retry or settle the operative.
 *
 * Must respond 200, or ElevenLabs counts the delivery as failed. Responds 401 for a bad signature.
 */
export async function handlePostCallWebhook(c: Context) {
  const rawBody = await c.req.text();
  if (!isFromElevenLabs(rawBody, c.req.header('ElevenLabs-Signature'))) {
    return c.text('Invalid signature', 401);
  }
  handleWebhookEvent(JSON.parse(rawBody) as WebhookEvent);
  return c.body(null, 200);
}

/** Checks the webhook's signature. Always passes when ELEVENLABS_WEBHOOK_SECRET is unset. */
function isFromElevenLabs(rawBody: string, signatureHeader: string | undefined): boolean {
  const { webhookSecret } = config.elevenLabs;
  if (!webhookSecret || isValidSignature(rawBody, signatureHeader, webhookSecret)) {
    return true;
  }
  console.warn('Rejected ElevenLabs webhook: bad signature');
  return false;
}

/** Other event types, such as `post_call_audio`, are ignored. */
function handleWebhookEvent(event: WebhookEvent): void {
  switch (event.type) {
    case 'post_call_transcription':
      recordTranscript(event.data);
      break;
    case 'call_initiation_failure':
      recordCallFailure(event.data);
      break;
  }
}

/** Finishes a call that connected, saving what was said. */
function recordTranscript(data: PostCallTranscription): void {
  const callId = Number(data.conversation_initiation_client_data?.dynamic_variables?.npc_call_id);
  const call = findOpenCall(data.conversation_id, callId);
  if (!call) {
    return;
  }
  finishCall(call.id, 'completed', {
    conversationId: data.conversation_id,
    summary: data.analysis?.transcript_summary ?? null,
    transcript: toTranscript(data.transcript),
  });
}

/** Finishes a call that never connected. */
function recordCallFailure(data: CallInitiationFailure): void {
  const call = findOpenCall(data.conversation_id);
  if (!call) {
    return;
  }
  finishCall(call.id, toCallOutcome(data.failure_reason));
}

function toTranscript(turns: TranscriptTurn[]): NpcCallTranscriptTurn[] {
  return turns.map((turn) => ({ role: turn.role, message: turn.message ?? '' }));
}

function toCallOutcome(reason: CallInitiationFailure['failure_reason']): NpcCallOutcome {
  return reason === 'unknown' ? 'failed' : reason;
}

/** Checks an `ElevenLabs-Signature` header: `t=<unix secs>,v0=<HMAC-SHA256 hex of "t.body">`. */
function isValidSignature(body: string, header: string | undefined, secret: string): boolean {
  const parts = Object.fromEntries(
    (header ?? '').split(',').map((part) => part.split('=', 2) as [string, string]),
  );
  const timestamp = Number(parts['t']);
  const signature = parts['v0'];
  if (!signature || !Number.isFinite(timestamp)) {
    return false;
  }
  if (Math.abs(Date.now() / 1000 - timestamp) > SIGNATURE_TOLERANCE_SECS) {
    return false;
  }
  const expected = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
  return (
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  );
}

/**
 * Finds an in-progress call by conversation ID, falling back to our own call ID: the webhook can
 * arrive before the outbound call request has returned the conversation ID.
 */
function findOpenCall(conversationId: string, callId?: number): NpcCall | undefined {
  const byConversation = db
    .select()
    .from(npcCalls)
    .where(and(eq(npcCalls.conversationId, conversationId), isNull(npcCalls.endTime)))
    .get();
  if (byConversation || callId === undefined || !Number.isInteger(callId)) {
    return byConversation;
  }
  return db
    .select()
    .from(npcCalls)
    .where(and(eq(npcCalls.id, callId), isNull(npcCalls.endTime)))
    .get();
}
