// Server configuration from environment variables (see the README for the `.env` format).

function env(name: string): string | undefined {
  return process.env[name] || undefined;
}

export const config = {
  port: Number(env('PORT') ?? 3000),
};
