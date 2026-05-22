import { NextRequest, NextResponse } from 'next/server';
import { deleteUser, listUsers } from '@/lib/auth';
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await checkAdmin())) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await params;
  const userId = parseInt(id);

  // Empêcher la suppression de soi-même
  const cookieStore = await cookies();
  const sessionUser = cookieStore.get('session_user');
  const currentUser = sessionUser?.value ? JSON.parse(sessionUser.value) : null;
  if (currentUser?.id === userId) {
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
