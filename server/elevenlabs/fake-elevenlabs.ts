import { createHmac, randomUUID } from 'node:crypto';
import { config } from '../config.ts';
import type {
  OutboundCaller,
  OutboundCallRequest,
  OutboundCallResponse,
  SubmitDecisionParams,
  WebhookEvent,
} from './types.ts';

export interface FakeElevenLabsOptions {
  /** Time from placing the call until the "player" gives an order. Defaults to 5 seconds. */
  decisionDelayMs?: number;
  /** Time from the order until the call ends and the webhook arrives. Defaults to 3 seconds. */
  hangUpDelayMs?: number;
}

/**
 * Stands in for ElevenLabs in development, so no calls are placed and no credit is used. Each call
 * plays out against this server like a real one: the "player" picks a random order through the
 * `submit_decision` tool endpoint, then a signed post-call webhook follows.
 */
export class FakeElevenLabs implements OutboundCaller {
  /** Where the tool call and webhook are sent; the server itself, so no tunnel is needed. */
  private readonly serverUrl = `http://localhost:${config.port}`;
  private readonly decisionDelayMs: number;
  private readonly hangUpDelayMs: number;

  constructor(options: FakeElevenLabsOptions = {}) {
    this.decisionDelayMs = options.decisionDelayMs ?? 5_000;
    this.hangUpDelayMs = options.hangUpDelayMs ?? 3_000;
  }

  async outboundCall(request: OutboundCallRequest): Promise<OutboundCallResponse> {
    const conversationId = `fake_conv_${randomUUID()}`;
    const callSid = `CAfake${randomUUID().replaceAll('-', '')}`;
    void this.playCall(request, conversationId).catch((error: unknown) => {
      console.error(`[fake ElevenLabs] Call ${conversationId} failed:`, error);
    });
    return { success: true, message: 'Fake call placed', conversationId, callSid };
  }

  private async playCall(request: OutboundCallRequest, conversationId: string): Promise<void> {
    const variables = request.conversationInitiationClientData.dynamicVariables;
    const firstMessage =
      request.conversationInitiationClientData.conversationConfigOverride?.agent?.firstMessage ??
      `${variables.handle}, it's ${variables.npc_name}.`;
    const transcript: { role: 'agent' | 'user'; message: string }[] = [
      { role: 'agent', message: firstMessage },
      { role: 'agent', message: variables.situation },
    ];

    await sleep(this.decisionDelayMs);
    let summary = `${variables.npc_name} reported the outcome of their mission.`;
    const choiceIds = parseChoiceIds(variables.choices);
    // An ending has no choices: the operative just reports it.
    if (choiceIds.length > 0) {
      const choiceId = choiceIds[Math.floor(Math.random() * choiceIds.length)]!;
      transcript.push({ role: 'user', message: `Go with ${choiceId}.` });
      await this.submitDecision({ npc_session_id: variables.npc_session_id, choice_id: choiceId });
      transcript.push({ role: 'agent', message: "Understood. I'll call back once it's done." });
      summary = `${variables.npc_name} briefed the handler, who ordered ${choiceId}.`;
    }

    await sleep(this.hangUpDelayMs);
    await this.sendWebhook({
      type: 'post_call_transcription',
      event_timestamp: Math.floor(Date.now() / 1000),
      data: {
        agent_id: request.agentId,
        conversation_id: conversationId,
        status: 'done',
        transcript,
        analysis: { transcript_summary: summary },
        conversation_initiation_client_data: { dynamic_variables: variables },
      },
    });
  }

  /** Calls the tool the way the agent does. */
  private async submitDecision(params: SubmitDecisionParams): Promise<void> {
    const response = await fetch(`${this.serverUrl}/elevenlabs/tools/submit-decision`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.elevenLabs.toolSecret ? { 'X-Tool-Secret': config.elevenLabs.toolSecret } : {}),
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`Tool call rejected: ${response.status} ${await response.text()}`);
    }
  }

  /** Sends a webhook signed like ElevenLabs': `t=<unix secs>,v0=<HMAC-SHA256 of "t.body">`. */
  private async sendWebhook(event: WebhookEvent): Promise<void> {
    const body = JSON.stringify(event);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const { webhookSecret } = config.elevenLabs;
    if (webhookSecret) {
      const timestamp = Math.floor(Date.now() / 1000);
      const hmac = createHmac('sha256', webhookSecret).update(`${timestamp}.${body}`).digest('hex');
      headers['ElevenLabs-Signature'] = `t=${timestamp},v0=${hmac}`;
    }
    const response = await fetch(`${this.serverUrl}/elevenlabs/webhooks`, {
      method: 'POST',
      headers,
      body,
    });
    if (!response.ok) {
      throw new Error(`Webhook rejected: ${response.status} ${await response.text()}`);
    }
  }
}

/** Reads the IDs from `{{choices}}`, which lists one `- id: description` per line. */
function parseChoiceIds(choices: string): string[] {
  return choices
    .split('\n')
    .map((line) => /^- ([^:]+):/.exec(line.trim())?.[1])
    .filter((id) => id !== undefined);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
