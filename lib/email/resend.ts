import { Resend } from "resend";

export function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();

  if (!key || key.startsWith("your_")) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  return key;
}

export function getResendFromEmail(): string {
  const email = process.env.RESEND_FROM_EMAIL?.trim();

  if (!email) {
    throw new Error("Missing RESEND_FROM_EMAIL environment variable.");
  }

  return email;
}

export function createResendClient(): Resend {
  return new Resend(getResendApiKey());
}
