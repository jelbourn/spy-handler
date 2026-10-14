// Server configuration from environment variables (see the README for the `.env` format).

function env(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const config = {
  port: Number(env('PORT') ?? 3000),

  elevenLabs: {
    /** Secret for verifying post-call webhooks. */
    webhookSecret: env('ELEVENLABS_WEBHOOK_SECRET'),
    /** Shared secret the agent's server tools send in the `X-Tool-Secret` header. */
    toolSecret: env('ELEVENLABS_TOOL_SECRET'),
  },
};
