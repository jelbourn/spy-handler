import { validateOperative } from '../game/decision-tree.ts';
import { scenarios } from '../scenarios/index.ts';
import { db } from './index.ts';
import { gameTemplates, npcTemplates, users } from './schema.ts';

// Inserts the scenarios and a demo user. Run via `npm run db:reset`, which starts from an empty
// database.
for (const { npcs } of scenarios) {
  npcs.forEach(validateOperative);
}

db.transaction((tx) => {
  tx.insert(users)
    .values({
      username: 'handler',
      phoneNumber: process.env['SEED_PHONE_NUMBER'] || '+15555550100',
    })
    .run();

  for (const { npcs, ...game } of scenarios) {
    const template = tx.insert(gameTemplates).values(game).returning().get();
    tx.insert(npcTemplates)
      .values(npcs.map((npc) => ({ ...npc, gameTemplateId: template.id })))
      .run();
  }
});

console.log('Seeded database.');
