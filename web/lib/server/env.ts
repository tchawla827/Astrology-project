import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

let rootEnvCache: Record<string, string> | null = null;

function parseEnvLine(line: string) {
  const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (!match) {
    return null;
  }

  const key = match[1];
  if (!key) {
    return null;
  }
  const rawValue = match[2] ?? "";
  const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");
  return { key, value };
}

function readRootEnv() {
  if (rootEnvCache) {
    return rootEnvCache;
  }

  rootEnvCache = {};
  const rootEnvPath = path.resolve(process.cwd(), "..", ".env");
  if (!existsSync(rootEnvPath)) {
    return rootEnvCache;
  }

  for (const line of readFileSync(rootEnvPath, "utf8").split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith("#")) {
      continue;
    }

    const parsed = parseEnvLine(line);
    if (parsed) {
      rootEnvCache[parsed.key] = parsed.value;
    }
  }

  return rootEnvCache;
}

export function serverEnv(name: string) {
  return process.env[name] || readRootEnv()[name] || "";
}
