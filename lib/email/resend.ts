import { Resend } from "resend";

const RESEND_SENDER_NAME = "MyWebMe";

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();

  if (!key || key.startsWith("your_")) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  return key;
}

function getResendFromAddress(): string {
  const email = process.env.RESEND_FROM_EMAIL?.trim();

  if (!email) {
    throw new Error("Missing RESEND_FROM_EMAIL environment variable.");
  }

  // Strip an existing display name so we always apply MyWebMe consistently.
  const match = email.match(/<([^>]+)>/);
  const address = match ? match[1].trim() : email;

  return address;
}

/** Returns "MyWebMe <sites@mywebme.com>" for Resend `from` fields. */
export function getResendFromEmail(): string {
  return `${RESEND_SENDER_NAME} <${getResendFromAddress()}>`;
}

export function createResendClient(): Resend {
  const key = getResendApiKey();
  console.log("[email/resend] Creating Resend client:", {
    fromEmail: getResendFromEmail(),
    apiKeyPrefix: `${key.slice(0, 8)}…`,
    apiKeyLength: key.length,
  });
  return new Resend(key);
}
