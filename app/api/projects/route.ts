import { NextResponse } from "next/server";

import type { Project, ProjectListItem } from "@/lib/projects/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id")?.trim();
    const supabase = createAdminClient();

    if (id) {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, business_name, city, industry, site_slug, site_built_at, created_at, site_html, site_metadata",
        )
        .eq("id", id)
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        return NextResponse.json({ error: "Project not found." }, { status: 404 });
      }

      return NextResponse.json({ project: data as Project });
    }

    const { data, error } = await supabase
      .from("projects")
      .select(
        "id, business_name, city, industry, site_slug, site_built_at, created_at",
      )
      .order("site_built_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      projects: (data ?? []) as ProjectListItem[],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load projects.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("projects").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to remove project.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
