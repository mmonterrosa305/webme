import { NextResponse } from "next/server";

import { deleteImageSequence, getImageSequenceById } from "@/lib/image-sequences/queries";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json({ error: "Sequence id is required." }, { status: 400 });
    }

    const sequence = await getImageSequenceById(id.trim());

    if (!sequence) {
      return NextResponse.json({ error: "Sequence not found." }, { status: 404 });
    }

    return NextResponse.json({
      id: sequence.id,
      industry: sequence.industry,
      label: sequence.label,
      frames_urls: sequence.frames_urls,
      thumbnail_url: sequence.thumbnail_url,
      frame_count: sequence.frame_count,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load image sequence.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id?.trim()) {
      return NextResponse.json({ error: "Sequence id is required." }, { status: 400 });
    }

    await deleteImageSequence(id.trim());

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to delete image sequence.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
