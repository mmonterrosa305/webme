import { NextResponse } from "next/server";

import { createClientPortalSession } from "@/lib/client-auth/create-client-session";
import { markClientOtpUsed, verifyClientOtp } from "@/lib/client-auth/client-otp";
import { isPortalEligiblePlan } from "@/lib/client-auth/constants";
import { getClientByEmail } from "@/lib/client-auth/get-client-by-email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and sign-in code are required." },
        { status: 400 },
      );
    }

    const client = await getClientByEmail(email);

    if (!client || !isPortalEligiblePlan(client.package)) {
      return NextResponse.json(
        { error: "Invalid or expired code." },
        { status: 401 },
      );
    }

    const otpRecord = await verifyClientOtp(client.owner_email, code);

    const response = await createClientPortalSession(
      client.owner_email,
      client.business_name,
    );

    await markClientOtpUsed(otpRecord.id);

    return response;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to verify sign-in code.";

    console.error("[client/auth/verify-otp]", message);

    return NextResponse.json({ error: message }, { status: 401 });
  }
}
