"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import {
  getWebmeDnsARecordIp,
  getWebmeSiteHost,
} from "@/lib/checkout/dns-targets";

import {
  CheckoutErrorState,
  CheckoutLoadingState,
  CheckoutPageShell,
  CheckoutPanel,
  PrimaryButton,
  SecondaryLink,
  confirmCheckoutDomainDns,
  useCheckoutOnboarding,
} from "../_components/checkout-flow";

const SITE_HOST = getWebmeSiteHost();
const A_RECORD_IP = getWebmeDnsARecordIp();

function DnsInstructionsContent() {
  const { slug, data, loading, error } = useCheckoutOnboarding();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && data && !data.domainRequested && slug) {
      router.replace(`/checkout/domain?slug=${encodeURIComponent(slug)}`);
    }
  }, [loading, data, slug, router]);

  if (loading) {
    return <CheckoutLoadingState />;
  }

  if (error || !data) {
    return <CheckoutErrorState message={error ?? "Site not found."} />;
  }

  if (!data.domainRequested) {
    return <CheckoutLoadingState />;
  }

  async function handleConfirm() {
    if (!slug) {
      return;
    }

    setConfirming(true);
    setConfirmError(null);

    try {
      await confirmCheckoutDomainDns(slug);
      router.push(`/checkout/confirmed?slug=${encodeURIComponent(slug)}`);
    } catch (confirmErr) {
      setConfirmError(
        confirmErr instanceof Error
          ? confirmErr.message
          : "Failed to confirm DNS update.",
      );
    } finally {
      setConfirming(false);
    }
  }

  return (
    <CheckoutPanel
      title="Point your domain to your site"
      subtitle={`Add these DNS records at your domain registrar for ${data.domainRequested}. Changes can take up to 24–48 hours to go live.`}
    >
      <div className="space-y-6">
        <p className="text-sm text-neutral-700">
          Point your domain to your site by adding these DNS records in your
          domain registrar:
        </p>

        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-neutral-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Host / Name</th>
                <th className="px-4 py-3 font-semibold">Value / Points to</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200 bg-white text-neutral-900">
              <tr>
                <td className="px-4 py-3 font-mono text-xs sm:text-sm">CNAME</td>
                <td className="px-4 py-3 font-mono text-xs sm:text-sm">www</td>
                <td className="break-all px-4 py-3 font-mono text-xs sm:text-sm">
                  {SITE_HOST}
                </td>
              </tr>
              {A_RECORD_IP ? (
                <tr>
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">A</td>
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">@</td>
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">
                    {A_RECORD_IP}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">
                    CNAME / ALIAS
                  </td>
                  <td className="px-4 py-3 font-mono text-xs sm:text-sm">@</td>
                  <td className="break-all px-4 py-3 font-mono text-xs sm:text-sm">
                    {SITE_HOST}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-700">
          <p className="font-semibold text-neutral-900">Step-by-step</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>
              Sign in to the registrar where you bought{" "}
              <strong>{data.domainRequested}</strong> (Namecheap, GoDaddy, etc.).
            </li>
            <li>Open DNS settings / Advanced DNS for that domain.</li>
            <li>
              Add a <strong>CNAME</strong> record for <code>www</code> pointing
              to <code>{SITE_HOST}</code>.
            </li>
            <li>
              {A_RECORD_IP ? (
                <>
                  Add an <strong>A</strong> record for <code>@</code> (root)
                  pointing to <code>{A_RECORD_IP}</code>.
                </>
              ) : (
                <>
                  For the root domain (<code>@</code>), add a{" "}
                  <strong>CNAME</strong>, <strong>ALIAS</strong>, or{" "}
                  <strong>ANAME</strong> pointing to <code>{SITE_HOST}</code> if
                  your registrar supports it. If not, contact us and we&apos;ll
                  help with an A record.
                </>
              )}
            </li>
            <li>
              Save your changes. Propagation usually takes a few minutes to a few
              hours (sometimes up to 48 hours).
            </li>
            <li>
              Click <strong>I&apos;ve updated my DNS</strong> below when you&apos;re
              done.
            </li>
          </ol>
        </div>

        {confirmError ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {confirmError}
          </p>
        ) : null}

        <PrimaryButton
          type="button"
          disabled={confirming}
          onClick={() => void handleConfirm()}
        >
          {confirming ? "Confirming…" : "I've updated my DNS"}
        </PrimaryButton>

        <SecondaryLink href="/checkout/existing-domain">
          Edit domain
        </SecondaryLink>
      </div>
    </CheckoutPanel>
  );
}

export default function CheckoutDnsPage() {
  return (
    <CheckoutPageShell>
      <DnsInstructionsContent />
    </CheckoutPageShell>
  );
}
