'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { SurfaceCard } from '@/components/surface-card';

type CustomerType = {
  id: number;
  name: string;
  description: string | null;
  createdAt: string | null;
};

export default function ClientTypesPage() {
  const [types, setTypes] = useState<CustomerType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingType, setEditingType] = useState<CustomerType | null>(null);

  useEffect(() => {
    fetchTypes();
  }, []);

  const fetchTypes = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/clients/types');
      const data = await res.json();
      setTypes(data);
    } catch (error) {
      console.error('Error fetching types:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type ?')) return;
    
    try {
      const res = await fetch(`/api/clients/types/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTypes();
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting type:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Types de clients"
        title="Gestion des types de clients"
        description="Définir et gérer les catégories de clients (particulier, entreprise, etc.)"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
          >
            + Nouveau types
          </button>
        }
      />

      <SurfaceCard title="" description="">
        {isLoading ? (
          <div className="py-8 text-center text-slate-500">Chargement...</div>
        ) : types.length === 0 ? (
          <div className="py-8 text-center text-slate-500">Aucun type de client trouvé</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((type) => (
              <div
                key={type.id}
                className="rounded-lg border border-slate-200 p-4 hover:border-sky-300"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-slate-900">{type.name}</h3>
                    {type.description && (
                      <p className="mt-1 text-sm text-slate-500">{type.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingType(type)}
                      className="text-slate-400 hover:text-sky-600"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="text-slate-400 hover:text-red-600"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>

      {/* Add Modal */}
      {showAddModal && (
        <TypeModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            fetchTypes();
          }}
        />
      )}

      {/* Edit Modal */}
      {editingType && (
        <TypeModal
          type={editingType}
          onClose={() => setEditingType(null)}
          onSuccess={() => {
            setEditingType(null);
            fetchTypes();
          }}
        />
      )}
    </div>
  );
}

function TypeModal({
  type,
  onClose,
  onSuccess,
}: {
  type?: CustomerType;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    name: type?.name || '',
    description: type?.description || '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const url = type ? `/api/clients/types/${type.id}` : '/api/clients/types';
      const method = type ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description || null,
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');

      onSuccess();
    } catch (err) {
      setError('Erreur lors de la sauvegarde du type');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {type ? 'Modifier le type' : 'Nouveau type de client'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Nom *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              placeholder="Ex: Particulier, Entreprise"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
              rows={2}
              placeholder="Description optionnelle..."
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
            >
              {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}