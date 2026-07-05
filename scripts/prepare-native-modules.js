const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const nodeAbi = require('node-abi');

const nativeModules = ['better-sqlite3'];

function run(command, args, options) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: false,
    ...options,
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} exited with code ${result.status}`);
  }
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function getNpmCacheDir(projectDir) {
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const result = spawnSync(npmCommand, ['config', 'get', 'cache'], {
    cwd: projectDir,
    encoding: 'utf8',
    shell: false,
  });

  if (result.status === 0 && result.stdout.trim()) {
    return result.stdout.trim();
  }

  if (process.env.npm_config_cache) {
    return process.env.npm_config_cache;
  }

  return path.join(process.env.APPDATA || path.join(process.env.HOME || projectDir, '.npm'), 'npm-cache');
}

function purgeBrokenPrebuildCache({ projectDir, moduleName, moduleVersion, electronAbi, platform, arch }) {
  const cacheDir = path.join(getNpmCacheDir(projectDir), '_prebuilds');
  const prebuildName = `${moduleName}-v${moduleVersion}-electron-v${electronAbi}-${platform}-${arch}.tar.gz`;

  if (!fs.existsSync(cacheDir)) {
    return;
  }

  for (const entry of fs.readdirSync(cacheDir)) {
    if (!entry.endsWith(prebuildName)) {
      continue;
    }

    const cacheFile = path.join(cacheDir, entry);
    const size = fs.statSync(cacheFile).size;

    if (size < 1024) {
      fs.rmSync(cacheFile, { force: true });
      console.log(`[native] Removed invalid cached prebuild: ${cacheFile}`);
    }
  }
}

function copyNativeModule(projectDir, appDir, moduleName) {
  const sourceDir = path.join(projectDir, 'node_modules', moduleName);
  const targetDir = path.join(appDir, 'node_modules', moduleName);

  if (!fs.existsSync(sourceDir)) {
    throw new Error(`Missing native module source: ${sourceDir}`);
  }
  if (!fs.existsSync(path.join(appDir, 'node_modules'))) {
    throw new Error(`Missing app node_modules directory: ${path.join(appDir, 'node_modules')}`);
  }

  fs.rmSync(targetDir, { recursive: true, force: true });
  fs.cpSync(sourceDir, targetDir, { recursive: true, force: true });

  // The root node_modules binary is built for the local Node.js ABI. Remove it
  // so a stale Node binary cannot be mistaken for an Electron-compatible build.
  fs.rmSync(path.join(targetDir, 'build'), { recursive: true, force: true });

  console.log(`[native] Copied full ${moduleName} package into ${appDir}`);
  return targetDir;
}

function installElectronPrebuild({ projectDir, moduleDir, electronVersion, platform, arch }) {
  const prebuildInstall = path.join(projectDir, 'node_modules', 'prebuild-install', 'bin.js');

  if (!fs.existsSync(prebuildInstall)) {
    throw new Error(`Missing prebuild-install CLI: ${prebuildInstall}`);
  }

  run(process.execPath, [
    prebuildInstall,
    `--runtime=electron`,
    `--target=${electronVersion}`,
    `--arch=${arch}`,
    `--platform=${platform}`,
    '--verbose',
  ], {
    cwd: moduleDir,
    env: {
      ...process.env,
      npm_config_runtime: 'electron',
      npm_config_target: electronVersion,
      npm_config_arch: arch,
      npm_config_platform: platform,
    },
  });
}

function rebuildFromSource({ projectDir, appDir, moduleName, electronVersion, platform, arch }) {
  const rebuildCli = path.join(projectDir, 'node_modules', '@electron', 'rebuild', 'lib', 'cli.js');

  if (!fs.existsSync(rebuildCli)) {
    throw new Error(`Missing @electron/rebuild CLI: ${rebuildCli}`);
  }

  run(process.execPath, [
    rebuildCli,
    '-f',
    '--only',
    moduleName,
    '--version',
    electronVersion,
    '--module-dir',
    appDir,
    '--platform',
    platform,
    '--arch',
    arch,
    '--build-from-source',
  ], {
    cwd: projectDir,
  });
}

function ensureNativeBinary(moduleDir, moduleName) {
  const binaryPath = path.join(moduleDir, 'build', 'Release', 'better_sqlite3.node');

  if (!fs.existsSync(binaryPath)) {
    throw new Error(`Missing rebuilt native binary for ${moduleName}: ${binaryPath}`);
  }

  const size = fs.statSync(binaryPath).size;
  if (size < 1024) {
    throw new Error(`Invalid native binary for ${moduleName}: ${binaryPath}`);
  }
}

function verifyBetterSqliteWithElectron({ projectDir, appDir, moduleName }) {
  const electronBinary = require(path.join(projectDir, 'node_modules', 'electron'));
  const moduleDir = path.join(appDir, 'node_modules', moduleName);
  const marker = `native-ok-${process.pid}-${Date.now()}`;
  const testDb = path.join(os.tmpdir(), `${moduleName}-${process.pid}-${Date.now()}.db`);
  const code = `
const Database = require(${JSON.stringify(moduleDir)});
const db = new Database(${JSON.stringify(testDb)});
db.close();
console.log(${JSON.stringify(marker)});
`;

  const result = spawnSync(electronBinary, ['-e', code], {
    cwd: appDir,
    encoding: 'utf8',
    env: {
      ...process.env,
      ELECTRON_RUN_AS_NODE: '1',
    },
  });

  for (const suffix of ['', '-wal', '-shm']) {
    fs.rmSync(`${testDb}${suffix}`, { force: true });
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`;
  if (result.error || result.status !== 0 || !result.stdout?.includes(marker)) {
    throw new Error(
      `Electron cannot load ${moduleName} from ${moduleDir}.\n` +
      `${result.error?.message || output.trim() || `exit code ${result.status}`}`
    );
  }

  if (/NODE_MODULE_VERSION|ERR_DLOPEN_FAILED/i.test(output)) {
    throw new Error(`Electron ABI verification failed for ${moduleName}:\n${output.trim()}`);
  }
}

function prepareNativeModules(options = {}) {
  const projectDir = options.projectDir || process.cwd();
  const appDir = options.appDir || path.join(projectDir, '.next', 'standalone');
  const electronVersion = options.electronVersion || readJson(path.join(projectDir, 'node_modules', 'electron', 'package.json')).version;
  const platform = options.platform || process.env.npm_config_platform || process.platform;
  const arch = options.arch || process.env.npm_config_arch || process.arch;
  const electronAbi = nodeAbi.getAbi(electronVersion, 'electron');

  if (!fs.existsSync(appDir)) {
    throw new Error(`Missing standalone app directory: ${appDir}`);
  }

  console.log(`[native] Preparing native modules for Electron ${electronVersion} (ABI ${electronAbi}, ${platform}-${arch})`);

  for (const moduleName of nativeModules) {
    const modulePkg = readJson(path.join(projectDir, 'node_modules', moduleName, 'package.json'));
    const moduleDir = copyNativeModule(projectDir, appDir, moduleName);

    purgeBrokenPrebuildCache({
      projectDir,
      moduleName,
      moduleVersion: modulePkg.version,
      electronAbi,
      platform,
      arch,
    });

    let prebuildReady = false;
    try {
      installElectronPrebuild({ projectDir, moduleDir, electronVersion, platform, arch });
      ensureNativeBinary(moduleDir, moduleName);
      verifyBetterSqliteWithElectron({ projectDir, appDir, moduleName });
      prebuildReady = true;
      console.log(`[native] Electron prebuild verified for ${moduleName}`);
    } catch (error) {
      console.warn(`[native] Electron prebuild unusable for ${moduleName}; falling back to source rebuild.`);
      console.warn(`[native] ${error.message}`);
    }

    if (!prebuildReady) {
      rebuildFromSource({ projectDir, appDir, moduleName, electronVersion, platform, arch });
      ensureNativeBinary(moduleDir, moduleName);
      verifyBetterSqliteWithElectron({ projectDir, appDir, moduleName });
      console.log(`[native] Electron source rebuild verified for ${moduleName}`);
    }
  }
}

if (require.main === module) {
  prepareNativeModules();
}

module.exports = { prepareNativeModules };
