import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import pg from "pg";

const MIGRATION_PATH = resolve(
  process.cwd(),
  "supabase/migrations/20260607120000_outreach_open_tracking.sql",
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

  const password = process.env.SUPABASE_DB_PASSWORD?.trim();
  const ref = getProjectRef();

  if (password && ref) {
    return `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
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
  } finally {
    await client.end();
  }
}

async function runWithManagementApi(sql) {
  const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const ref = getProjectRef();

  if (!accessToken || !ref) {
    throw new Error(
      "No SUPABASE_ACCESS_TOKEN available for Management API migration.",
    );
  }

  const response = await fetch(
    `https://api.supabase.com/v1/projects/${ref}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query: sql }),
    },
  );

  if (!response.ok) {
    throw new Error(
      `Management API migration failed: ${response.status} ${await response.text()}`,
    );
  }
}

async function runViaDeployedApi() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.APP_URL?.trim() ||
    "https://webme-x6ed.onrender.com";

  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for deployed API migration.");
  }

  const response = await fetch(
    `${appUrl.replace(/\/$/, "")}/api/admin/migrate-outreach-tracking`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Deployed API migration failed: ${response.status} ${body}`);
  }

  console.log(body);
}

async function verifyMigration() {
  const { createClient } = await import("@supabase/supabase-js");
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const token = `verify-${Date.now()}`;
  const { data, error } = await supabase
    .from("outreach")
    .insert({
      lead_id: null,
      email_to: "migration-verify@example.com",
      subject: "verify",
      tracking_token: token,
      opened_at: null,
    })
    .select("id, tracking_token, opened_at")
    .maybeSingle();

  if (error) {
    throw new Error(`Verification failed: ${error.message}`);
  }

  await supabase.from("outreach").delete().eq("id", data.id);
  console.log("Verified tracking columns:", data);
}

async function main() {
  const sql = readFileSync(MIGRATION_PATH, "utf8");
  const errors = [];

  for (const [name, fn] of [
    ["postgres", () => runWithPg(sql)],
    ["management-api", () => runWithManagementApi(sql)],
    ["deployed-api", () => runViaDeployedApi()],
  ]) {
    try {
      console.log(`Trying migration via ${name}...`);
      await fn();
      console.log(`Migration applied via ${name}.`);
      await verifyMigration();
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.log(`${name} failed: ${message}`);
      errors.push(`${name}: ${message}`);
    }
  }

  throw new Error(`All migration methods failed:\n${errors.join("\n")}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
