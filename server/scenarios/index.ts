import { readdirSync } from 'node:fs';
import type { Scenario } from './scenario.ts';

/** Files in this folder that aren't scenarios. */
const NOT_SCENARIOS = new Set(['index.ts', 'scenario.ts']);

/**
 * Every scenario in this folder, so adding a file is all it takes to add one. Each scenario file
 * exports exactly one `Scenario`. They're in filename order, which sets their template IDs when
 * `npm run db:reset` seeds them.
 */
export const scenarios: Scenario[] = await loadScenarios();

async function loadScenarios(): Promise<Scenario[]> {
  const files = readdirSync(import.meta.dirname)
    .filter((file) => file.endsWith('.ts') && !NOT_SCENARIOS.has(file))
    .sort();
  const loaded: Scenario[] = [];
  for (const file of files) {
    const module = (await import(`./${file}`)) as Record<string, unknown>;
    const exported = Object.values(module).filter(isScenario);
    if (exported.length !== 1) {
      throw new Error(`${file} should export exactly one scenario, but exports ${exported.length}`);
    }
    loaded.push(exported[0]!);
  }
  return loaded;
}

function isScenario(value: unknown): value is Scenario {
  return typeof value === 'object' && value !== null && 'decisionTree' in value && 'npcs' in value;
}
