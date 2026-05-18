'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { SurfaceCard } from '@/components/surface-card';
import { motion } from 'framer-motion';

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  typeId: number | null;
  totalPurchases: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string | null;
  updatedAt: string | null;
  type: { id: number; name: string; description: string } | null;
};

type CustomerType = {
  id: number;
  name: string;
  description: string | null;
};

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [clientId, setClientId] = useState<string>('');
  const router = useRouter();

  useEffect(() => {
    async function loadParams() {
      const { id } = await params;
      setClientId(id);
    }
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!clientId) return;

    async function fetchCustomer() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/clients/${clientId}`);
        if (res.ok) {
          const data = await res.json();
          setCustomer(data);
        }
      } catch (error) {
        console.error('Error fetching customer:', error);
      } finally {
        setIsLoading(false);
      }
    }

    async function fetchTypes() {
      try {
        const res = await fetch('/api/clients/types');
        const data = await res.json();
        setCustomerTypes(data);
      } catch (error) {
        console.error('Error fetching types:', error);
      }
    }

    fetchCustomer();
    fetchTypes();
  }, [clientId]);

  const handleDelete = async () => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce client ?')) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/clients/${clientId}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/clients');
      } else {
        alert('Erreur lors de la suppression');
      }
    } catch (error) {
      console.error('Error deleting customer:', error);
      alert('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUpdate = async (formData: FormData) => {
    const data = {
      name: formData.get('name') as string,
      phone: formData.get('phone') as string || null,
      email: formData.get('email') as string || null,
      address: formData.get('address') as string || null,
      city: formData.get('city') as string || null,
      typeId: formData.get('typeId') ? parseInt(formData.get('typeId') as string) : null,
      notes: formData.get('notes') as string || null,
    };

    try {
      const res = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (res.ok) {
        const updated = await res.json();
        setCustomer(updated);
        setIsEditing(false);
      } else {
        alert('Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Error updating customer:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'GNF',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-base-content/60">Chargement...</div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="space-y-6">
        <PageHeader
          eyebrow="Erreur"
          title="Client non trouvé"
          description="Le client demandé n'existe pas."
          actions={
            <Link
              href="/clients"
              className="rounded-full border border-base-300 px-5 py-3 text-sm font-semibold text-base-content transition hover:border-sky-300 hover:bg-primary/10"
            >
              Retour aux clients
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Profil client"
        title={customer.name}
        description={customer.type ? `Client ${customer.type.name}` : 'Détails du client'}
        actions={
          <div className="flex gap-3">
            <Link
              href={`/clients/${clientId}/paiements`}
              className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 inline-flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Historique des paiements
            </Link>
            <Link
              href="/clients"
              className="rounded-full border border-base-300 px-5 py-3 text-sm font-semibold text-base-content transition hover:border-sky-300 hover:bg-primary/10"
            >
              Retour
            </Link>
            {!isEditing && (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
                >
                  Modifier
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-full border border-red-300 px-5 py-3 text-sm font-semibold text-red-700 transition hover:bg-red-50"
                >
                  {isDeleting ? 'Suppression...' : 'Supprimer'}
                </button>
              </>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Client Info Card */}
        <SurfaceCard
          title="Informations client"
          description="Détails complets du profil"
        >
          {isEditing ? (
            <form action={handleUpdate} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-base-content/80">Nom *</label>
                <input
                  name="name"
                  defaultValue={customer.name}
                  required
                  className="w-full rounded-lg border border-base-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-base-content/80">Téléphone</label>
                <input
                  name="phone"
                  defaultValue={customer.phone || ''}
                  className="w-full rounded-lg border border-base-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-base-content/80">Email</label>
                <input
                  name="email"
                  type="email"
                  defaultValue={customer.email || ''}
                  className="w-full rounded-lg border border-base-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-base-content/80">Adresse</label>
                <input
                  name="address"
                  defaultValue={customer.address || ''}
                  className="w-full rounded-lg border border-base-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-base-content/80">Ville</label>
                <input
                  name="city"
                  defaultValue={customer.city || ''}
                  className="w-full rounded-lg border border-base-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-base-content/80">Type</label>
                <select
                  name="typeId"
                  defaultValue={customer.typeId || ''}
                  className="w-full rounded-lg border border-base-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                >
                  <option value="">Sélectionner un type</option>
                  {customerTypes.map((type) => (
                    <option key={type.id} value={type.id}>{type.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-base-content/80">Notes</label>
                <textarea
                  name="notes"
                  defaultValue={customer.notes || ''}
                  rows={2}
                  className="w-full rounded-lg border border-base-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-lg border border-base-200 px-4 py-2 text-sm font-medium text-base-content/80 hover:bg-base-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800"
                >
                  Enregistrer
                </button>
              </div>
            </form>
          ) : (
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-base-200 pb-2">
                <dt className="text-base-content/60">Téléphone</dt>
                <dd className="font-medium">{customer.phone || '-'}</dd>
              </div>
              <div className="flex justify-between border-b border-base-200 pb-2">
                <dt className="text-base-content/60">Email</dt>
                <dd className="font-medium">{customer.email || '-'}</dd>
              </div>
              <div className="flex justify-between border-b border-base-200 pb-2">
                <dt className="text-base-content/60">Adresse</dt>
                <dd className="font-medium">{customer.address || '-'}</dd>
              </div>
              <div className="flex justify-between border-b border-base-200 pb-2">
                <dt className="text-base-content/60">Ville</dt>
                <dd className="font-medium">{customer.city || '-'}</dd>
              </div>
              <div className="flex justify-between border-b border-base-200 pb-2">
                <dt className="text-base-content/60">Type</dt>
                <dd className="font-medium">{customer.type?.name || '-'}</dd>
              </div>
              <div className="flex justify-between border-b border-base-200 pb-2">
                <dt className="text-base-content/60">Statut</dt>
                <dd>
                  <span className={`inline-block rounded-full px-2 py-1 text-xs ${customer.isActive ? 'bg-success/20 text-success' : 'bg-base-200 text-base-content/70'}`}>
                    {customer.isActive ? 'Actif' : 'Inactif'}
                  </span>
                </dd>
              </div>
              {customer.notes && (
                <div className="pt-2">
                  <dt className="text-base-content/60">Notes</dt>
                  <dd className="mt-1 text-base-content/80">{customer.notes}</dd>
                </div>
              )}
            </dl>
          )}
        </SurfaceCard>

        {/* Stats Card */}
        <SurfaceCard
          title="Statistiques d'achats"
          description="Historique et montant cumulé"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-sky-50 p-4">
              <div>
                <p className="text-sm text-sky-600">Total des achats</p>
                <p className="text-2xl font-bold text-sky-700">
                  {formatCurrency(customer.totalPurchases)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-full bg-sky-100 flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-base-200 p-3 text-center">
                <p className="text-xs text-base-content/60">Client depuis</p>
                <p className="text-sm font-medium">
                  {customer.createdAt 
                    ? new Date(customer.createdAt).toLocaleDateString('fr-MA')
                    : '-'}
                </p>
              </div>
              <div className="rounded-lg bg-base-200 p-3 text-center">
                <p className="text-xs text-base-content/60">Dernière mise à jour</p>
                <p className="text-sm font-medium">
                  {customer.updatedAt 
                    ? new Date(customer.updatedAt).toLocaleDateString('fr-MA')
                    : '-'}
                </p>
              </div>
            </div>
          </div>
        </SurfaceCard>
      </div>
    </div>
  );
}
