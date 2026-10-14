import { generateSQLiteDrizzleJson, generateSQLiteMigration } from 'drizzle-kit/api';
import { rmSync } from 'node:fs';
import * as schema from './schema.ts';

// Deletes the database, recreates all tables from schema.ts, then seeds the scenarios. There are no
// migrations while the design is in flux, so run this after every schema change.
const dbPath = process.env['DB_PATH'] ?? 'data/app.db';
for (const suffix of ['', '-wal', '-shm']) {
  rmSync(dbPath + suffix, { force: true });
}

const empty = await generateSQLiteDrizzleJson({});
const current = await generateSQLiteDrizzleJson(schema, empty.id, 'snake_case');
const statements = await generateSQLiteMigration(empty, current);

// Import after deleting the file so the connection opens a fresh database.
const { db } = await import('./index.ts');
db.transaction((tx) => {
  for (const statement of statements) {
    tx.run(statement);
  }
});
await import('./seed.ts');
