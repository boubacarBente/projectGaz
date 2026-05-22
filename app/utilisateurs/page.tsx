'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/auth-provider';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { toast } from 'react-toastify';

// ============================================
// Types
// ============================================
type UserRow = {
  id: number;
  name: string;
  role: string;
  isActive: boolean | null;
  createdAt: Date | null;
};

// ============================================
// PageHeader Component
// ============================================
function PageHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold text-base-content">{title}</h1>
      <p className="text-base-content/60 text-sm mt-1">{description}</p>
    </div>
  );
}

// ============================================
// Modal Component
// ============================================
function Modal({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative bg-base-100 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto border border-base-200"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-base-200">
          <h3 className="font-semibold text-lg text-base-content">{title}</h3>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-square rounded-xl"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-4">{children}</div>
      </motion.div>
    </div>
  );
}

// ============================================
// User Management Page
// ============================================
export default function UtilisateursPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState<UserRow | null>(null);
  const [editUser, setEditUser] = useState<UserRow | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Create form
  const [formName, setFormName] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState<'admin' | 'user'>('user');
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Edit form
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editIsActive, setEditIsActive] = useState(true);
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, authLoading, router]);

  const loadUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch {
      // silent
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading && user?.role === 'admin') {
      loadUsers();
    } else if (!authLoading && !user) {
      setIsLoading(false);
    }
  }, [authLoading, user, loadUsers]);

  // Reset forms
  const resetForm = () => {
    setFormName('');
    setFormPassword('');
    setFormRole('user');
  };

  const resetEditForm = () => {
    setEditUser(null);
    setEditName('');
    setEditPassword('');
    setEditRole('user');
    setEditIsActive(true);
  };

  // ——— CREATE ———
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPassword.trim()) {
      toast.error('Nom et mot de passe requis');
      return;
    }
    if (formPassword.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }
    setFormSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName.trim(), password: formPassword, role: formRole }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success('Utilisateur créé !');
      setShowAddModal(false);
      resetForm();
      loadUsers();
    } catch {
      toast.error('Erreur serveur');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ——— UPDATE ———
  const openEditModal = (u: UserRow) => {
    setEditUser(u);
    setEditName(u.name);
    setEditPassword('');
    setEditRole(u.role as 'admin' | 'user');
    setEditIsActive(u.isActive ?? true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;
    if (!editName.trim()) {
      toast.error('Le nom est requis');
      return;
    }
    if (editPassword && editPassword.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }

    setEditSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        name: editName.trim(),
        role: editRole,
        isActive: editIsActive,
      };
      if (editPassword) {
        body.password = editPassword;
      }

      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success('Utilisateur modifié !');
      resetEditForm();
      loadUsers();
    } catch {
      toast.error('Erreur serveur');
    } finally {
      setEditSubmitting(false);
    }
  };

  // ——— DELETE ———
  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || 'Erreur');
        return;
      }
      toast.success('Utilisateur supprimé');
      setDeleteConfirm(null);
      loadUsers();
    } catch {
      toast.error('Erreur serveur');
    }
  };

  // Loading / non-admin states
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-base-content/40">Vous devez être connecté.</p>
      </div>
    );
  }

  if (user.role !== 'admin') {
    return null; // Will redirect via useEffect
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <PageHeader
        title="Utilisateurs"
        description="Gérez les comptes utilisateurs de l'application"
      />

      {/* Users Table Card */}
      <div className="bg-base-100 border border-base-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-base-200/20 border-b border-base-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/10 text-secondary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-base-content">Liste des utilisateurs</h3>
              <p className="text-xs text-base-content/40">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { resetForm(); setShowAddModal(true); }}
            className="btn btn-primary btn-sm gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Ajouter
          </button>
        </div>
        <div className="p-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <span className="loading loading-spinner loading-md text-primary" />
            </div>
          ) : users.length === 0 ? (
            <p className="text-center py-8 text-base-content/40">Aucun utilisateur</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table table-sm">
                <thead>
                  <tr className="text-base-content/60 text-xs uppercase tracking-wider">
                    <th>Nom</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Créé le</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-base-200/30 transition-colors">
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium">{u.name}</span>
                          {u.id === user?.id && (
                            <span className="badge badge-xs badge-ghost">Vous</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-sm ${u.role === 'admin' ? 'badge-primary' : 'badge-ghost'}`}>
                          {u.role === 'admin' ? 'Admin' : 'Utilisateur'}
                        </span>
                      </td>
                      <td>
                        {u.isActive ? (
                          <span className="text-xs text-success font-medium">Actif</span>
                        ) : (
                          <span className="text-xs text-error font-medium">Inactif</span>
                        )}
                      </td>
                      <td>
                        <span className="text-xs text-base-content/40">
                          {u.createdAt ? new Date(u.createdAt).toLocaleDateString('fr-FR') : '-'}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Detail button */}
                          <button
                            type="button"
                            onClick={() => setShowDetailModal(u)}
                            className="btn btn-xs btn-ghost"
                            title="Détails"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                          {/* Edit button */}
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="btn btn-xs btn-ghost text-info"
                            title="Modifier"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          {/* Delete button — not for self */}
                          {u.id !== user?.id && (
                            deleteConfirm === u.id ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(u.id)}
                                  className="btn btn-xs btn-error gap-1"
                                >
                                  Confirmer
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteConfirm(null)}
                                  className="btn btn-xs btn-ghost"
                                >
                                  Annuler
                                </button>
                              </>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setDeleteConfirm(u.id)}
                                className="btn btn-xs btn-ghost text-error"
                                title="Supprimer"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ——— Add User Modal ——— */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { if (!formSubmitting) { setShowAddModal(false); resetForm(); } }}
        title="Ajouter un utilisateur"
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-base-content/80 mb-1">Nom d&apos;utilisateur</label>
            <input
              type="text"
              value={formName}
              onChange={e => setFormName(e.target.value)}
              className="input input-bordered w-full"
              placeholder="ex: bouba"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content/80 mb-1">Mot de passe</label>
            <input
              type="password"
              value={formPassword}
              onChange={e => setFormPassword(e.target.value)}
              className="input input-bordered w-full"
              placeholder="••••••••"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-base-content/80 mb-1">Rôle</label>
            <select
              value={formRole}
              onChange={e => setFormRole(e.target.value as 'admin' | 'user')}
              className="select select-bordered w-full"
            >
              <option value="user">Simple Utilisateur</option>
              <option value="admin">Administrateur</option>
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setShowAddModal(false); resetForm(); }}
              disabled={formSubmitting}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button type="submit" disabled={formSubmitting} className="btn btn-primary">
              {formSubmitting ? <span className="loading loading-spinner loading-sm" /> : 'Créer'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ——— Detail User Modal ——— */}
      <Modal
        isOpen={showDetailModal !== null}
        onClose={() => setShowDetailModal(null)}
        title="Détails de l'utilisateur"
      >
        {showDetailModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-4 pb-4 border-b border-base-200">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary">
                {showDetailModal.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-lg font-semibold text-base-content">{showDetailModal.name}</p>
                <p className="text-sm text-base-content/40">ID: {showDetailModal.id}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-base-content/40 uppercase tracking-wider font-medium">Rôle</p>
                <span className={`badge badge-sm mt-1 ${showDetailModal.role === 'admin' ? 'badge-primary' : 'badge-ghost'}`}>
                  {showDetailModal.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                </span>
              </div>
              <div>
                <p className="text-xs text-base-content/40 uppercase tracking-wider font-medium">Statut</p>
                <p className="text-sm font-medium mt-1">
                  {showDetailModal.isActive ? (
                    <span className="text-success">Actif</span>
                  ) : (
                    <span className="text-error">Inactif</span>
                  )}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-base-content/40 uppercase tracking-wider font-medium">Date de création</p>
                <p className="text-sm mt-1">
                  {showDetailModal.createdAt
                    ? new Date(showDetailModal.createdAt).toLocaleDateString('fr-FR', {
                        day: 'numeric', month: 'long', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      })
                    : '-'}
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
              <button
                type="button"
                onClick={() => {
                  setShowDetailModal(null);
                  openEditModal(showDetailModal);
                }}
                className="btn btn-primary btn-sm"
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => setShowDetailModal(null)}
                className="btn btn-ghost btn-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ——— Edit User Modal ——— */}
      <Modal
        isOpen={editUser !== null}
        onClose={() => { if (!editSubmitting) resetEditForm(); }}
        title="Modifier l'utilisateur"
      >
        {editUser && (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="flex items-center gap-3 mb-4 pb-3 border-b border-base-200">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {editUser.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-base-content">{editUser.name}</p>
                <p className="text-xs text-base-content/60">ID: {editUser.id}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-base-content/80 mb-1">Nom d&apos;utilisateur</label>
              <input
                type="text"
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="input input-bordered w-full"
                autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-base-content/80 mb-1">
                Nouveau mot de passe
                <span className="text-xs text-base-content/40 ml-1">(laisser vide pour conserver l&apos;actuel)</span>
              </label>
              <input
                type="password"
                value={editPassword}
                onChange={e => setEditPassword(e.target.value)}
                className="input input-bordered w-full"
                placeholder="••••••••"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-base-content/80 mb-1">Rôle</label>
              <select
                value={editRole}
                onChange={e => setEditRole(e.target.value as 'admin' | 'user')}
                className="select select-bordered w-full"
              >
                <option value="user">Utilisateur</option>
                <option value="admin">Administrateur</option>
              </select>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <label className="label cursor-pointer justify-start gap-3">
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={e => setEditIsActive(e.target.checked)}
                  className="checkbox checkbox-primary checkbox-sm"
                />
                <span className="label-text font-medium text-sm">Actif</span>
              </label>
            </div>
            <div className="flex justify-end gap-3 pt-2 border-t border-base-200">
              <button
                type="button"
                onClick={resetEditForm}
                disabled={editSubmitting}
                className="btn btn-ghost"
              >
                Annuler
              </button>
              <button type="submit" disabled={editSubmitting} className="btn btn-primary">
                {editSubmitting ? <span className="loading loading-spinner loading-sm" /> : 'Enregistrer'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </motion.div>
  );
}
