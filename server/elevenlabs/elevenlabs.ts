import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js';
import { config } from '../config.ts';
import { FakeElevenLabs } from './fake-elevenlabs.ts';
import type { OutboundCaller, OutboundCallRequest, OutboundCallResponse } from './types.ts';

/** Places real calls: the agent dials the player through the Twilio number imported into ElevenLabs. */
export class RealElevenLabs implements OutboundCaller {
  private readonly client: ElevenLabsClient | null;

  constructor(apiKey = config.elevenLabs.apiKey) {
    this.client = apiKey ? new ElevenLabsClient({ apiKey }) : null;
  }

  async outboundCall(request: OutboundCallRequest): Promise<OutboundCallResponse> {
    if (!this.client || !request.agentPhoneNumberId) {
      throw new Error(
        'ELEVENLABS_API_KEY and ELEVENLABS_PHONE_NUMBER_ID must be set to place calls ' +
          '(or run with --fake-services)',
      );
    }
    const { dynamicVariables, conversationConfigOverride } =
      request.conversationInitiationClientData;
    return this.client.conversationalAi.twilio.outboundCall({
      ...request,
      conversationInitiationClientData: {
        dynamicVariables: { ...dynamicVariables },
        conversationConfigOverride,
      },
    });
  }
}

/** The ElevenLabs the server uses: the fake with `--fake-services`, otherwise the real one. */
export const elevenLabs: OutboundCaller = config.fakeServices
  ? new FakeElevenLabs()
  : new RealElevenLabs();
