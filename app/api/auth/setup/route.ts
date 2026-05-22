import { NextResponse } from 'next/server';
import { hasAdminUser, createUser } from '@/lib/auth';

// Route pour créer le premier admin (uniquement si aucun admin n'existe)
export async function POST(request: Request) {
  try {
    const existing = await hasAdminUser();
    if (existing) {
      return NextResponse.json({ error: 'Un administrateur existe déjà' }, { status: 400 });
    }

    const { name, password } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Nom et mot de passe requis' }, { status: 400 });
    }

    if (password.length < 4) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 4 caractères' }, { status: 400 });
    }

    const user = await createUser(name, password, 'admin');
    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    console.error('Setup error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

// GET : Vérifier si l'installation est nécessaire
export async function GET() {
  const existing = await hasAdminUser();
  return NextResponse.json({ needsSetup: !existing });
}
