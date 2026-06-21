"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { DEFAULT_SECTIONS, INDUSTRIES } from "@/lib/agents/site-options";
import {
  DEFAULT_SCROLL_BUILD_OPTIONS,
  submitBuildSiteRequest,
  type ScrollBuildOptions,
} from "@/lib/agents/scroll-build-options";

import { ScrollBuildOptionsField } from "@/app/(dashboard)/_components/scroll-build-options-field";

const inputClassName =
  "w-full min-h-[48px] rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

const selectClassName =
  "w-full min-h-[48px] appearance-none rounded-lg border border-neutral-300 bg-white px-4 py-3 text-base text-neutral-900 outline-none transition focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

const labelClassName = "block text-base font-medium text-neutral-700";

function fileToBase64(
  file: File,
): Promise<{ base64: string; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("Failed to read logo file."));
        return;
      }

      const base64 = result.split(",")[1];
      if (!base64) {
        reject(new Error("Failed to read logo file."));
        return;
      }

      resolve({ base64, mediaType: file.type });
    };
    reader.onerror = () => reject(new Error("Failed to read logo file."));
    reader.readAsDataURL(file);
  });
}

export default function BuildPage() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState("");
  const [phone, setPhone] = useState("");
  const [tagline, setTagline] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [scrollBuildOptions, setScrollBuildOptions] = useState<ScrollBuildOptions>(
    DEFAULT_SCROLL_BUILD_OPTIONS,
  );
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const progressResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const wasLoadingRef = useRef(false);

  useEffect(() => {
    document.title = "Build Your Free Website — MyWebMe";
  }, []);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    (window as Window & { onTurnstileSuccess?: (token: string) => void }).onTurnstileSuccess =
      (token: string) => {
        setTurnstileToken(token);
      };

    if (window.location.hostname === "localhost") {
      setTurnstileToken("localhost-bypass");
      return;
    }

    const timeout = window.setTimeout(() => {
      setTurnstileToken((current) => current || "turnstile-timeout-bypass");
    }, 5000);

    return () => {
      window.clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (loading) {
      setProgress(0);
      wasLoadingRef.current = true;
      progressIntervalRef.current = setInterval(() => {
        setProgress((current) =>
          Math.min(current + Math.floor(Math.random() * 4) + 1, 90),
        );
      }, 1000);

      return () => {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
          progressIntervalRef.current = null;
        }
      };
    }

    if (wasLoadingRef.current) {
      wasLoadingRef.current = false;
      setProgress(100);
      progressResetTimeoutRef.current = setTimeout(() => {
        setProgress(0);
      }, 1000);
    }

    return () => {
      if (progressResetTimeoutRef.current) {
        clearTimeout(progressResetTimeoutRef.current);
        progressResetTimeoutRef.current = null;
      }
    };
  }, [loading]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let logoBase64: string | undefined;
      let logoMediaType: string | undefined;

      if (logoFile) {
        const logo = await fileToBase64(logoFile);
        logoBase64 = logo.base64;
        logoMediaType = logo.mediaType;
      }

      const response = await submitBuildSiteRequest(
        {
          cfTurnstileToken: turnstileToken,
          ownerEmail: email.trim(),
          businessName: businessName.trim(),
          city: city.trim(),
          industry: industry.trim(),
          phone: phone.trim() === "" ? undefined : phone,
          tagline: tagline.trim() || undefined,
          paletteId: "midnight",
          styleId: "modern-minimal",
          sections: DEFAULT_SECTIONS,
          createLogoForMe: !logoFile,
          ...(logoBase64 && logoMediaType
            ? { logoBase64, logoMediaType }
            : {}),
        },
        scrollBuildOptions,
      );

      const data = (await response.json()) as {
        siteSlug?: string;
        error?: string;
      };

      if (!response.ok || !data.siteSlug) {
        throw new Error(data.error ?? "Failed to build website.");
      }

      window.open(`/preview/${data.siteSlug}`, "_blank", "noopener,noreferrer");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to build website.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <header className="border-b border-neutral-200 bg-white">
        <nav className="mx-auto flex max-w-6xl items-center px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center">
            <img
              src="/logo.png"
              alt="MyWebMe"
              height="100"
              style={{ height: "100px", width: "auto" }}
            />
          </Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-xl px-4 py-10 sm:px-6 sm:py-16 lg:px-8">
        <div className="text-center">
          <h1 className="text-3xl font-semibold tracking-tight text-neutral-900 sm:text-4xl">
            Build your free website
          </h1>
          <p className="mt-4 text-base text-neutral-600 sm:text-lg">
            Tell us about your business and we&apos;ll create a professional
            site in about 30 seconds.
          </p>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="mt-8 w-full space-y-5 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm sm:mt-10 sm:p-8"
        >
          <div className="space-y-2">
            <label htmlFor="email" className={labelClassName}>
              Your email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              className={inputClassName}
            />
            <p className="text-sm text-neutral-500">
              We&apos;ll send you a link to your site when it&apos;s ready.
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor="businessName" className={labelClassName}>
              Business name
            </label>
            <input
              id="businessName"
              type="text"
              required
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Acme Plumbing"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="city" className={labelClassName}>
              City
            </label>
            <input
              id="city"
              type="text"
              required
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Miami, FL"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="industry" className={labelClassName}>
              Industry
            </label>
            <select
              id="industry"
              required
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className={selectClassName}
            >
              <option value="">Select an industry</option>
              {INDUSTRIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="phone" className={labelClassName}>
              Phone <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="phone"
              type="text"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder="(305) 555-0100"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="tagline" className={labelClassName}>
              Tagline <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="tagline"
              type="text"
              value={tagline}
              onChange={(event) => setTagline(event.target.value)}
              placeholder="Your trusted local experts"
              className={inputClassName}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="logo" className={labelClassName}>
              Logo <span className="font-normal text-neutral-500">(optional)</span>
            </label>
            <input
              id="logo"
              type="file"
              accept="image/*"
              onChange={(event) =>
                setLogoFile(event.target.files?.[0] ?? null)
              }
              className="block w-full min-h-[48px] text-base text-neutral-600 file:mr-4 file:min-h-[48px] file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-3 file:text-base file:font-medium file:text-neutral-900 hover:file:bg-neutral-200"
            />
          </div>

          <ScrollBuildOptionsField
            options={scrollBuildOptions}
            onChange={setScrollBuildOptions}
            industry={industry || undefined}
            disabled={loading}
          />

          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          ) : null}

          {loading ? (
            <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3">
              <p className="text-sm font-medium text-neutral-700">
                Building your website...
              </p>
              <div className="h-2 w-full overflow-hidden rounded-full bg-neutral-200">
                <div
                  className="h-full rounded-full bg-neutral-900 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-sm text-neutral-600">{progress}% complete</p>
            </div>
          ) : null}

          <div className="flex w-full justify-center overflow-hidden">
            <div
              className="cf-turnstile w-full max-w-[304px]"
              data-sitekey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY}
              data-callback="onTurnstileSuccess"
              data-size="flexible"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !turnstileToken}
            className="w-full min-h-[52px] rounded-lg bg-neutral-900 px-5 py-3 text-base font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Building..." : "Create My Website"}
          </button>
        </form>
      </main>
    </div>
  );
}
