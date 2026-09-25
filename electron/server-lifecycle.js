'use strict';

/**
 * Cycle de vie du serveur Next local lancé par Electron.
 *
 * Ce module isole les trois opérations à l'origine d'un incident réel : sur un
 * poste où un `npm run dev` d'un autre projet Next tournait en même temps que
 * l'application packagée, la fenêtre de Gestion Gaz affichait l'application
 * voisine, branchée sur une autre base de données.
 *
 *  1. `findFreePort` sondait `0.0.0.0:PORT`. Sous Windows, `0.0.0.0:PORT` et
 *     `127.0.0.1:PORT` peuvent coexister : le port 3000 était donc déclaré
 *     libre alors qu'un `next dev` le tenait sur la boucle locale, et le
 *     serveur de l'application mourait aussitôt sur `EADDRINUSE`.
 *  2. `waitForServer` acceptait toute réponse HTTP < 500. Le serveur du projet
 *     voisin (mode développement, donc sans `APP_TOKEN`) répondait 307 et était
 *     pris pour le nôtre : `mainWindow.loadURL()` chargeait l'autre application.
 *  3. `child.kill()` ne tue que le processus intermédiaire sous Windows ; les
 *     processus Next survivaient et gardaient le port et le fichier SQLite
 *     ouverts.
 *
 * Signature d'identité utilisée : `proxy.ts` répond **404** à toute requête
 * dépourvue de `x-app-token` dès que `APP_TOKEN` est défini, et sert
 * normalement (307 → /login) lorsque le jeton est présent. Un serveur voisin
 * sans `APP_TOKEN` répond 307/200 dans les deux cas, ce que ces deux contrôles
 * démasquent.
 *
 * Ce module ne dépend pas d'Electron : il est exerçable tel quel par
 * `npm run verify:port` (voir scripts/verify-port-selection.js).
 */

const net = require('net');
const http = require('http');
const { execSync } = require('child_process');

/** Interface sur laquelle le serveur Next est lié (cf. `HOSTNAME` du fork). */
const LOOPBACK_HOST = '127.0.0.1';

/** Délai maximal d'une sonde : un socket qui accepte sans répondre ne doit pas bloquer. */
const DEFAULT_PROBE_TIMEOUT_MS = 2000;
const DEFAULT_RETRIES = 60;
const DEFAULT_RETRY_DELAY_MS = 1000;

/**
 * Pause interruptible : `stopNextServer()` ou la mort du serveur doivent
 * pouvoir interrompre l'attente sans attendre le délai complet.
 */
function sleep(durationMs, signal) {
  return new Promise((resolve) => {
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, durationMs);
    signal?.addEventListener('abort', finish, { once: true });
  });
}

/** Le port est-il libre **sur `host`** ? */
function isPortFree(port, host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once('error', (error) => {
      if (error.code === 'EADDRINUSE' || error.code === 'EACCES') {
        resolve(false);
        return;
      }

      reject(error);
    });

    server.listen(port, host, () => {
      server.close(() => resolve(true));
    });
  });
}

/**
 * Premier port libre **sur `host`** à partir de `startPort`.
 *
 * Sonder l'interface réellement utilisée par le serveur Next (`127.0.0.1`)
 * rend la réservation fidèle : sous Windows, une sonde sur `0.0.0.0` réussit
 * même quand `127.0.0.1` est déjà pris.
 */
async function findFreePort(startPort, host = LOOPBACK_HOST, attempts = 50) {
  for (let offset = 0; offset < attempts; offset += 1) {
    const port = startPort + offset;

    if (port > 65535) break;

    // eslint-disable-next-line no-await-in-loop
    const free = await isPortFree(port, host);
    if (free) return port;
  }

  throw new Error(
    `Aucun port libre sur ${host} entre ${startPort} et ${startPort + attempts - 1}.`,
  );
}

/**
 * Requête HTTP unique et bornée dans le temps.
 *
 * `agent: false` : une sonde est un aller-retour jetable, on ne laisse pas de
 * socket en réutilisation dans le pool.
 */
function requestStatus(url, options = {}) {
  const { token, timeoutMs = DEFAULT_PROBE_TIMEOUT_MS, signal } = options;

  return new Promise((resolve) => {
    let request;

    try {
      request = http.get(
        url,
        {
          headers: token ? { 'x-app-token': token } : undefined,
          agent: false,
          signal,
        },
        (response) => {
          response.resume();
          response.once('end', () => resolve({ status: response.statusCode ?? null, error: null }));
        },
      );
    } catch (error) {
      resolve({ status: null, error });
      return;
    }

    request.setTimeout(timeoutMs, () => {
      const error = new Error(`délai de ${timeoutMs} ms dépassé`);
      error.code = 'ETIMEDOUT';
      request.destroy(error);
    });

    request.once('error', (error) => resolve({ status: null, error }));
  });
}

/**
 * Cette URL répond-elle bien à **notre** application ?
 *
 * @returns {Promise<{ours: boolean, foreign: boolean, status?: number|null, reason: string}>}
 *   `foreign` signale qu'un autre programme tient le port : attendre ne sert à
 *   rien, il faut changer de port. Ni `ours` ni `foreign` = rien ne répond
 *   encore, l'attente peut continuer.
 */
async function identifyServer(url, options = {}) {
  const { token, timeoutMs = DEFAULT_PROBE_TIMEOUT_MS, signal } = options;

  const anonymous = await requestStatus(url, { timeoutMs, signal });
  if (anonymous.error) {
    return { ours: false, foreign: false, reason: `injoignable (${describeError(anonymous.error)})` };
  }

  if (token && anonymous.status !== 404) {
    return {
      ours: false,
      foreign: true,
      status: anonymous.status,
      reason: `répond ${anonymous.status} sans jeton, alors que notre proxy répondrait 404`,
    };
  }

  const authenticated = await requestStatus(url, { token, timeoutMs, signal });
  if (authenticated.error) {
    return { ours: false, foreign: false, reason: `injoignable (${describeError(authenticated.error)})` };
  }

  if (authenticated.status === 404) {
    return {
      ours: false,
      foreign: true,
      status: authenticated.status,
      reason: 'répond 404 même avec le jeton, ce n’est pas notre application',
    };
  }

  return { ours: true, foreign: false, status: authenticated.status, reason: 'notre application répond' };
}

/** Attend que le serveur soit **réellement** le nôtre. */
async function waitForServer(url, options = {}) {
  const {
    token,
    retries = DEFAULT_RETRIES,
    delayMs = DEFAULT_RETRY_DELAY_MS,
    timeoutMs = DEFAULT_PROBE_TIMEOUT_MS,
    signal,
  } = options;

  let lastReason = 'aucune tentative';

  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (signal?.aborted) {
      return { ready: false, aborted: true, attempts: attempt, reason: 'processus serveur arrêté' };
    }

    // eslint-disable-next-line no-await-in-loop
    const identity = await identifyServer(url, { token, timeoutMs, signal });

    if (identity.ours) {
      return { ready: true, attempts: attempt, status: identity.status, reason: identity.reason };
    }

    if (identity.foreign) {
      return { ready: false, foreign: true, attempts: attempt, reason: identity.reason };
    }

    lastReason = identity.reason;

    if (attempt < retries) {
      // eslint-disable-next-line no-await-in-loop
      await sleep(delayMs, signal);
    }
  }

  return { ready: false, attempts: retries, reason: lastReason };
}

/** Arrêt du serveur, arbre de processus compris. */
function stopChild(child) {
  if (!child || child.exitCode !== null) return;

  const { pid } = child;

  try {
    if (process.platform === 'win32' && pid) {
      // `child.kill()` ne tue que le processus Node intermédiaire : les
      // processus de Next survivraient et garderaient le port et le fichier
      // SQLite ouverts.
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      child.kill('SIGTERM');
    }
  } catch (error) {
    try {
      child.kill('SIGKILL');
    } catch {
      // Le processus est déjà mort : rien à faire.
    }
  }
}

function describeError(error) {
  return error.code || error.message || String(error);
}

module.exports = {
  LOOPBACK_HOST,
  DEFAULT_PROBE_TIMEOUT_MS,
  findFreePort,
  identifyServer,
  requestStatus,
  waitForServer,
  stopChild,
};
