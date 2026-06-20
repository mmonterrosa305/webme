import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { NextResponse } from "next/server";
import pg from "pg";

const MIGRATION_SQL = readFileSync(
  resolve(
    process.cwd(),
    "supabase/migrations/20260608120000_create_video_presets_table.sql",
  ),
  "utf8",
);

function getDatabaseUrl(): string | null {
  return (
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    null
  );
}

function isAuthorized(request: Request): boolean {
  const expected = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const header = request.headers.get("authorization")?.trim();

  if (!expected || !header) {
    return false;
  }

  return header === `Bearer ${expected}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    return NextResponse.json(
      {
        error:
          "DATABASE_URL is not configured on this server. Add your Supabase Postgres connection string to the environment.",
      },
      { status: 500 },
    );
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    await client.query(MIGRATION_SQL);

    const { rows } = await client.query<{
      column_name: string;
    }>(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'video_presets'
       ORDER BY ordinal_position`,
    );

    return NextResponse.json({
      success: true,
      table: "video_presets",
      columns: rows.map((row) => row.column_name),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Migration failed.";

    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    await client.end();
  }
}
