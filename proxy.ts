import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/setup'];

const publicPrefixes = ['/_next', '/favicon', '/api/auth', '/logo'];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
    // Exclure les fichiers statiques
    '/((?!_next/static|_next/image|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json)).*)',
  ],
};
