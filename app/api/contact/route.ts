import { NextResponse } from "next/server";
import { Resend } from "resend";

function getResendApiKey(): string {
  const key = process.env.RESEND_API_KEY?.trim();

  if (!key || key.startsWith("your_")) {
    throw new Error("Missing RESEND_API_KEY environment variable.");
  }

  return key;
}

function getFromEmail(): string {
  const email = process.env.RESEND_FROM_EMAIL?.trim();

  if (!email) {
    throw new Error("Missing RESEND_FROM_EMAIL environment variable.");
  }

  return email;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const ownerEmail =
      typeof body.ownerEmail === "string" ? body.ownerEmail.trim() : "";

    if (!name || !email || !phone || !message || !ownerEmail) {
      return NextResponse.json(
        {
          error:
            "name, email, phone, message, and ownerEmail are all required.",
        },
        { status: 400 },
      );
    }

    const resend = new Resend(getResendApiKey());
    const from = getFromEmail();

    const escapedName = escapeHtml(name);
    const escapedEmail = escapeHtml(email);
    const escapedPhone = escapeHtml(phone);
    const escapedMessage = escapeHtml(message).replaceAll("\n", "<br />");

    await resend.emails.send({
      from,
      to: ownerEmail,
      replyTo: email,
      subject: `New message from your website - ${name}`,
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717;">
          <h1 style="font-size: 24px; margin-bottom: 12px;">New website inquiry</h1>
          <p style="margin: 0 0 20px;">You received a new message from your website contact form.</p>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
            <tr>
              <td style="padding: 10px 0; font-weight: 600; width: 120px;">Name</td>
              <td style="padding: 10px 0;">${escapedName}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: 600;">Email</td>
              <td style="padding: 10px 0;">${escapedEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: 600;">Phone</td>
              <td style="padding: 10px 0;">${escapedPhone}</td>
            </tr>
          </table>
          <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; background: #fafafa;">
            <p style="margin: 0 0 8px; font-weight: 600;">Message</p>
            <p style="margin: 0; line-height: 1.6;">${escapedMessage}</p>
          </div>
        </div>
      `,
      text: `New website inquiry\n\nName: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nMessage:\n${message}`,
    });

    await resend.emails.send({
      from,
      to: email,
      subject: "We received your message",
      html: `
        <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717;">
          <h1 style="font-size: 24px; margin-bottom: 12px;">Thanks for reaching out, ${escapedName}.</h1>
          <p style="margin: 0 0 16px; line-height: 1.6;">
            Your message was received successfully. Someone from the business will get back to you soon.
          </p>
          <div style="border: 1px solid #e5e5e5; border-radius: 12px; padding: 16px; background: #fafafa;">
            <p style="margin: 0 0 8px; font-weight: 600;">Your message</p>
            <p style="margin: 0; line-height: 1.6;">${escapedMessage}</p>
          </div>
        </div>
      `,
      text: `Thanks for reaching out, ${name}.\n\nYour message was received successfully. Someone from the business will get back to you soon.\n\nYour message:\n${message}`,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send contact email.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
