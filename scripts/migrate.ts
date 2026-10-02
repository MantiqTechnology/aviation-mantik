import { loadLocalEnv } from './load-env';
import { createDbClient } from '../server/db/client';
import { runMigrations } from '../server/db/migrate';

loadLocalEnv();

const dbPath = process.env.MANTIK_DB_PATH ?? './data/mantik-demo.sqlite';
const { sqlite } = createDbClient(dbPath);

runMigrations(sqlite);
sqlite.close();

console.log(`Migrated MANTIK demo database at ${dbPath}`);
