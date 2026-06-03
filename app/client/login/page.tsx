"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

function ClientLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const authError = searchParams.get("error");

  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    authError === "auth"
      ? "Your sign-in session expired. Request a new code below."
      : null,
  );

  async function handleEmailSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/client/auth/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send sign-in code.");
      }

      setStep("otp");
      setOtp("");
      setMessage(
        data.message ??
          "If your email is registered on a Pro or Elite plan, we sent you a 6-digit code.",
      );
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to send sign-in code.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleOtpSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const code = otp.replace(/\D/g, "");

    if (code.length !== 6) {
      setError("Enter the 6-digit code from your email.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/client/auth/verify-otp", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });

      const data = (await response.json()) as {
        redirectTo?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Invalid or expired code.");
      }

      router.push(data.redirectTo ?? "/client/dashboard");
      router.refresh();
    } catch (verifyError) {
      setError(
        verifyError instanceof Error
          ? verifyError.message
          : "Invalid or expired code. Try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleChangeEmail() {
    setStep("email");
    setOtp("");
    setMessage(null);
    setError(null);
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="text-lg font-medium text-neutral-900">
            mywebme
          </Link>
          <h1 className="mt-6 text-3xl font-semibold tracking-tight text-neutral-900">
            Client portal
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            Pro and Elite clients sign in with a 6-digit code sent to their
            email.
          </p>
        </div>

        {step === "email" ? (
          <form
            onSubmit={handleEmailSubmit}
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <label
              htmlFor="email"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              Email address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@yourbusiness.com"
              className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
              disabled={loading}
            />

            {error ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Sending code…" : "Email me a sign-in code"}
            </button>
          </form>
        ) : (
          <form
            onSubmit={handleOtpSubmit}
            className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
          >
            <p className="text-sm text-neutral-600">
              We sent a 6-digit code to{" "}
              <span className="font-medium text-neutral-900">{email}</span>
            </p>

            {message ? (
              <p className="mt-3 text-sm text-neutral-700" role="status">
                {message}
              </p>
            ) : null}

            <label
              htmlFor="otp"
              className="mb-2 mt-5 block text-sm font-medium text-neutral-700"
            >
              Sign-in code
            </label>
            <input
              id="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              pattern="[0-9]{6}"
              value={otp}
              onChange={(event) =>
                setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-center font-mono text-lg tracking-[0.3em] text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200"
              disabled={loading}
            />

            {error ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading || otp.length !== 6}
              className="mt-6 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Sign in"}
            </button>

            <button
              type="button"
              onClick={handleChangeEmail}
              disabled={loading}
              className="mt-3 w-full text-sm font-medium text-neutral-600 transition hover:text-neutral-900 disabled:opacity-60"
            >
              Use a different email
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ClientLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-full items-center justify-center px-4 py-12 text-sm text-neutral-500">
          Loading…
        </div>
      }
    >
      <ClientLoginForm />
    </Suspense>
  );
}
