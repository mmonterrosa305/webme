import { NextResponse } from "next/server";

import { deleteVideoPreset } from "@/lib/video-presets/queries";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Preset id is required." },
        { status: 400 },
      );
    }

    await deleteVideoPreset(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete video preset.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
