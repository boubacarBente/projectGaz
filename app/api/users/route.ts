import { NextRequest, NextResponse } from 'next/server';
import { listUsers, createUser, deleteUser, getUserByName } from '@/lib/auth';
import { cookies } from 'next/headers';

async function checkAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get('session_user');
  if (!sessionUser?.value) return false;
  try {
    const user = JSON.parse(sessionUser.value);
    return user.role === 'admin';
  } catch {
    return false;
  }
}

export async function GET() {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const usersList = await listUsers();
  return NextResponse.json(usersList);
}

export async function POST(request: NextRequest) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  try {
    const { name, password, role } = await request.json();

    if (!name || !password) {
      return NextResponse.json({ error: 'Nom et mot de passe requis' }, { status: 400 });
    }

    const existing = await getUserByName(name);
    if (existing) {
      return NextResponse.json({ error: 'Un utilisateur avec ce nom existe déjà' }, { status: 409 });
    }

    const user = await createUser(name, password, role || 'user');
    return NextResponse.json({ id: user.id, name: user.name, role: user.role });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
