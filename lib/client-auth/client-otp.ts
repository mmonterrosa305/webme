import { randomInt } from "node:crypto";

import { createResendClient, getResendFromEmail } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

import { buildPortalOtpEmail } from "./build-portal-otp-email";
import { CLIENT_OTP_EXPIRY_SECONDS } from "./constants";
import { ensureClientAuthUser } from "./ensure-client-auth-user";

export type ClientOtpRecord = {
  id: string;
  email: string;
  code: string;
  expires_at: string;
  used: boolean;
};

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function generateSixDigitCode(): string {
  return randomInt(0, 1_000_000).toString().padStart(6, "0");
}

export async function storeClientOtp(
  email: string,
  code: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const supabase = createAdminClient();
  const expiresAt = new Date(
    Date.now() + CLIENT_OTP_EXPIRY_SECONDS * 1000,
  ).toISOString();

  const { error: invalidateError } = await supabase
    .from("client_otps")
    .update({ used: true })
    .eq("email", normalizedEmail)
    .eq("used", false);

  if (invalidateError) {
    throw new Error(
      `Failed to invalidate previous codes: ${invalidateError.message}`,
    );
  }

  const { error: insertError } = await supabase.from("client_otps").insert({
    email: normalizedEmail,
    code,
    expires_at: expiresAt,
    used: false,
  });

  if (insertError) {
    throw new Error(`Failed to store sign-in code: ${insertError.message}`);
  }
}

export async function sendClientOtpEmail(
  email: string,
  code: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);
  const expiresInMinutes = Math.round(CLIENT_OTP_EXPIRY_SECONDS / 60);
  const { subject, html, text } = buildPortalOtpEmail({
    code,
    expiresInMinutes,
  });

  const resend = createResendClient();
  const sendResult = await resend.emails.send({
    from: getResendFromEmail(),
    to: normalizedEmail,
    subject,
    html,
    text,
  });

  if (sendResult.error) {
    throw new Error(sendResult.error.message);
  }
}

export async function verifyClientOtp(
  email: string,
  code: string,
): Promise<ClientOtpRecord> {
  const normalizedEmail = normalizeEmail(email);
  const normalizedCode = code.replace(/\D/g, "");

  if (normalizedCode.length !== 6) {
    throw new Error("Enter a valid 6-digit code.");
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("client_otps")
    .select("id, email, code, expires_at, used")
    .eq("email", normalizedEmail)
    .eq("code", normalizedCode)
    .eq("used", false)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("Invalid or expired code.");
  }

  const record = data as ClientOtpRecord;

  if (!record.id) {
    throw new Error("Invalid sign-in code record. Request a new code.");
  }

  if (new Date(record.expires_at).getTime() < Date.now()) {
    throw new Error("This code has expired. Request a new one.");
  }

  return record;
}

export async function markClientOtpUsed(otpId: string): Promise<void> {
  if (!otpId) {
    throw new Error("Cannot mark sign-in code as used: missing code id.");
  }

  const supabase = createAdminClient();

  const { error } = await supabase
    .from("client_otps")
    .update({ used: true })
    .eq("id", otpId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function sendClientPortalOtp(
  email: string,
  businessName: string,
): Promise<void> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  await ensureClientAuthUser(normalizedEmail, businessName);

  const code = generateSixDigitCode();
  await storeClientOtp(normalizedEmail, code);
  await sendClientOtpEmail(normalizedEmail, code);

  console.log("[client-auth/client-otp] Sent custom OTP via Resend:", normalizedEmail);
}
