import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const lead = await getLeadBySlug(slug);

  if (!lead?.site_html) {
    return new NextResponse("Site not found", { status: 404 });
  }

  return new NextResponse(lead.site_html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
