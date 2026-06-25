import { NextResponse } from "next/server";

import { deleteImageSequence } from "@/lib/image-sequences/queries";

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
