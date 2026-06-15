import { readFileSync } from 'node:fs';

export type ModuleConfig = {
  /** '*' loads all discovered modules; an array restricts to listed module names */
  modules: '*' | string[];
};

const DEFAULT_CONFIG: ModuleConfig = { modules: '*' };

export function loadConfig(configPath: string): ModuleConfig {
  try {
    const raw = readFileSync(configPath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    return validateConfig(parsed);
  } catch {
    console.warn(`Config not found or invalid at ${configPath}, using defaults`);
    return DEFAULT_CONFIG;
  }
}

function validateConfig(raw: unknown): ModuleConfig {
  if (typeof raw !== 'object' || raw === null) return DEFAULT_CONFIG;

  const obj = raw as Record<string, unknown>;
  const modules = obj['modules'];

  if (modules === '*') return { modules: '*' };

  if (Array.isArray(modules) && modules.every((m) => typeof m === 'string')) {
    return { modules: modules as string[] };
  }

  return DEFAULT_CONFIG;
}
