"use client";

import slugify from "slugify";
import { useRef, useState } from "react";

import {
  COLOR_PALETTES,
  DEFAULT_SECTIONS,
  DESIGN_STYLES,
  INDUSTRIES,
  SITE_SECTIONS,
  type PaletteId,
  type SectionId,
  type StyleId,
} from "@/lib/agents/site-options";
import {
  DEFAULT_SCROLL_BUILD_OPTIONS,
  submitBuildSiteRequest,
  type ScrollBuildOptions,
} from "@/lib/agents/scroll-build-options";
import {
  DEFAULT_SITE_BUILD_PRICE_USD,
  type SiteBuildPriceUsd,
} from "@/lib/plans/build-price";
import { ScrollBuildOptionsField } from "../_components/scroll-build-options-field";
import { SiteBuildPriceSelector } from "../_components/site-build-price-selector";

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

const ACCEPTED_LOGO_TYPES = [
  "image/png",
  "image/jpeg",
  "image/svg+xml",
] as const;

async function readLogoFile(
  file: File,
): Promise<
  | { logoBase64: string; logoMediaType: "image/png" | "image/jpeg" }
  | { logoSvg: string }
> {
  if (file.type === "image/svg+xml") {
    return { logoSvg: await file.text() };
  }

  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }

  const logoMediaType =
    file.type === "image/png" ? "image/png" : "image/jpeg";

  return {
    logoBase64: btoa(binary),
    logoMediaType,
  };
}

export function WebDesignAgentForm() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [tagline, setTagline] = useState("");
  const [paletteId, setPaletteId] = useState<PaletteId>("midnight");
  const [styleId, setStyleId] = useState<StyleId>("modern-minimal");
  const [sections, setSections] = useState<SectionId[]>(DEFAULT_SECTIONS);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [createLogoForMe, setCreateLogoForMe] = useState(false);
  const [scrollBuildOptions, setScrollBuildOptions] = useState<ScrollBuildOptions>(
    DEFAULT_SCROLL_BUILD_OPTIONS,
  );
  const [buildPriceUsd, setBuildPriceUsd] = useState<SiteBuildPriceUsd>(
    DEFAULT_SITE_BUILD_PRICE_USD,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [html, setHtml] = useState<string | null>(null);
  const [siteSlug, setSiteSlug] = useState<string | null>(null);

  function toggleSection(sectionId: SectionId) {
    setSections((current) =>
      current.includes(sectionId)
        ? current.filter((id) => id !== sectionId)
        : [...current, sectionId],
    );
  }

  function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (file) {
      setLogoFile(file);
      setCreateLogoForMe(false);
    } else {
      setLogoFile(null);
    }
  }

  function handleCreateLogoChange(checked: boolean) {
    setCreateLogoForMe(checked);

    if (checked) {
      setLogoFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    setHtml(null);
    setSiteSlug(null);

    if (sections.length === 0) {
      setError("Select at least one section.");
      setLoading(false);
      return;
    }

    try {
      let logoPayload: Record<string, string> = {};

      if (logoFile && !createLogoForMe) {
        logoPayload = await readLogoFile(logoFile);
      }

      const payload = {
        businessName,
        city,
        industry,
        tagline: tagline.trim() || undefined,
        paletteId,
        styleId,
        sections,
        createLogoForMe,
        saveAsProject: true,
        buildPriceUsd,
        ...logoPayload,
      };

      const response = await submitBuildSiteRequest(payload, scrollBuildOptions);

      const data = (await response.json()) as {
        html?: string;
        siteSlug?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to build website.");
      }

      if (!data.html) {
        throw new Error("No HTML returned from the agent.");
      }

      setHtml(data.html);
      setSiteSlug(data.siteSlug?.trim() || null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to build website.",
      );
    } finally {
      setLoading(false);
    }
  }

  function handleDownload() {
    if (!html) {
      return;
    }

    const filename = `${slugify(businessName || "website", { lower: true, strict: true })}.html`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-900">
            Web Design Agent
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Configure brand, style, and sections — then generate a custom
            single-page site.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-10">
          {/* Basics */}
          <fieldset className="space-y-5">
            <legend className="text-sm font-semibold text-neutral-900">
              Business details
            </legend>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="businessName"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Business Name
                </label>
                <input
                  id="businessName"
                  type="text"
                  required
                  value={businessName}
                  onChange={(event) => setBusinessName(event.target.value)}
                  placeholder="Riverside Dental"
                  className={inputClassName}
                  disabled={loading}
                />
              </div>
              <div>
                <label
                  htmlFor="city"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  City
                </label>
                <input
                  id="city"
                  type="text"
                  required
                  value={city}
                  onChange={(event) => setCity(event.target.value)}
                  placeholder="Austin"
                  className={inputClassName}
                  disabled={loading}
                />
              </div>
              <div>
                <label
                  htmlFor="industry"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Industry
                </label>
                <select
                  id="industry"
                  required
                  value={industry}
                  onChange={(event) => setIndustry(event.target.value)}
                  className={inputClassName}
                  disabled={loading}
                >
                  {INDUSTRIES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="tagline"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Tagline / Description{" "}
                  <span className="font-normal text-neutral-400">
                    (optional)
                  </span>
                </label>
                <textarea
                  id="tagline"
                  rows={3}
                  value={tagline}
                  onChange={(event) => setTagline(event.target.value)}
                  placeholder="Family-owned practice serving Austin since 1998. Gentle care, modern technology."
                  className={inputClassName}
                  disabled={loading}
                />
              </div>
            </div>
          </fieldset>

          {/* Logo */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-neutral-900">
              Logo
            </legend>
            <div>
              <label
                htmlFor="logo"
                className="mb-2 block text-sm font-medium text-neutral-700"
              >
                Upload logo{" "}
                <span className="font-normal text-neutral-400">
                  (PNG, JPG, SVG — optional)
                </span>
              </label>
              <input
                ref={fileInputRef}
                id="logo"
                type="file"
                accept={ACCEPTED_LOGO_TYPES.join(",")}
                onChange={handleLogoChange}
                disabled={loading || createLogoForMe}
                className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-4 file:py-2 file:text-sm file:font-medium file:text-neutral-900 hover:file:bg-neutral-200 disabled:opacity-50"
              />
              {logoFile ? (
                <p className="mt-2 text-xs text-neutral-500">
                  Selected: {logoFile.name}
                </p>
              ) : null}
            </div>
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={createLogoForMe}
                onChange={(event) =>
                  handleCreateLogoChange(event.target.checked)
                }
                disabled={loading}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span className="text-sm text-neutral-700">
                Create a logo for me
              </span>
            </label>
          </fieldset>

          {/* Color palette */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-neutral-900">
              Color palette
            </legend>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {COLOR_PALETTES.map((palette) => {
                const selected = paletteId === palette.id;

                return (
                  <button
                    key={palette.id}
                    type="button"
                    onClick={() => setPaletteId(palette.id)}
                    disabled={loading}
                    className={`rounded-xl border p-3 text-left transition ${
                      selected
                        ? "border-neutral-900 ring-2 ring-neutral-900 ring-offset-2"
                        : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <div className="mb-2 flex gap-1">
                      <span
                        className="h-8 flex-1 rounded-md"
                        style={{ backgroundColor: palette.primary }}
                      />
                      <span
                        className="h-8 flex-1 rounded-md border border-neutral-200"
                        style={{ backgroundColor: palette.secondary }}
                      />
                      <span
                        className="h-8 w-8 shrink-0 rounded-md border border-neutral-200"
                        style={{ backgroundColor: palette.accent }}
                      />
                    </div>
                    <p className="text-sm font-medium text-neutral-900">
                      {palette.name}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {palette.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Style */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-neutral-900">
              Style
            </legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {DESIGN_STYLES.map((style) => {
                const selected = styleId === style.id;

                return (
                  <button
                    key={style.id}
                    type="button"
                    onClick={() => setStyleId(style.id)}
                    disabled={loading}
                    className={`rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-neutral-900 bg-neutral-50 ring-2 ring-neutral-900 ring-offset-2"
                        : "border-neutral-200 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <p className="text-sm font-semibold text-neutral-900">
                      {style.label}
                    </p>
                    <p className="mt-1 text-xs text-neutral-600">
                      {style.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </fieldset>

          {/* Sections */}
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold text-neutral-900">
              Sections
            </legend>
            <div className="flex flex-wrap gap-3">
              {SITE_SECTIONS.map((section) => {
                const checked = sections.includes(section.id);

                return (
                  <label
                    key={section.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition ${
                      checked
                        ? "border-neutral-900 bg-neutral-900 text-white"
                        : "border-neutral-300 bg-white text-neutral-700 hover:border-neutral-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSection(section.id)}
                      disabled={loading}
                      className="sr-only"
                    />
                    {section.label}
                  </label>
                );
              })}
            </div>
          </fieldset>

          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}

          <div className="flex flex-wrap items-end gap-4">
            <SiteBuildPriceSelector
              value={buildPriceUsd}
              onChange={setBuildPriceUsd}
              disabled={loading}
            />
            <ScrollBuildOptionsField
              options={scrollBuildOptions}
              onChange={setScrollBuildOptions}
              industry={industry}
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Generating website…" : "Build Website"}
            </button>
          </div>
        </form>

        {loading ? (
          <div
            className="mt-8 flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-6"
            role="status"
            aria-live="polite"
          >
            <span
              className="h-5 w-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
              aria-hidden
            />
            <p className="text-sm text-neutral-600">
              Claude is building your website with your palette, style, and
              sections. This may take a minute…
            </p>
          </div>
        ) : null}
      </section>

      {html ? (
        <section className="rounded-xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 px-5 py-4">
            <div>
              <h2 className="text-base font-semibold text-neutral-900">
                Preview
              </h2>
              <p className="mt-0.5 text-xs text-neutral-500">
                {businessName} — {city}
                {siteSlug ? " · Saved to Projects" : null}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {siteSlug ? (
                <a
                  href={`/preview/${siteSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-800"
                >
                  Open Preview
                </a>
              ) : null}
              <button
                type="button"
                onClick={handleDownload}
                className="rounded-lg border border-neutral-300 bg-white px-4 py-2 text-sm font-medium text-neutral-900 transition hover:border-neutral-900 hover:bg-neutral-50"
              >
                Download HTML
              </button>
            </div>
          </div>
          <div className="p-4">
            <iframe
              title={`Preview of ${businessName}`}
              srcDoc={html}
              sandbox="allow-same-origin"
              className="h-[min(720px,70vh)] w-full rounded-lg border border-neutral-200 bg-white"
            />
          </div>
        </section>
      ) : null}
    </div>
  );
}
