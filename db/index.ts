import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';

function getDbPath(): string {
  if (process.env.ELECTRON_APP_PATH) {
    return path.join(process.env.ELECTRON_APP_PATH, 'database.db');
  }
  return path.join(process.cwd(), 'db', 'database.db');
}

function getMigrationsPath(): string {
  if (process.env.ELECTRON_APP_PATH) {
    // En production Electron : resources/app/db/migrations/
    // process.resourcesPath = .../resources, app = .../resources/app
    const appPath = path.join(process.resourcesPath, 'app');
    return path.join(appPath, 'db', 'migrations');
  }
  // En développement
  return path.join(process.cwd(), 'db', 'migrations');
}

let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    const Database = require('better-sqlite3');
    const dbPath = getDbPath();

    // Créer le dossier parent si nécessaire
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    console.log('[db] ══ Démarrage DB ══');
    console.log('[db] Chemin:', dbPath);
    console.log('[db] ELECTRON_APP_PATH:', process.env.ELECTRON_APP_PATH || '(non défini)');
    console.log('[db] process.resourcesPath:', process.resourcesPath || '(non défini)');

    const sqlite = new Database(dbPath);

    // Meilleures performances
    sqlite.pragma('journal_mode = WAL');

    _db = drizzle(sqlite, { schema });

    try {
      initializeDatabase(sqlite);
    } catch (initErr: any) {
      console.error('[db] ══ INITIALISATION DB A ÉCHOUÉ ══');
      console.error('[db]', initErr?.message ?? initErr);
      throw initErr;
    }
  }
  return _db;
}

function initializeDatabase(sqlite: any) {
  console.log('[db] ── initializeDatabase START ──');
  try {
    const migrationsFolder = getMigrationsPath();
    console.log('[db] Dossier migrations:', migrationsFolder);

    if (!fs.existsSync(migrationsFolder)) {
      console.error('[db] ❌ Dossier migrations introuvable:', migrationsFolder);
      console.error('[db]    → Lance "npm run db:generate" puis rebuilde l\'app');
      console.error('[db]    → Vérifie que "db/migrations/**/*" est dans package.json build.files');
      return;
    }

    const tables = sqlite.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    ).all() as { name: string }[];

    console.log(`[db] Tables existantes (${tables.length}):`, tables.map(t => t.name).sort());

    const hasDrizzleTable = tables.some(t => t.name === '__drizzle_migrations');
    const hasUsersTable = tables.some(t => t.name === 'users');

    // Cas spécial : DB pré-existante sans tracking Drizzle
    // (probablement créée avec `drizzle-kit push` qui ne crée pas
    // __drizzle_migrations). Drizzle migrate() n'est PAS idempotent
    // face à cette situation : il crash avec "table already exists".
    // → On force un reset pour garantir la cohérence.
    if (tables.length > 0 && !hasDrizzleTable) {
      console.warn(`[db] ⚠️ DB existante (${tables.length} tables) sans tracking Drizzle — reset complet`);
      for (const t of tables) {
        sqlite.exec(`DROP TABLE IF EXISTS "${t.name}"`);
      }
      console.log('[db] Tables supprimées, ré-application des migrations...');
    } else if (!hasUsersTable && tables.length > 0) {
      // Cas où __drizzle_migrations existe mais la table users manque
      // (improbable avec Drizzle mais on gère par sécurité)
      console.warn('[db] ⚠️ __drizzle_migrations présent mais table users absente — reset complet');
      for (const t of tables) {
        sqlite.exec(`DROP TABLE IF EXISTS "${t.name}"`);
      }
    }

    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    try {
      migrate(_db, { migrationsFolder });
      console.log('[db] ✅ migrate() OK');
    } catch (migErr: any) {
      console.error('[db] ❌ Échec de migrate():', migErr.message);
      console.error('[db] Stack:', migErr.stack);
      throw migErr;
    }

    const tablesAfter = sqlite.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    ).all() as { name: string }[];
    console.log(`[db] ✅ ${tablesAfter.length} tables présentes après init:`, tablesAfter.map(t => t.name).sort());

    // Sanity check : si users manque encore après migrate(), on log clairement
    const usersAfter = tablesAfter.find(t => t.name === 'users');
    if (!usersAfter) {
      console.error('[db] ❌ TABLE USERS TOUJOURS ABSENTE après migrate() !');
    }
  } catch (err: any) {
    console.error('[db] ❌ Erreur initialisation:', err?.message ?? err);
    console.error('[db] Stack:', err?.stack);
    throw err;
  }
  console.log('[db] ── initializeDatabase END ──');
}

// Proxy transparent — tout le code existant continue de fonctionner
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  }
});

export { schema };