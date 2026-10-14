import { validateScenario } from '../game/decision-tree.ts';
import { scenarios } from '../scenarios/index.ts';
import { db } from './index.ts';
import { gameTemplates, npcTemplates, users } from './schema.ts';

// Inserts the scenarios and the players. Run via `npm run db:reset`, which starts from an empty
// database.
scenarios.forEach(validateScenario);

db.transaction((tx) => {
  tx.insert(users)
    .values([
      { username: 'jeremy', handle: 'Breakfast Club', phoneNumber: '+13868432817' },
      { username: 'mark', handle: 'Ghost Ears', phoneNumber: '+17739726275' },
    ])
    .run();

  for (const { npcs, ...game } of scenarios) {
    const template = tx.insert(gameTemplates).values(game).returning().get();
    tx.insert(npcTemplates)
      .values(npcs.map((npc) => ({ ...npc, gameTemplateId: template.id })))
      .run();
  }
});

console.log('Seeded database.');
