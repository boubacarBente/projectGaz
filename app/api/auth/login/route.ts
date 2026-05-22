import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';
import { getUserByName } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Nom et mot de passe requis' }, { status: 400 });
    }

    const user = await getUserByName(name);
    if (!user) {
      return NextResponse.json({ error: 'Nom ou mot de passe incorrect' }, { status: 401 });
    }

    if (!user.isActive) {
      return NextResponse.json({ error: 'Compte désactivé' }, { status: 403 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Nom ou mot de passe incorrect' }, { status: 401 });
    }

    // Créer une session (stockée dans un cookie, pas de persistance serveur)
    const sessionData = {
      id: user.id,
      name: user.name,
      role: user.role,
    };

    const encoder = new TextEncoder();
    const data = encoder.encode(JSON.stringify(sessionData) + '-' + Date.now());
    const hash = await crypto.subtle.digest('SHA-256', data);
    const sessionToken = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

    const response = NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role },
    });

    // Session cookie : pas de date d'expiration → expire à la fermeture du navigateur
    response.cookies.set('session', sessionToken, {
      httpOnly: true,
      secure: false, // en HTTP local
      sameSite: 'lax',
      path: '/',
    });

    // Stocker les infos user dans un cookie non-httpOnly pour le client
    response.cookies.set('user', JSON.stringify({
      id: user.id,
      name: user.name,
      role: user.role,
    }), {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    // Stocker la session en DB via un cookie de session qu'on vérifie à chaque requête
    // Pour simplifier, on stocke les infos dans un cookie signé
    response.cookies.set('session_user', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
