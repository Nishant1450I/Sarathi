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

    // Schema v5 migrations: passport_shares, learning_resources, resource_bookmarks, resource_progress
    const sharesCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='passport_shares';").get();
    if (sharesCheck) {
      const cols = db.prepare("PRAGMA table_info(passport_shares);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('sections_config')) {
        db.exec(`ALTER TABLE passport_shares ADD COLUMN sections_config TEXT DEFAULT '{"includeSkills":true,"includeProjects":true,"includeContact":false,"includeAssessments":true}';`);
      }
    }

    const resourcesCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='learning_resources';").get();
    if (resourcesCheck) {
      const cols = db.prepare("PRAGMA table_info(learning_resources);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('slug')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN slug TEXT;");
      }
      if (!colNames.has('resource_type')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN resource_type TEXT DEFAULT 'documentation';");
      }
      if (!colNames.has('source')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN source TEXT DEFAULT 'web';");
      }
      if (!colNames.has('youtube_video_id')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN youtube_video_id TEXT;");
      }
      if (!colNames.has('youtube_playlist_id')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN youtube_playlist_id TEXT;");
      }
      if (!colNames.has('channel_name')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN channel_name TEXT;");
      }
      if (!colNames.has('thumbnail_url')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN thumbnail_url TEXT;");
      }
      if (!colNames.has('duration_minutes')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN duration_minutes INTEGER DEFAULT 0;");
      }
      if (!colNames.has('last_verified_at')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN last_verified_at TEXT;");
      }
      if (!colNames.has('description')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN description TEXT DEFAULT '';");
      }
      if (!colNames.has('learning_objectives')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN learning_objectives TEXT DEFAULT '[]';");
      }
      if (!colNames.has('prerequisites')) {
        db.exec("ALTER TABLE learning_resources ADD COLUMN prerequisites TEXT DEFAULT '[]';");
      }

      // Backfill slug and resource_type for pre-existing rows
      try {
        db.exec("UPDATE learning_resources SET slug = id WHERE slug IS NULL OR slug = '';");
        db.exec("UPDATE learning_resources SET resource_type = COALESCE(type, 'documentation') WHERE resource_type IS NULL OR resource_type = '';");
        db.exec("UPDATE learning_resources SET source = CASE WHEN youtube_video_id IS NOT NULL OR youtube_playlist_id IS NOT NULL THEN 'youtube' ELSE 'web' END WHERE source IS NULL OR source = '';");
      } catch (backfillErr) {
        console.warn('Backfill note for learning_resources:', backfillErr.message);
      }
    }

    const bookmarksCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='resource_bookmarks';").get();
    if (bookmarksCheck) {
      const cols = db.prepare("PRAGMA table_info(resource_bookmarks);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('collection_name')) {
        db.exec("ALTER TABLE resource_bookmarks ADD COLUMN collection_name TEXT DEFAULT 'my_list';");
      }
    }

    const progressCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='resource_progress';").get();
    if (progressCheck) {
      const cols = db.prepare("PRAGMA table_info(resource_progress);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('percent_complete')) {
        db.exec("ALTER TABLE resource_progress ADD COLUMN percent_complete INTEGER DEFAULT 0;");
      }
      if (!colNames.has('notes')) {
        db.exec("ALTER TABLE resource_progress ADD COLUMN notes TEXT DEFAULT '';");
      }
      if (!colNames.has('last_position_seconds')) {
        db.exec("ALTER TABLE resource_progress ADD COLUMN last_position_seconds INTEGER DEFAULT 0;");
      }
      if (!colNames.has('completed_item_ids')) {
        db.exec("ALTER TABLE resource_progress ADD COLUMN completed_item_ids TEXT DEFAULT '[]';");
      }
      if (!colNames.has('completed_at')) {
        db.exec("ALTER TABLE resource_progress ADD COLUMN completed_at TEXT;");
      }
    }

    const usersCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='users';").get();
    if (usersCheck) {
      const cols = db.prepare("PRAGMA table_info(users);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('status')) {
        db.exec("ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';");
      }
      if (!colNames.has('institution_id')) {
        db.exec("ALTER TABLE users ADD COLUMN institution_id TEXT;");
      }
    }

    const roadmapsCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='student_roadmaps';").get();
    if (roadmapsCheck) {
      const cols = db.prepare("PRAGMA table_info(student_roadmaps);").all();
      const colNames = new Set(cols.map(c => c.name));
      if (!colNames.has('task_progress')) {
        db.exec("ALTER TABLE student_roadmaps ADD COLUMN task_progress TEXT NOT NULL DEFAULT '{}';");
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
