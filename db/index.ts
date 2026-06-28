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
    const tables = sqlite.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    ).all() as { name: string }[];

    if (tables.length === 0) {
      console.log('[db] Base vide — application des migrations...');

      const migrationsFolder = getMigrationsPath();
      console.log('[db] Dossier migrations:', migrationsFolder);

      if (!fs.existsSync(migrationsFolder)) {
        console.error('[db] ❌ Dossier migrations introuvable:', migrationsFolder);
        console.error('[db]    → Lance "npm run db:generate" puis rebuilde l\'app');
        console.error('[db]    → Vérifie que "db/migrations/**/*" est dans package.json build.files');
        return;
      }

      try {
        const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
        migrate(_db, { migrationsFolder });
        const tablesAfter = sqlite.prepare(
          `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
        ).all() as { name: string }[];
        console.log(`[db] ✅ Migrations appliquées — ${tablesAfter.length} tables créées`);
      } catch (migErr: any) {
        console.error('[db] ❌ Échec des migrations:', migErr.message);
        throw migErr;
      }
    } else {
      console.log(`[db] Base existante — ${tables.length} tables trouvées`);
    }
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