import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Load KEY=VALUE pairs from .env.local into process.env.
 * Existing process.env values take precedence (shell overrides file).
 */
export function loadEnvLocal(cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.local");

  if (!existsSync(envPath)) {
    return { envPath, loaded: 0 };
  }

  const content = readFileSync(envPath, "utf8");
  let loaded = 0;

  for (const line of content.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const equalsIndex = trimmed.indexOf("=");

    if (equalsIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, equalsIndex).trim();
    let value = trimmed.slice(equalsIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
      loaded += 1;
    }
  }

  return { envPath, loaded };
}

export function getStripeMode(secretKey) {
  if (secretKey.startsWith("sk_live_")) {
    return "live";
  }

  if (secretKey.startsWith("sk_test_")) {
    return "test";
  }

  return "unknown";
}
