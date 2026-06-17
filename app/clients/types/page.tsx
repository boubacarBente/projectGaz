'use client';

import { useState, useEffect } from 'react';
import { PageHeader } from '@/components/page-header';
import { SurfaceCard } from '@/components/surface-card';
import { Modal } from '@/components/modal';

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

  const isModalOpen = showAddModal || editingType !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Types de clients"
        title="Gestion des types de clients"
        description="Définir et gérer les catégories de clients (particulier, entreprise, etc.)"
        actions={
          <button
            onClick={() => setShowAddModal(true)}
            className="btn btn-primary gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau type
          </button>
        }
      />

      <SurfaceCard title="" description="">
        {isLoading ? (
          <div className="py-8 text-center text-base-content/60">Chargement...</div>
        ) : types.length === 0 ? (
          <div className="py-8 text-center text-base-content/60">Aucun type de client trouvé</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {types.map((type) => (
              <div
                key={type.id}
                className="rounded-lg border border-base-200 p-4 hover:border-sky-300 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-base-content">{type.name}</h3>
                    {type.description && (
                      <p className="mt-1 text-sm text-base-content/60">{type.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingType(type)}
                      className="text-base-content/50 hover:text-sky-600"
                      title="Modifier"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(type.id)}
                      className="text-base-content/50 hover:text-red-600"
                      title="Supprimer"
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

      {/* Add / Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setShowAddModal(false);
          setEditingType(null);
        }}
        title={editingType ? 'Modifier le type' : 'Nouveau type de client'}
        size="sm"
      >
        <TypeForm
          type={editingType ?? undefined}
          onSuccess={() => {
            setShowAddModal(false);
            setEditingType(null);
            fetchTypes();
          }}
        />
      </Modal>
    </div>
  );
}

function TypeForm({
  type,
  onSuccess,
}: {
  type?: CustomerType;
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
    } catch {
      setError('Erreur lors de la sauvegarde du type');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-base-content/80">
          Nom *
        </label>
        <input
          type="text"
          required
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input input-bordered w-full rounded-xl"
          placeholder="Ex: Particulier, Entreprise"
          autoFocus
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-base-content/80">
          Description
        </label>
        <textarea
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="textarea textarea-bordered w-full rounded-xl"
          rows={2}
          placeholder="Description optionnelle..."
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end gap-3 pt-2 border-t border-base-200">
        <button type="button" onClick={onSuccess} className="btn btn-ghost rounded-xl">
          Annuler
        </button>
        <button type="submit" disabled={isSubmitting} className="btn btn-primary rounded-xl">
          {isSubmitting ? <span className="loading loading-spinner loading-sm" /> : 'Sauvegarder'}
        </button>
      </div>
    </form>
  );
}