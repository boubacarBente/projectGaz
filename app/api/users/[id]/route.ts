import { NextRequest, NextResponse } from 'next/server';
import { getUserById, getUserByName, deleteUser, listUsers } from '@/lib/auth';
import { cookies } from 'next/headers';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

async function getCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get('session_user');
  if (!sessionUser?.value) return null;
  try {
    return JSON.parse(sessionUser.value).id;
  } catch {
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const user = await getUserById(userId);

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  return NextResponse.json({
    id: user.id,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
  });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const currentUserId = await getCurrentUserId();

  // Empêcher la suppression de soi-même
  if (currentUserId === userId) {
    return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même' }, { status: 400 });
  }

  // Empêcher la suppression du dernier admin
  const allUsers = await listUsers();
  const targetUser = allUsers.find(u => u.id === userId);
  if (targetUser?.role === 'admin') {
    const adminCount = allUsers.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Impossible de supprimer le dernier administrateur' }, { status: 400 });
    }
  }

  await deleteUser(userId);
  return NextResponse.json({ success: true });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);
  const body = await request.json();

  // Vérifier que l'utilisateur existe
  const existingUser = await getUserById(userId);
  if (!existingUser) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 });
  }

  // Vérifier l'unicité du nom si modifié
  if (body.name && body.name !== existingUser.name) {
    const nameExists = await getUserByName(body.name);
    if (nameExists) {
      return NextResponse.json({ error: 'Un utilisateur avec ce nom existe déjà' }, { status: 409 });
    }
  }

  // Empêcher la désactivation de soi-même
  const currentUserId = await getCurrentUserId();
  if (currentUserId === userId && body.isActive === false) {
    return NextResponse.json({ error: 'Vous ne pouvez pas désactiver votre propre compte' }, { status: 400 });
  }

  // Empêcher le changement de rôle du dernier admin
  if (body.role && body.role !== existingUser.role && existingUser.role === 'admin') {
    const allUsers = await listUsers();
    const adminCount = allUsers.filter(u => u.role === 'admin').length;
    if (adminCount <= 1) {
      return NextResponse.json({ error: 'Impossible de changer le rôle du dernier administrateur' }, { status: 400 });
    }
  }

  const updateData: Record<string, unknown> = {};
  if (body.name) updateData.name = body.name;
  if (body.role) updateData.role = body.role;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  if (body.password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(body.password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    updateData.passwordHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  await db.update(users).set(updateData).where(eq(users.id, userId));

  return NextResponse.json({ success: true });
}
