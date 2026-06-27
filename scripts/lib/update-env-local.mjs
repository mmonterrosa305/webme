import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Upsert KEY=VALUE lines in .env.local (creates file if missing).
 */
export function updateEnvLocal(updates, cwd = process.cwd()) {
  const envPath = resolve(cwd, ".env.local");
  let content = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";

  if (content.length > 0 && !content.endsWith("\n")) {
    content += "\n";
  }

  for (const [key, value] of Object.entries(updates)) {
    const line = `${key}=${value}`;
    const pattern = new RegExp(`^${escapeRegExp(key)}=.*$`, "m");

    if (pattern.test(content)) {
      content = content.replace(pattern, line);
    } else {
      content += `${line}\n`;
    }
  }

  writeFileSync(envPath, content);

  return envPath;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
