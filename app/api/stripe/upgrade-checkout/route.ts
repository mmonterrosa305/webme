import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      error:
        "Plan upgrades are no longer available. WebMe now uses a single flat price.",
    },
    { status: 410 },
  );
}
