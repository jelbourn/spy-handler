import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import type * as models from '../../shared/models.ts';

export const users = sqliteTable('users', {
  id: integer().primaryKey({ autoIncrement: true }),
  username: text().notNull().unique(),
  phoneNumber: text().notNull().unique(),
});

export const gameTemplates = sqliteTable('game_templates', {
  id: integer().primaryKey({ autoIncrement: true }),
  title: text().notNull(),
  scenario: text().notNull(),
  agentId: text(),
});

export const npcTemplates = sqliteTable('npc_templates', {
  id: integer().primaryKey({ autoIncrement: true }),
  gameTemplateId: integer()
    .notNull()
    .references(() => gameTemplates.id),
  name: text().notNull(),
  persona: text().notNull(),
  voiceId: text(),
  stats: text({ mode: 'json' }).$type<models.Stats>().notNull(),
  decisionTree: text({ mode: 'json' }).$type<models.DecisionTree>().notNull(),
});

export const gameSessions = sqliteTable('game_sessions', {
  id: integer().primaryKey({ autoIncrement: true }),
  userId: integer()
    .notNull()
    .references(() => users.id),
  gameTemplateId: integer()
    .notNull()
    .references(() => gameTemplates.id),
  startTime: text().notNull(),
  endTime: text(),
  status: text().$type<models.SessionStatus>().notNull().default('in-progress'),
});

export const npcSessions = sqliteTable('npc_sessions', {
  id: integer().primaryKey({ autoIncrement: true }),
  gameSessionId: integer()
    .notNull()
    .references(() => gameSessions.id),
  npcTemplateId: integer()
    .notNull()
    .references(() => npcTemplates.id),
  decisionNodeId: text().notNull(),
  callsWithoutDecision: integer().notNull().default(0),
  lastCommsTime: text(),
  deadline: text(),
  status: text().$type<models.SessionStatus>().notNull().default('in-progress'),
});

export const npcCalls = sqliteTable('npc_calls', {
  id: integer().primaryKey({ autoIncrement: true }),
  npcSessionId: integer()
    .notNull()
    .references(() => npcSessions.id),
  conversationId: text().unique(),
  callSid: text(),
  nodeId: text().notNull(),
  startTime: text().notNull(),
  endTime: text(),
  outcome: text().$type<models.NpcCallOutcome>(),
  summary: text(),
  transcript: text({ mode: 'json' }).$type<models.NpcCallTranscriptTurn[]>(),
  decision: text({ mode: 'json' }).$type<models.ChallengeRoll>(),
});

// Compile-time checks that the tables stay in sync with the shared models.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;
type Assert<T extends true> = T;
export type SchemaChecks = [
  Assert<Same<typeof users.$inferSelect, models.User>>,
  Assert<Same<typeof gameTemplates.$inferSelect, models.GameTemplate>>,
  Assert<Same<typeof npcTemplates.$inferSelect, models.NpcTemplate>>,
  Assert<Same<typeof gameSessions.$inferSelect, models.GameSession>>,
  Assert<Same<typeof npcSessions.$inferSelect, models.NpcSession>>,
  Assert<Same<typeof npcCalls.$inferSelect, models.NpcCall>>,
];
