export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { runHeroHtmlMigrationOnStartup } = await import(
    "@/lib/leads/migrate-normalize-hero-html"
  );

  const migration = runHeroHtmlMigrationOnStartup();
  if (migration) {
    await migration;
  }
}
