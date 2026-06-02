import { NextResponse } from "next/server";
import type Stripe from "stripe";

import { getStripe, getStripeWebhookSecrets } from "@/lib/stripe";
import {
  handleCheckoutSessionCompleted,
  handleInvoicePaymentFailed,
} from "@/lib/stripe/webhook-handlers";

export const runtime = "nodejs";

function maskWebhookSecret(secret: string): string {
  if (secret.length <= 12) {
    return "[redacted]";
  }

  return `${secret.slice(0, 8)}…${secret.slice(-4)}`;
}

function constructVerifiedEvent(
  rawBody: string,
  signature: string,
  secrets: string[],
): { event: Stripe.Event; matchedSecret: string } {
  const errors: string[] = [];

  for (const secret of secrets) {
    try {
      const event = getStripe().webhooks.constructEvent(
        rawBody,
        signature,
        secret,
      );

      return { event, matchedSecret: secret };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown verification error.";

      errors.push(`${maskWebhookSecret(secret)}: ${message}`);
    }
  }

  throw new Error(
    `Webhook signature verification failed for all configured secrets.\n${errors.join("\n")}`,
  );
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type");
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  console.log("[stripe/webhook] Incoming request", {
    contentType,
    bodyLength: rawBody.length,
    hasSignature: Boolean(signature),
    signaturePreview: signature ? `${signature.slice(0, 24)}…` : null,
  });

  if (!signature) {
    console.error("[stripe/webhook] Rejected: missing stripe-signature header", {
      contentType,
      bodyLength: rawBody.length,
    });

    return NextResponse.json(
      { error: "Missing stripe-signature header." },
      { status: 400 },
    );
  }

  let webhookSecrets: string[];

  try {
    webhookSecrets = getStripeWebhookSecrets();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Missing webhook secret.";

    console.error("[stripe/webhook] Configuration error:", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }

  console.log("[stripe/webhook] Verifying signature", {
    configuredSecrets: webhookSecrets.map(maskWebhookSecret),
    bodyLength: rawBody.length,
  });

  let event: Stripe.Event;
  let matchedSecret: string;

  try {
    ({ event, matchedSecret } = constructVerifiedEvent(
      rawBody,
      signature,
      webhookSecrets,
    ));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Invalid webhook signature.";

    console.error("[stripe/webhook] Signature verification failed:", message);
    console.error("[stripe/webhook] Debug context", {
      bodyLength: rawBody.length,
      bodyPreview: rawBody.slice(0, 120),
      configuredSecrets: webhookSecrets.map(maskWebhookSecret),
      hint:
        "If using `stripe listen`, add its whsec_ value to STRIPE_WEBHOOK_SECRET (comma-separated). Dashboard endpoints use a different secret.",
    });

    return NextResponse.json({ error: message }, { status: 400 });
  }

  console.log("[stripe/webhook] Signature verified", {
    eventId: event.id,
    eventType: event.type,
    matchedSecret: maskWebhookSecret(matchedSecret),
  });

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log("[stripe/webhook] Ignoring unhandled event type", {
          eventId: event.id,
          eventType: event.type,
        });
        break;
    }
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Webhook handler failed.";

    console.error(`[stripe/webhook] Handler failed for ${event.type}`, {
      eventId: event.id,
      message,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }

  console.log("[stripe/webhook] Event processed successfully", {
    eventId: event.id,
    eventType: event.type,
  });

  return NextResponse.json({ received: true });
}
