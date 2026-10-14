import type { GameTemplate, NpcTemplate } from '../../shared/models.ts';

/** A game and its operatives, as authored. Seeded into GameTemplate and NpcTemplate rows. */
export interface Scenario extends Omit<GameTemplate, 'id'> {
  npcs: Omit<NpcTemplate, 'id' | 'gameTemplateId'>[];
}
