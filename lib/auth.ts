import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

// Vérifier si au moins un utilisateur admin existe
export async function hasAdminUser(): Promise<boolean> {
  const result = await db.select().from(users).where(eq(users.role, 'admin')).limit(1);
  return result.length > 0;
}

// Récupérer un utilisateur par son nom
export async function getUserByName(name: string) {
  const result = await db.select().from(users).where(eq(users.name, name)).limit(1);
  return result[0] || null;
}

// Récupérer un utilisateur par son id
export async function getUserById(id: number) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] || null;
}

// Lister tous les utilisateurs
export async function listUsers() {
  return db.select({
    id: users.id,
    name: users.name,
    role: users.role,
    isActive: users.isActive,
    createdAt: users.createdAt,
  }).from(users);
}

// Créer un utilisateur
export async function createUser(name: string, password: string, role: 'admin' | 'user' = 'user') {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const passwordHash = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');

  const result = await db.insert(users).values({
    name,
    passwordHash,
    role,
  }).returning();

  return result[0];
}

// Supprimer un utilisateur
export async function deleteUser(id: number) {
  await db.delete(users).where(eq(users.id, id));
}

// Vérifier le mot de passe
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex === storedHash;
}
