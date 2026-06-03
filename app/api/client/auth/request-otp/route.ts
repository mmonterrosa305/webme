import { NextResponse } from "next/server";

import { isPortalEligiblePlan } from "@/lib/client-auth/constants";
import { getClientByEmail } from "@/lib/client-auth/get-client-by-email";
import { sendClientPortalOtp } from "@/lib/client-auth/send-client-otp";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";

    if (!email) {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const client = await getClientByEmail(email);

    if (client && isPortalEligiblePlan(client.package)) {
      await sendClientPortalOtp(client.owner_email, client.business_name);
    }

    return NextResponse.json({
      success: true,
      message:
        "If your email is registered on a Pro or Elite plan, we sent you a 6-digit sign-in code.",
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send sign-in code.";

    console.error("[client/auth/request-otp]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
