// Server configuration from environment variables (see the README for the `.env` format). Unset
// secrets are left undefined so local development works without them: the matching signature and
// secret checks are skipped.

function env(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const config = {
  port: Number(env('PORT') ?? 3000),
  /** Public tunnel URL that ElevenLabs and Twilio send webhooks to. */
  publicUrl: env('PUBLIC_URL'),

  twilio: {
    accountSid: env('TWILIO_ACCOUNT_SID'),
    authToken: env('TWILIO_AUTH_TOKEN'),
  },

  elevenLabs: {
    /** Secret for verifying post-call webhooks. */
    webhookSecret: env('ELEVENLABS_WEBHOOK_SECRET'),
    /** Shared secret the agent's server tools send in the `X-Tool-Secret` header. */
    toolSecret: env('ELEVENLABS_TOOL_SECRET'),
  },
};
