import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from './schema';
import path from 'path';

// Détermine le chemin de la DB selon l'environnement
function getDbPath(): string {
  // En production Electron, la DB est dans les ressources de l'app
  if (process.env.ELECTRON_APP_PATH) {
    return path.join(process.env.ELECTRON_APP_PATH, 'database.db');
  }
  // En développement ou next build
  return path.join(process.cwd(), 'db', 'database.db');
}

// Lazy singleton — ne s'exécute PAS pendant next build
let _db: ReturnType<typeof drizzle> | null = null;

function getDb() {
  if (!_db) {
    // require() au lieu de import → chargé seulement à l'appel, jamais au build
    const Database = require('better-sqlite3');
    const sqlite = new Database(getDbPath());
    _db = drizzle(sqlite, { schema });
  }
  return _db;
}

// Proxy transparent — ton code existant n'a pas besoin de changer
export const db = new Proxy({} as ReturnType<typeof getDb>, {
  get(_target, prop) {
    return getDb()[prop as keyof ReturnType<typeof getDb>];
  }
});

export { schema };

// import { drizzle } from 'drizzle-orm/better-sqlite3';
// import Database from 'better-sqlite3';
// import * as schema from './schema';

// const sqlite = new Database('./db/database.db');
// export const db = drizzle(sqlite, { schema });

// export { schema };