#!/usr/bin/env node
'use strict';

/**
 * Vérification de la sélection de port et de l'identification du serveur local.
 *
 * Rejoue l'incident : un `next dev` d'un autre projet Next du poste occupe
 * `127.0.0.1:3000` (mode développement, donc sans `APP_TOKEN`). L'application
 * packagée doit :
 *
 *   1. ne pas croire ce port libre (l'ancienne sonde sur `0.0.0.0` se trompait
 *      sous Windows, car `0.0.0.0:PORT` et `127.0.0.1:PORT` coexistent) ;
 *   2. démasquer le serveur voisin au lieu de charger sa fenêtre dessus ;
 *   3. démarrer sur le port suivant et n'accepter que son propre serveur ;
 *   4. ne jamais rester bloquée sur un socket qui accepte sans répondre.
 *
 * Usage : npm run verify:port
 */

const http = require('http');
const net = require('net');
const {
  findFreePort,
  identifyServer,
  waitForServer,
} = require('../electron/server-lifecycle');

const TOKEN = 'jeton-de-verification';
const BASE_PORT = 34100;

const checks = [];

function check(name, passed, detail) {
  checks.push({ name, passed: Boolean(passed), detail: detail ?? '' });
  console.log(`${passed ? 'OK  ' : 'ECHEC'} ${name}${detail ? ` — ${detail}` : ''}`);
}

function listen(server, port, host = '127.0.0.1') {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, host, () => resolve(server.address().port));
  });
}

function close(server) {
  return new Promise((resolve) => {
    server.closeAllConnections?.();
    server.close(() => resolve());
  });
}

/** Serveur voisin : `next dev` d'un autre projet, sans `APP_TOKEN`. */
function createNeighbourServer() {
  return http.createServer((request, response) => {
    response.writeHead(307, { location: '/login' });
    response.end();
  });
}

/** Notre serveur : 404 sans jeton (proxy.ts), 307 avec jeton. */
function createOwnServer() {
  return http.createServer((request, response) => {
    if (request.headers['x-app-token'] !== TOKEN) {
      response.writeHead(404);
      response.end();
      return;
    }

    response.writeHead(307, { location: '/login' });
    response.end();
  });
}

async function main() {
  const neighbour = createNeighbourServer();
  const neighbourPort = await listen(neighbour, BASE_PORT);

  // 1. Le port tenu sur la boucle locale ne doit plus être déclaré libre.
  const found = await findFreePort(BASE_PORT);
  check(
    'findFreePort ignore le port tenu sur 127.0.0.1',
    found !== neighbourPort,
    `voisin sur ${neighbourPort}, port retenu ${found}`,
  );

  // 2. Le serveur voisin est démasqué, pas adopté.
  const foreign = await identifyServer(`http://127.0.0.1:${neighbourPort}/`, { token: TOKEN });
  check(
    'identifyServer démasque le serveur voisin',
    foreign.ours === false && foreign.foreign === true,
    JSON.stringify(foreign),
  );

  const foreignOutcome = await waitForServer(`http://127.0.0.1:${neighbourPort}/`, {
    token: TOKEN,
    retries: 3,
    delayMs: 10,
  });
  check(
    "waitForServer n'accepte pas le serveur voisin",
    foreignOutcome.ready === false && foreignOutcome.foreign === true,
    JSON.stringify(foreignOutcome),
  );

  // 3. Scénario complet : notre serveur démarre sur le port suivant.
  const own = createOwnServer();
  const ownPort = await listen(own, found);

  const ownOutcome = await waitForServer(`http://127.0.0.1:${ownPort}/`, {
    token: TOKEN,
    retries: 3,
    delayMs: 10,
  });
  check(
    'waitForServer accepte notre application',
    ownOutcome.ready === true,
    JSON.stringify(ownOutcome),
  );
  check(
    "l'application démarre sur un port différent du voisin",
    ownPort !== neighbourPort && ownPort >= neighbourPort,
    `voisin ${neighbourPort}, application ${ownPort}`,
  );

  // 4. Un socket qui accepte sans jamais répondre ne doit pas bloquer la sonde.
  const silent = net.createServer(() => {
    // Volontairement muet : ni réponse, ni fermeture.
  });
  const silentPort = await listen(silent, ownPort + 1);

  const silentStartedAt = Date.now();
  const silentOutcome = await waitForServer(`http://127.0.0.1:${silentPort}/`, {
    token: TOKEN,
    retries: 2,
    delayMs: 10,
    timeoutMs: 300,
  });
  const silentElapsed = Date.now() - silentStartedAt;
  check(
    'waitForServer ne bloque pas sur un socket muet',
    silentOutcome.ready === false && silentElapsed < 5000,
    `${silentElapsed} ms, ${JSON.stringify(silentOutcome)}`,
  );

  // 5. Port fermé : erreur normale, pas d'exception.
  const refused = await identifyServer(`http://127.0.0.1:${silentPort + 1}/`, {
    token: TOKEN,
    timeoutMs: 300,
  });
  check(
    'identifyServer gère un port fermé',
    refused.ours === false && refused.foreign === false,
    JSON.stringify(refused),
  );

  await Promise.all([close(neighbour), close(own), close(silent)]);
}

main()
  .then(() => {
    const failed = checks.filter((entry) => !entry.passed);
    console.log(`\n${checks.length - failed.length}/${checks.length} vérifications réussies.`);

    if (failed.length > 0) {
      console.error('\nÉchecs :');
      for (const entry of failed) console.error(` - ${entry.name} (${entry.detail})`);
      process.exit(1);
    }

    process.exit(0);
  })
  .catch((error) => {
    console.error('\nVérification interrompue :', error);
    process.exit(1);
  });
