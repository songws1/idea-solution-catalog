import fs from "node:fs";
import path from "node:path";

/**
 * Load .env.local / .env for scripts run through tsx.
 *
 * Next.js does this for the app; tsx does not, so every script that needs a key
 * or a model name has to ask for it. This started life inside scripts/enrich.ts
 * and moved here the first time a second script needed it (v4.17), because the
 * alternative was a script that reports "OPENROUTER_API_KEY is not set" to
 * someone looking at the key sitting in their .env.local.
 *
 * UTF-16 handling is not hypothetical: PowerShell's `>` redirect writes UTF-16,
 * so a .env.local created on Windows that way is unreadable as UTF-8.
 *
 * Existing environment variables always win, so a value set for one command
 * (`$env:OPENROUTER_API_KEY="..."`) overrides the file rather than fighting it.
 */
function readEnvFileText(file: string): string {
  const buf = fs.readFileSync(file);
  if (buf.length >= 2 && buf[0] === 0xff && buf[1] === 0xfe) return buf.toString("utf16le");
  if (buf.length >= 2 && buf[0] === 0xfe && buf[1] === 0xff) {
    const swapped = Buffer.from(buf);
    swapped.swap16();
    return swapped.toString("utf16le");
  }
  return buf.toString("utf8").replace(/^﻿/, "");
}

export function loadEnvLocal(): void {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(process.cwd(), name);
    if (!fs.existsSync(file)) continue;
    for (const line of readEnvFileText(file).split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let value = m[2].trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(m[1] in process.env)) process.env[m[1]] = value;
    }
  }
}
