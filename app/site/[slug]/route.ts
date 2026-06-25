import { prepareAndPersistLeadSiteHtml } from "@/lib/agents/prepare-lead-site-html";
import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { NextResponse } from "next/server";

const ANALYTICS_SCRIPT = `<script>
  const slug = window.location.pathname.split('/')[2];
  
  function track(event_type) {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ site_slug: slug, event_type })
    });
  }

  // Track page view
  track('page_view');

  // Track contact form submission
  document.addEventListener('submit', function(e) {
    track('form_submit');
  });
</script>`;

function injectAnalyticsScript(html: string): string {
  const closingBodyIndex = html.toLowerCase().lastIndexOf("</body>");

  if (closingBodyIndex === -1) {
    return `${html}\n${ANALYTICS_SCRIPT}`;
  }

  return `${html.slice(0, closingBodyIndex)}${ANALYTICS_SCRIPT}\n${html.slice(closingBodyIndex)}`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const lead = await getLeadBySlug(slug);

  if (!lead?.site_html) {
    return new NextResponse("Site not found", { status: 404 });
  }

  const html = await prepareAndPersistLeadSiteHtml(
    slug,
    lead.site_html,
    lead.site_metadata,
    lead.industry,
  );

  return new NextResponse(injectAnalyticsScript(html), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
