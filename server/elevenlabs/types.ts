// The parts of the ElevenLabs contract the game uses, so the real client and the fake are
// interchangeable. Shapes follow `@elevenlabs/elevenlabs-js`; see
// https://elevenlabs.io/docs/api-reference/twilio/outbound-call and
// https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks.

/** Values substituted into the agent's prompt, first message and tool parameters. */
export interface OperativeCallVariables {
  npc_name: string;
  persona: string;
  scenario: string;
  /** The current node's briefing. On an ending, the outcome to report. */
  situation: string;
  /** Available orders, one `- id: description` per line. Empty on an ending. */
  choices: string;
  npc_session_id: number;
  npc_call_id: number;
}

/** Request for `conversationalAi.twilio.outboundCall`. */
export interface OutboundCallRequest {
  agentId: string;
  agentPhoneNumberId: string;
  toNumber: string;
  conversationInitiationClientData: {
    dynamicVariables: OperativeCallVariables;
    conversationConfigOverride?: {
      agent?: { firstMessage?: string };
      tts?: { voiceId?: string; speed?: number };
    };
  };
}

export interface OutboundCallResponse {
  success: boolean;
  message: string;
  conversationId?: string;
  callSid?: string;
}

export interface OutboundCaller {
  outboundCall(request: OutboundCallRequest): Promise<OutboundCallResponse>;
}

/** Body of the `submit_decision` server tool call. */
export interface SubmitDecisionParams {
  /** Filled from the `{{npc_session_id}}` dynamic variable. */
  npc_session_id: number;
  /** One of the IDs in `{{choices}}`, picked by the LLM from what the player said. */
  choice_id: string;
}

export interface TranscriptTurn {
  role: 'agent' | 'user';
  message: string | null;
}

/** Sent after a call that connected, once ElevenLabs has analyzed it. */
export interface PostCallTranscription {
  agent_id: string;
  conversation_id: string;
  status: 'done';
  transcript: TranscriptTurn[];
  analysis: { transcript_summary: string };
  conversation_initiation_client_data: { dynamic_variables: OperativeCallVariables };
}

/** Sent when an outbound call couldn't connect. */
export interface CallInitiationFailure {
  agent_id: string;
  conversation_id: string;
  failure_reason: 'busy' | 'no-answer' | 'unknown';
}

/** Post-call webhook events, signed with the workspace webhook secret. */
export type WebhookEvent =
  | { type: 'post_call_transcription'; event_timestamp: number; data: PostCallTranscription }
  | { type: 'call_initiation_failure'; event_timestamp: number; data: CallInitiationFailure };
