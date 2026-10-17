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

  // Idempotently add any new columns to candidate_profiles if table exists
  try {
    const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='candidate_profiles';").get();
    if (tableCheck) {
      const cols = db.prepare("PRAGMA table_info(candidate_profiles);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('linkedin_url')) {
        db.exec('ALTER TABLE candidate_profiles ADD COLUMN linkedin_url TEXT;');
      }
      if (!colNames.has('degree')) {
        db.exec('ALTER TABLE candidate_profiles ADD COLUMN degree TEXT;');
      }
      if (!colNames.has('graduation_year')) {
        db.exec('ALTER TABLE candidate_profiles ADD COLUMN graduation_year INTEGER;');
      }
    }

    const attemptsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='assessment_attempts';").get();
    if (attemptsCheck) {
      const cols = db.prepare("PRAGMA table_info(assessment_attempts);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('engine_version')) {
        db.exec("ALTER TABLE assessment_attempts ADD COLUMN engine_version TEXT DEFAULT 'v1';");
      }
    }

    const sessionsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='assessment_sessions';").get();
    if (sessionsCheck) {
      const cols = db.prepare("PRAGMA table_info(assessment_sessions);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('deadline_at')) {
        db.exec("ALTER TABLE assessment_sessions ADD COLUMN deadline_at TEXT;");
      }
      if (!colNames.has('save_version')) {
        db.exec("ALTER TABLE assessment_sessions ADD COLUMN save_version INTEGER DEFAULT 1;");
      }
    }
  } catch (err) {
    console.warn('Column migration note:', err.message);
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
