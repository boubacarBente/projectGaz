const fs = require('fs');
const path = require('path');

const root = process.cwd();
const standalone = path.join(root, '.next', 'standalone');

function copy(src, dest, label) {
  if (!fs.existsSync(src)) {
    console.warn(`⚠️  ${label} introuvable: ${src}`);
    return;
  }
  console.log(`📦 Copie ${label}...`);
  fs.cpSync(src, dest, { recursive: true, force: true });
  console.log(`✅ ${label} copié`);
}

function remove(target, label) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`🧹 ${label} supprimé`);
  }
}

// 1. .next/static → standalone/.next/static
copy(
  path.join(root, '.next', 'static'),
  path.join(standalone, '.next', 'static'),
  '.next/static'
);

// 2. public/ → standalone/public/
copy(
  path.join(root, 'public'),
  path.join(standalone, 'public'),
  'public/'
);

copy(
  path.join(root, 'drizzle'),
  path.join(standalone, 'drizzle'),
  'drizzle/'
);

// 3. Supprimer standalone/.next/node_modules (contient des symlinks Windows problématiques)
remove(path.join(standalone, '.next', 'node_modules'), 'standalone/.next/node_modules');

// 4. node_modules/ → standalone/node_modules/
console.log('📦 Copie node_modules (peut prendre 1-2 minutes)...');
fs.cpSync(
  path.join(root, 'node_modules'),
  path.join(standalone, 'node_modules'),
  {
    recursive: true,
    force: true,
    filter: (src) => {
      // Ignorer les symlinks pour éviter EPERM sur Windows
      try {
        const stat = fs.lstatSync(src);
        if (stat.isSymbolicLink()) return false;
      } catch { return false; }

      const rel = path.relative(path.join(root, 'node_modules'), src);
      // Exclure les outils de dev inutiles en production
      if (rel.startsWith('.cache')) return false;
      if (rel.startsWith('electron-builder')) return false;
      if (rel.startsWith('drizzle-kit')) return false;
      if (rel.startsWith('eslint')) return false;
      if (rel.startsWith('typescript')) return false;
      if (rel.startsWith('@types')) return false;
      if (rel.startsWith('tailwindcss')) return false;
      if (rel.startsWith('@tailwindcss')) return false;
      return true;
    }
  }
);
console.log('✅ node_modules copié');

// 5. Nettoyer les artefacts parasites dans standalone/
remove(path.join(standalone, 'release'), 'standalone/release');
remove(path.join(standalone, 'data'), 'standalone/data');

console.log('\n✅ copy:standalone terminé avec succès');