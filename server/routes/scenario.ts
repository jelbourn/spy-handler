import { eq } from 'drizzle-orm';
import type { Context } from 'hono';
import type { ScenarioSummary } from '../../shared/models.ts';
import { db } from '../db/index.ts';
import { gameTemplates, npcTemplates } from '../db/schema.ts';

/** Lists every game template as a `ScenarioSummary`, for the mission list. */
export function listScenarios(c: Context) {
  const summaries: ScenarioSummary[] = db
    .select()
    .from(gameTemplates)
    .orderBy(gameTemplates.id)
    .all()
    .map((template) => ({
      id: template.id,
      title: template.title,
      briefing: template.scenario,
      allowedFailures: template.allowedFailures,
      operatives: db
        .select()
        .from(npcTemplates)
        .where(eq(npcTemplates.gameTemplateId, template.id))
        .orderBy(npcTemplates.id)
        .all()
        .map((npc) => ({ name: npc.name, bio: npc.persona, stats: npc.stats })),
    }));
  return c.json(summaries);
}
