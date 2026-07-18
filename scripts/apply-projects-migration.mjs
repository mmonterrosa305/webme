import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "supabase/migrations/20260718000000_create_projects_table.sql",
);

function getProjectRef() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
  const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
  return match?.[1] ?? null;
}

function getDatabaseUrl() {
  const direct =
    process.env.DATABASE_URL?.trim() ||
    process.env.SUPABASE_DB_URL?.trim() ||
    process.env.POSTGRES_URL?.trim();

  if (direct) {
    return direct;
  }

  const dbPassword =
    process.env.SUPABASE_DB_PASSWORD?.trim() ||
    process.env.DASHBOARD_PASSWORD?.trim();
  const ref = getProjectRef();

  if (dbPassword && ref) {
    return `postgresql://postgres:${encodeURIComponent(dbPassword)}@db.${ref}.supabase.co:5432/postgres`;
  }

  return null;
}

async function runWithPg(sql) {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error(
      "No database connection available. Set DATABASE_URL or SUPABASE_DB_PASSWORD.",
    );
  }

  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    await client.query("NOTIFY pgrst, 'reload schema'");
  } finally {
    await client.end();
  }
}

async function verifyTable() {
  const { createClient } = await import("@supabase/supabase-js");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  }

  // Give PostgREST a moment after schema reload.
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const supabase = createClient(url, key);
  const { error } = await supabase.from("projects").select("id").limit(1);

  if (error) {
    throw new Error(`Verification failed: ${error.message}`);
  }

  console.log("Verified projects table exists.");
}

async function main() {
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  console.log("Applying projects migration...");
  await runWithPg(sql);
  await verifyTable();
  console.log("Done.");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
