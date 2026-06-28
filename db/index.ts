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

    console.log('[db] Chemin:', dbPath);

    const sqlite = new Database(dbPath);

    // Meilleures performances
    sqlite.pragma('journal_mode = WAL');

    _db = drizzle(sqlite, { schema });

    // Initialiser les tables si DB vide
    initializeDatabase(sqlite);
  }
  return _db;
}

function initializeDatabase(sqlite: any) {
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

    const hasDrizzleTable = tables.some(t => t.name === '__drizzle_migrations');

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
    }

    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    try {
      migrate(_db, { migrationsFolder });
    } catch (migErr: any) {
      console.error('[db] ❌ Échec de migrate():', migErr.message);
      throw migErr;
    }

    const tablesAfter = sqlite.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    ).all() as { name: string }[];
    console.log(`[db] ✅ ${tablesAfter.length} tables présentes`);
  } catch (err: any) {
    console.error('[db] Erreur initialisation:', err.message);
    throw err;
  }
}

// Proxy transparent — tout le code existant continue de fonctionner
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  }
});

export { schema };