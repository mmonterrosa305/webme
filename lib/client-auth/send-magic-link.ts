import { createResendClient, getResendFromEmail } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

import { getClientAuthCallbackUrl } from "./app-url";
import { buildPortalLoginEmail } from "./build-portal-login-email";
import { isPortalEligiblePlan } from "./constants";

export async function sendClientPortalMagicLink(
  email: string,
  businessName: string,
  options: { isWelcome?: boolean } = {},
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();

  console.log("[client-auth/send-magic-link] Starting send for:", normalizedEmail);

  if (!normalizedEmail) {
    throw new Error("Email is required.");
  }

  const supabase = createAdminClient();
  const redirectTo = getClientAuthCallbackUrl();

  console.log("[client-auth/send-magic-link] Auth callback URL:", redirectTo);
  console.log(
    "[client-auth/send-magic-link] Generating Supabase magic link for:",
    normalizedEmail,
  );

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: normalizedEmail,
    options: {
      redirectTo,
      data: {
        app_role: "client",
        business_name: businessName,
      },
    },
  });

  if (error) {
    console.error(
      "[client-auth/send-magic-link] Supabase generateLink error:",
      error.message,
    );
    throw new Error(`Failed to generate magic link: ${error.message}`);
  }

  const magicLink = data.properties?.action_link;

  console.log("[client-auth/send-magic-link] generateLink success:", {
    userId: data.user?.id ?? null,
    hasActionLink: Boolean(magicLink),
    actionLinkPrefix: magicLink ? `${magicLink.slice(0, 60)}…` : null,
    redirectTo,
  });

  if (!magicLink) {
    throw new Error("Failed to generate magic link: missing action link.");
  }

  const { subject, html, text } = buildPortalLoginEmail({
    businessName,
    magicLink,
    isWelcome: options.isWelcome ?? false,
  });

  const fromEmail = getResendFromEmail();
  console.log("[client-auth/send-magic-link] Sending via Resend:", {
    from: fromEmail,
    to: normalizedEmail,
    subject,
    hasApiKey: Boolean(process.env.RESEND_API_KEY?.trim()),
  });

  const resend = createResendClient();
  const sendResult = await resend.emails.send({
    from: fromEmail,
    to: normalizedEmail,
    subject,
    html,
    text,
  });

  if (sendResult.error) {
    console.error(
      "[client-auth/send-magic-link] Resend error:",
      sendResult.error,
    );
    throw new Error(sendResult.error.message);
  }

  console.log("[client-auth/send-magic-link] Resend success:", {
    id: sendResult.data?.id ?? null,
    to: normalizedEmail,
  });
}

export async function sendClientPortalMagicLinkIfEligible(
  email: string,
  businessName: string,
  plan: string,
): Promise<boolean> {
  console.log("[client-auth/send-magic-link] Eligibility check:", {
    email,
    plan,
    eligible: isPortalEligiblePlan(plan),
  });

  if (!isPortalEligiblePlan(plan)) {
    return false;
  }

  await sendClientPortalMagicLink(email, businessName, { isWelcome: true });
  return true;
}
