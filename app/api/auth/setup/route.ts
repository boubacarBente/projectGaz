import { NextResponse } from 'next/server';
import { hasAdminUser, createUser } from '@/lib/auth';

// Route pour créer le premier admin (uniquement si aucun admin n'existe)
export async function POST(request: Request) {
  try {
    let existing;
    try {
      existing = await hasAdminUser();
    } catch (dbErr: any) {
      console.error('[auth] DB error sur hasAdminUser:', dbErr.message);
      return NextResponse.json({
        error: 'Erreur base de données',
        details: dbErr.message
      }, { status: 500 });
    }

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

    let user;
    try {
      user = await createUser(name, password, 'admin');
    } catch (createErr: any) {
      console.error('[auth] Erreur createUser:', createErr.message);
      return NextResponse.json({
        error: 'Erreur création utilisateur',
        details: createErr.message
      }, { status: 500 });
    }

    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (error: any) {
    console.error('[auth] Setup error:', error?.message ?? error);
    return NextResponse.json({
      error: 'Erreur serveur',
      details: error?.message ?? String(error)
    }, { status: 500 });
  }
}

// GET : Vérifier si l'installation est nécessaire
export async function GET() {
  try {
    const existing = await hasAdminUser();
    return NextResponse.json({ needsSetup: !existing });
  } catch (err: any) {
    console.error('[auth] GET /setup a échoué:', err?.message ?? err);
    // En cas d'erreur inattendue, on déclenche le setup par sécurité
    return NextResponse.json({
      needsSetup: true,
      warning: 'Impossible de vérifier l\'existant — setup requis',
      details: err?.message ?? String(err)
    });
  }
}
