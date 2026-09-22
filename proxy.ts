import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/setup'];

const publicPrefixes = ['/_next', '/favicon', '/api/auth', '/logo'];

/**
 * Jeton d'accès à l'application.
 *
 * Défini uniquement par l'application desktop : `electron/main.js` le génère à
 * chaque lancement et le transmet au serveur Next par variable
 * d'environnement, puis l'injecte dans chaque requête de la fenêtre via
 * `webRequest.onBeforeSendHeaders`.
 *
 * Quand il est défini, toute requête qui ne le porte pas reçoit un 404 : le
 * serveur n'est plus utilisable depuis un navigateur, y compris sur localhost.
 * En `next dev` la variable est absente, donc la vérification est ignorée et
 * le développement reste normal.
 *
 * Note : en Next 16 le proxy s'exécute dans le runtime Node.js (et non Edge),
 * donc cette variable est bien lue à l'exécution et non figée au build.
 */
const APP_TOKEN = process.env.APP_TOKEN;
const APP_TOKEN_HEADER = 'x-app-token';

let tokenRejectionLogged = false;

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Vérification du jeton AVANT tout le reste : aucune route n'y échappe,
  // pas même la page de connexion ni les ressources statiques.
  if (APP_TOKEN && request.headers.get(APP_TOKEN_HEADER) !== APP_TOKEN) {
    if (!tokenRejectionLogged) {
      tokenRejectionLogged = true;
      console.warn(
        `[proxy] Requête refusée (jeton absent ou invalide) sur ${pathname}. ` +
          "Attendu : en-tête x-app-token injecté par la fenêtre Electron.",
      );
    }
    // 404 et non 401/403 : un navigateur n'apprend même pas que l'app existe.
    return new NextResponse(null, { status: 404 });
  }

  // Toujours autoriser les ressources statiques et les routes publiques
  if (publicRoutes.includes(pathname)) {
    return NextResponse.next();
  }

  // Autoriser les préfixes publics
  for (const prefix of publicPrefixes) {
    if (pathname.startsWith(prefix)) {
      return NextResponse.next();
    }
  }

  // API routes : vérifier le cookie de session
  if (pathname.startsWith('/api/')) {
    const sessionUser = request.cookies.get('session_user');
    if (!sessionUser?.value) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }
    return NextResponse.next();
  }

  // Pages : vérifier le cookie de session
  const sessionUser = request.cookies.get('session_user');
  if (!sessionUser?.value) {
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Tout passe par le proxy, y compris `_next/static` : le jeton est injecté
    // sur chaque requête de la fenêtre Electron, donc rien ne casse côté app,
    // et un navigateur ne peut charger strictement aucune ressource.
    '/(.*)',
  ],
};
