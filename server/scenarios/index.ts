import { captainHanks } from './captain-hanks.ts';
import type { Scenario } from './scenario.ts';

/** Every playable scenario, seeded in this order by `npm run db:reset`. */
export const scenarios: Scenario[] = [captainHanks];
