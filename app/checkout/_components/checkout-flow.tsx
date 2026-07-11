"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { readJsonResponse } from "@/lib/api/fetch-json";

export type OnboardingData = {
  businessName: string;
  siteSlug: string;
  previewUrl: string;
  portalUrl: string;
  ownerEmail: string | null;
  isPaid: boolean;
  domainRequested: string | null;
  domainStatus: string | null;
};

function useCheckoutSlug(): string {
  const searchParams = useSearchParams();
  return searchParams.get("slug")?.trim() ?? "";
}

export function useCheckoutOnboarding() {
  const slug = useCheckoutSlug();
  const [data, setData] = useState<OnboardingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
      setLoading(false);
      setError("Missing site slug.");
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/checkout/onboarding?slug=${encodeURIComponent(slug)}`,
        );
        const payload = await readJsonResponse<
          OnboardingData & { error?: string }
        >(response);

        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to load checkout details.");
        }

        if (!cancelled) {
          setData(payload);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load checkout details.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [slug]);

  return { slug, data, loading, error };
}

export function CheckoutQueryLink({
  href,
  children,
  className,
}: {
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const slug = useCheckoutSlug();
  const url = slug ? `${href}?slug=${encodeURIComponent(slug)}` : href;

  return (
    <Link href={url} className={className}>
      {children}
    </Link>
  );
}

export function CheckoutPanel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-neutral-900 sm:text-3xl">
        {title}
      </h1>
      {subtitle ? (
        <p className="mt-3 text-sm leading-relaxed text-neutral-600 sm:text-base">
          {subtitle}
        </p>
      ) : null}
      <div className="mt-8">{children}</div>
    </div>
  );
}

const primaryButtonClassName =
  "inline-flex w-full items-center justify-center rounded-lg bg-neutral-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60";

const secondaryButtonClassName =
  "inline-flex w-full items-center justify-center rounded-lg border border-neutral-300 bg-white px-5 py-3 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50";

export function PrimaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <CheckoutQueryLink href={href} className={primaryButtonClassName}>
      {children}
    </CheckoutQueryLink>
  );
}

export function SecondaryLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <CheckoutQueryLink href={href} className={secondaryButtonClassName}>
      {children}
    </CheckoutQueryLink>
  );
}

export function PrimaryButton({
  children,
  onClick,
  disabled,
  type = "button",
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={primaryButtonClassName}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  href,
}: {
  children: React.ReactNode;
  href: string;
}) {
  return <SecondaryLink href={href}>{children}</SecondaryLink>;
}

export function ExternalPrimaryLink({
  href,
  children,
  target,
  rel,
}: {
  href: string;
  children: React.ReactNode;
  target?: string;
  rel?: string;
}) {
  return (
    <a href={href} target={target} rel={rel} className={primaryButtonClassName}>
      {children}
    </a>
  );
}

export function CheckoutLoadingState() {
  return (
    <CheckoutPanel title="Loading…" subtitle="Setting up your onboarding.">
      <p className="text-sm text-neutral-500">One moment please.</p>
    </CheckoutPanel>
  );
}

export function CheckoutErrorState({ message }: { message: string }) {
  return (
    <CheckoutPanel title="Something went wrong" subtitle={message}>
      <Link
        href="/"
        className="inline-flex text-sm font-medium text-neutral-900 underline"
      >
        Return to MyWebMe
      </Link>
    </CheckoutPanel>
  );
}

export function CheckoutPageShell({
  children,
}: {
  children: React.ReactNode;
}) {
  return <Suspense fallback={<CheckoutLoadingState />}>{children}</Suspense>;
}

export function useCheckoutRouter() {
  const router = useRouter();
  const slug = useCheckoutSlug();

  return {
    push(path: string) {
      const url = slug ? `${path}?slug=${encodeURIComponent(slug)}` : path;
      router.push(url);
    },
    slug,
  };
}

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

export function CheckoutInput({
  id,
  value,
  onChange,
  placeholder,
  disabled,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      id={id}
      type="text"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className={inputClassName}
    />
  );
}

export async function submitCheckoutDomain(
  slug: string,
  domain: string,
): Promise<void> {
  const response = await fetch("/api/checkout/domain", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, domain }),
  });

  const data = await readJsonResponse<{ error?: string }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to save domain.");
  }
}

export async function confirmCheckoutDomainDns(slug: string): Promise<void> {
  const response = await fetch("/api/checkout/domain/confirm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });

  const data = await readJsonResponse<{ error?: string }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to confirm DNS update.");
  }
}

export async function sendCheckoutWelcome(slug: string): Promise<void> {
  const response = await fetch("/api/checkout/welcome", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  });

  const data = await readJsonResponse<{ error?: string }>(response);

  if (!response.ok) {
    throw new Error(data.error ?? "Failed to send welcome email.");
  }
}
