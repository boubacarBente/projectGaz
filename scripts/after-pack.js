const fs = require('fs');
const path = require('path');
const { prepareNativeModules } = require('./prepare-native-modules');

function walk(dir, visitor) {
  if (!fs.existsSync(dir)) {
    return;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    visitor(fullPath, entry);
    if (entry.isDirectory()) {
      walk(fullPath, visitor);
    }
  }
}

exports.default = async function afterPack(context) {
  const appDir = path.join(context.appOutDir, 'resources', 'app');
  const nodeModulesDir = path.join(appDir, 'node_modules');
  const serverDir = path.join(appDir, '.next', 'server');
  const sourceNodeModulesDir = path.join(context.packager.projectDir, '.next', 'standalone', 'node_modules');

  if (fs.existsSync(sourceNodeModulesDir)) {
    fs.rmSync(nodeModulesDir, { recursive: true, force: true });
    fs.cpSync(sourceNodeModulesDir, nodeModulesDir, { recursive: true, force: true });
    console.log('[afterPack] restored minimal standalone node_modules');
  }

  if (!fs.existsSync(nodeModulesDir) || !fs.existsSync(serverDir)) {
    return;
  }

  const aliasPattern = /\b([@a-z0-9._-]+)-([0-9a-f]{16,})\b/gi;
  const aliases = new Map();

  walk(serverDir, (fullPath, entry) => {
    if (!entry.isFile() || (!entry.name.endsWith('.json') && !entry.name.endsWith('.js'))) {
      return;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    for (const match of content.matchAll(aliasPattern)) {
      const alias = match[0];
      const basePackage = match[1];

      if (basePackage === 'better-sqlite3') {
        aliases.set(alias, basePackage);
      }
    }
  });

  for (const [alias, basePackage] of aliases) {
    const aliasDir = path.join(nodeModulesDir, alias);
    const baseDir = path.join(nodeModulesDir, basePackage);

    if (!fs.existsSync(baseDir)) {
      continue;
    }

    fs.mkdirSync(aliasDir, { recursive: true });
    fs.writeFileSync(
      path.join(aliasDir, 'package.json'),
      JSON.stringify({ name: alias, private: true, main: 'index.js' }, null, 2)
    );
    fs.writeFileSync(
      path.join(aliasDir, 'index.js'),
      `module.exports = require(${JSON.stringify(basePackage)});\n`
    );

    console.log(`[afterPack] ensured external alias: ${alias} -> ${basePackage}`);
  }

  prepareNativeModules({
    projectDir: context.packager.projectDir,
    appDir,
    electronVersion: context.electronVersion || context.packager.config.electronVersion,
  });
  console.log('[afterPack] prepared native modules for Electron');
};
