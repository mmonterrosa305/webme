import { migrateAllLeadHeroHtml } from "../lib/leads/migrate-normalize-hero-html";

async function main() {
  const result = await migrateAllLeadHeroHtml();
  console.log(JSON.stringify(result, null, 2));

  if (result.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
