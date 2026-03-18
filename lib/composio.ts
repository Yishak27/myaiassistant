import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getComposioExternalUserId(userId: string) {
  const prefix = process.env.COMPOSIO_EXTERNAL_USER_PREFIX || "myaiassistant";
  return `${prefix}:${userId}`;
}

export function createComposioClient() {
  return new Composio({
    apiKey: requireEnv("COMPOSIO_API_KEY"),
    provider: new VercelProvider(),
  });
}

