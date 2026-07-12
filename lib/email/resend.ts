import { Resend } from "resend";

const RESEND_SENDER_NAME = "MyWebMe";

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();

  if (!key || key.startsWith("your_")) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  return key;
}

/** Raw RESEND_FROM_EMAIL value (may include a display name). */
export function getResendFromEmailEnv(): string {
  const email = process.env.RESEND_FROM_EMAIL?.trim();

  if (!email) {
    throw new Error("Missing RESEND_FROM_EMAIL environment variable.");
  }

  return email;
}

function getResendFromAddress(): string {
  const email = getResendFromEmailEnv();

  // Strip an existing display name so we always apply MyWebMe consistently.
  const match = email.match(/<([^>]+)>/);
  const address = match ? match[1].trim() : email;

  return address;
}

/** Returns "MyWebMe <address>" using RESEND_FROM_EMAIL (never a hardcoded address). */
export function getResendFromEmail(): string {
  return `${RESEND_SENDER_NAME} <${getResendFromAddress()}>`;
}

/** Safe diagnostics for logs — never includes the full API key. */
export function getResendEnvDiagnostics(): {
  hasApiKey: boolean;
  apiKeyPrefix: string | null;
  apiKeyLength: number;
  apiKeyLooksPlaceholder: boolean;
  fromEnvRaw: string | null;
  fromFormatted: string | null;
  fromEnvMissing: boolean;
} {
  const key = process.env.RESEND_API_KEY?.trim() || "";
  const fromEnv = process.env.RESEND_FROM_EMAIL?.trim() || "";

  let fromFormatted: string | null = null;
  try {
    fromFormatted = fromEnv ? getResendFromEmail() : null;
  } catch {
    fromFormatted = null;
  }

  return {
    hasApiKey: Boolean(key) && !key.startsWith("your_"),
    apiKeyPrefix: key ? `${key.slice(0, 6)}…` : null,
    apiKeyLength: key.length,
    apiKeyLooksPlaceholder: key.startsWith("your_"),
    fromEnvRaw: fromEnv || null,
    fromFormatted,
    fromEnvMissing: !fromEnv,
  };
}

export function createResendClient(): Resend {
  const key = getResendApiKey();
  console.log("[email/resend] Creating Resend client:", getResendEnvDiagnostics());
  return new Resend(key);
}

export function formatResendError(error: unknown): string {
  if (!error) {
    return "Unknown Resend error";
  }

  if (typeof error === "string") {
    return error;
  }

  if (error instanceof Error) {
    return error.message;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}
