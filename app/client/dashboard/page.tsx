import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isPortalEligiblePlan } from "@/lib/client-auth/constants";
import { getClientByEmail } from "@/lib/client-auth/get-client-by-email";
import { getClientSiteData } from "@/lib/site-editor/get-client-site";
import { createClient } from "@/lib/supabase/server";

import { SiteEditor } from "./site-editor";

export const metadata: Metadata = {
  title: "Client Dashboard — MyWebMe",
};

export default async function ClientDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/client/login");
  }

  const client = await getClientByEmail(user.email);

  if (!client || !isPortalEligiblePlan(client.package)) {
    redirect("/client/login?error=auth");
  }

  const siteData = await getClientSiteData(client);

  if (!siteData) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm">
          <h1 className="text-2xl font-semibold text-neutral-900">
            Your site is being prepared
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            We couldn&apos;t find a website linked to your account yet. If you
            just signed up, give us a few minutes — otherwise email{" "}
            <a
              href="mailto:sites@mywebme.com"
              className="font-medium text-neutral-900 underline"
            >
              sites@mywebme.com
            </a>
            .
          </p>
          <Link
            href="/"
            className="mt-6 inline-block text-sm font-medium text-neutral-600 hover:text-neutral-900"
          >
            Back to mywebme.com
          </Link>
        </div>
      </main>
    );
  }

  return (
    <SiteEditor
      initialContent={siteData.content}
      siteSlug={siteData.siteSlug}
      plan={siteData.plan}
      subscriptionStatus={siteData.subscriptionStatus}
      previewUrl={`/preview/${siteData.siteSlug}`}
    />
  );
}
