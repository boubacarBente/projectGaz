import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import os from 'os';

// Logger persistant : écrit dans la console ET dans un fichier
// db-error.log à côté de la DB. Indispensable pour diagnostiquer
// quand DevTools est fermé ou stdout n'est pas visible.
let _logFilePath: string | null = null;
function dbLog(...args: any[]) {
  const line = args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ');
  console.log(...args);
  try {
    if (!_logFilePath) {
      const baseDir = process.env.ELECTRON_APP_PATH || process.cwd();
      _logFilePath = path.join(baseDir, 'db-error.log');
    }
    fs.appendFileSync(_logFilePath, `[${new Date().toISOString()}] ${line}\n`);
  } catch {
    // Silencieux : si on ne peut pas écrire le log, tant pis
  }
}
function dbError(...args: any[]) {
  const line = args.map(a => typeof a === 'string' ? a : JSON.stringify(a, null, 2)).join(' ');
  console.error(...args);
  try {
    if (!_logFilePath) {
      const baseDir = process.env.ELECTRON_APP_PATH || process.cwd();
      _logFilePath = path.join(baseDir, 'db-error.log');
    }
    fs.appendFileSync(_logFilePath, `[${new Date().toISOString()}] ERROR ${line}\n`);
  } catch {
    // Silencieux
  }
}

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
let _initError: Error | null = null;

function getDb(): any {
  if (_initError) {
    // On a déjà essayé d'initialiser et ça a planté — on propage l'erreur
    // de manière claire plutôt que de planter de manière cryptique.
    throw _initError;
  }
  if (!_db) {
    dbLog('[db] ══ Démarrage DB ══');
    dbLog('[db] Platform:', os.platform(), 'arch:', os.arch());
    dbLog('[db] Node:', process.version);
    dbLog('[db] ELECTRON_APP_PATH:', process.env.ELECTRON_APP_PATH || '(non défini)');
    dbLog('[db] process.resourcesPath:', process.resourcesPath || '(non défini)');

    let Database: any;
    try {
      Database = require('better-sqlite3');
      dbLog('[db] ✅ better-sqlite3 chargé');
    } catch (reqErr: any) {
      dbError('[db] ❌ IMPOSSIBLE DE CHARGER better-sqlite3:', reqErr?.message ?? reqErr);
      dbError('[db]    Stack:', reqErr?.stack);
      dbError('[db]    → Lance "npx @electron/rebuild -f -w better-sqlite3" puis rebuild');
      _initError = new Error(
        `better-sqlite3 binding natif manquant ou incompatible.\n` +
        `→ Lance : npx @electron/rebuild -f -w better-sqlite3\n` +
        `Puis : npm run build:desktop:win\n\n` +
        `Détails : ${reqErr?.message ?? reqErr}\n` +
        `Voir aussi : ${_logFilePath ?? 'db-error.log'}`
      );
      throw _initError;
    }

    const dbPath = getDbPath();
    dbLog('[db] Chemin:', dbPath);

    // Créer le dossier parent si nécessaire
    const dbDir = path.dirname(dbPath);
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    let sqlite: any;
    try {
      sqlite = new Database(dbPath);
      dbLog('[db] ✅ SQLite ouvert');
    } catch (dbErr: any) {
      dbError('[db] ❌ IMPOSSIBLE D\'OUVRIR LA DB:', dbErr?.message ?? dbErr);
      _initError = new Error(
        `Impossible d'ouvrir la base SQLite à ${dbPath}\n` +
        `→ ${dbErr?.message ?? dbErr}\n` +
        `Voir : ${_logFilePath ?? 'db-error.log'}`
      );
      throw _initError;
    }

    // Meilleures performances
    sqlite.pragma('journal_mode = WAL');

    _db = drizzle(sqlite, { schema }) as any;

    try {
      initializeDatabase(sqlite);
    } catch (initErr: any) {
      dbError('[db] ══ INITIALISATION DB A ÉCHOUÉ ══');
      dbError('[db]', initErr?.message ?? initErr);
      dbError('[db] Stack:', initErr?.stack);
      _initError = new Error(
        `Initialisation DB échouée : ${initErr?.message ?? initErr}\n` +
        `Voir : ${_logFilePath ?? 'db-error.log'}`
      );
      throw _initError;
    }
  }
  return _db;
}

function initializeDatabase(sqlite: any) {
  dbLog('[db] ── initializeDatabase START ──');
  try {
    const migrationsFolder = getMigrationsPath();
    dbLog('[db] Dossier migrations:', migrationsFolder);

    if (!fs.existsSync(migrationsFolder)) {
      dbError('[db] ❌ Dossier migrations introuvable:', migrationsFolder);
      dbError('[db]    → Lance "npm run db:generate" puis rebuilde l\'app');
      dbError('[db]    → Vérifie que "db/migrations/**/*" est dans package.json build.files');
      dbError('[db]    → Dans Electron packagé, ce dossier est dans resources/app/db/migrations/');
      throw new Error(`Migrations folder missing: ${migrationsFolder}`);
    }

    const tables = sqlite.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    ).all() as { name: string }[];

    dbLog(`[db] Tables existantes (${tables.length}):`, tables.map(t => t.name).sort());

    const hasDrizzleTable = tables.some(t => t.name === '__drizzle_migrations');
    const hasUsersTable = tables.some(t => t.name === 'users');

    // Cas spécial : DB pré-existante sans tracking Drizzle
    // (probablement créée avec `drizzle-kit push` qui ne crée pas
    // __drizzle_migrations). Drizzle migrate() n'est PAS idempotent
    // face à cette situation : il crash avec "table already exists".
    // → On force un reset pour garantir la cohérence.
    if (tables.length > 0 && !hasDrizzleTable) {
      dbLog(`[db] ⚠️ DB existante (${tables.length} tables) sans tracking Drizzle — reset complet`);
      for (const t of tables) {
        sqlite.exec(`DROP TABLE IF EXISTS "${t.name}"`);
      }
      dbLog('[db] Tables supprimées, ré-application des migrations...');
    } else if (!hasUsersTable && tables.length > 0) {
      dbLog('[db] ⚠️ __drizzle_migrations présent mais table users absente — reset complet');
      for (const t of tables) {
        sqlite.exec(`DROP TABLE IF EXISTS "${t.name}"`);
      }
    }

    const { migrate } = require('drizzle-orm/better-sqlite3/migrator');
    try {
      migrate(_db, { migrationsFolder });
      dbLog('[db] ✅ migrate() OK');
    } catch (migErr: any) {
      dbError('[db] ❌ Échec de migrate():', migErr.message);
      dbError('[db] Stack:', migErr.stack);
      throw migErr;
    }

    const tablesAfter = sqlite.prepare(
      `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
    ).all() as { name: string }[];
    dbLog(`[db] ✅ ${tablesAfter.length} tables présentes après init:`, tablesAfter.map(t => t.name).sort());

    const usersAfter = tablesAfter.find(t => t.name === 'users');
    if (!usersAfter) {
      dbError('[db] ❌ TABLE USERS TOUJOURS ABSENTE après migrate() !');
      throw new Error('Table users absente après migrations');
    }
  } catch (err: any) {
    dbError('[db] ❌ Erreur initialisation:', err?.message ?? err);
    dbError('[db] Stack:', err?.stack);
    throw err;
  }
  dbLog('[db] ── initializeDatabase END ──');
}

// Proxy transparent — tout le code existant continue de fonctionner
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  }
});

export { schema };