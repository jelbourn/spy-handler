import { candidCamera } from './candid-camera.ts';
import { captainHanks } from './captain-hanks.ts';
import type { Scenario } from './scenario.ts';
import { telephoneTest } from './telephone-test.ts';

/** Every playable scenario, seeded in this order by `npm run db:reset`. */
export const scenarios: Scenario[] = [captainHanks, telephoneTest, candidCamera];
