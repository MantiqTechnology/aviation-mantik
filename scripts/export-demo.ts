import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { loadLocalEnv } from './load-env';
import { createDbClient } from '../server/db/client';
import { runMigrations } from '../server/db/migrate';

loadLocalEnv();

const dbPath = process.env.MANTIK_DB_PATH ?? './data/mantik-demo.sqlite';
const exportPath =
  process.env.MANTIK_EXPORT_PATH ??
  join(
    process.cwd(),
    'data',
    `mantik-demo-export-${new Date().toISOString().replace(/[:.]/g, '-')}.json`
  );

const { sqlite } = createDbClient(dbPath);
runMigrations(sqlite);

const tables = (
  sqlite
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
    )
    .all() as Array<{ name: string }>
).map((row) => row.name);

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

const payload = Object.fromEntries(
  tables.map((table) => [table, sqlite.prepare(`SELECT * FROM ${quoteIdentifier(table)}`).all()])
);

await mkdir(dirname(exportPath), { recursive: true });
await writeFile(exportPath, JSON.stringify(payload, null, 2));
sqlite.close();

console.log(`Exported MANTIK demo data to ${exportPath}`);
