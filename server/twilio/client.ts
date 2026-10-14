import twilio from 'twilio';
import { config } from '../config.ts';

const { accountSid, authToken } = config.twilio;
const client =
  accountSid && authToken && !config.fakeServices ? twilio(accountSid, authToken) : null;

/**
 * Hangs up a call that ElevenLabs placed through Twilio. Only logs with `--fake-services` or when
 * Twilio isn't configured, and ignores calls that have already ended.
 */
export async function hangUpCall(callSid: string): Promise<void> {
  if (!client) {
    console.log(`[fake Twilio] Would hang up call ${callSid}`);
    return;
  }
  const call = await client.calls(callSid).fetch();
  if (call.status === 'in-progress' || call.status === 'ringing' || call.status === 'queued') {
    await client.calls(callSid).update({ status: 'completed' });
  }
}
