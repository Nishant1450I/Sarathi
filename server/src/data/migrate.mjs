import { initDb, closeDb } from '../config/db.js';
import { ddl, SCHEMA_VERSION } from './schema.js';

export function runMigrations(dbFile) {
  const db = initDb(dbFile);
  console.log(`Starting migration to schema version ${SCHEMA_VERSION}...`);

  // Create schema version tracking table if not exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const currentVersionRow = db.prepare('SELECT MAX(version) as max_version FROM schema_migrations;').get();
  const currentVersion = currentVersionRow?.max_version || 0;

  if (currentVersion >= SCHEMA_VERSION) {
    console.log(`Schema is already up to date (version: ${currentVersion}).`);
    return { applied: false, version: currentVersion };
  }

  // Execute canonical DDL
  db.exec(ddl);

  // Record migration
  db.prepare('INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?);')
    .run(SCHEMA_VERSION, new Date().toISOString());

  console.log(`Migration successful! Database updated to version ${SCHEMA_VERSION}.`);
  return { applied: true, version: SCHEMA_VERSION };
}

// If executed directly
if (process.argv[1]?.endsWith('migrate.mjs')) {
  try {
    runMigrations();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    closeDb();
  }
}
