'use client';

import { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { SurfaceCard } from '@/components/surface-card';

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



export default function ClientsPage() {
  // Client management page
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [showAddModal, setShowAddModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    city: '',
    typeId: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const onClose = function () { }
    const onSuccess = function () { }

    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          phone: formData.phone || null,
          email: formData.email || null,
          address: formData.address || null,
          city: formData.city || null,
          typeId: formData.typeId ? parseInt(formData.typeId) : null,
          notes: formData.notes || null,
        }),
      });

      if (!res.ok) throw new Error('Erreur lors de la création');

      onSuccess();
    } catch (err) {
      setError('Erreur lors de la création du client');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Fetch customers
  useEffect(() => {
    async function fetchCustomers() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (selectedType) params.set('typeId', selectedType);

        const res = await fetch(`/api/clients?${params}`);
        const data = await res.json();
        setCustomers(data);
      } catch (error) {
        console.error('Error fetching customers:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchCustomers();
  }, [search, selectedType]);

  // Fetch customer types
  useEffect(() => {
    async function fetchTypes() {
      try {
        const res = await fetch('/api/clients/types');
        const data = await res.json();
        setCustomerTypes(data);
      } catch (error) {
        console.error('Error fetching types:', error);
      }
    }
    fetchTypes();
  }, []);

  const handleSearch = (value: string) => {
    startTransition(() => {
      setSearch(value);
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(amount);
  };

  // Top customers
  const topCustomers = [...customers]
    .sort((a, b) => b.totalPurchases - a.totalPurchases)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Clients"
        title="Gestion des clients"
        description="Consultation et gestion de la clientèle avec recherche rapide et identification des meilleurs comptes."
        actions={
          <div className="">
            <button
              onClick={() => setShowAddModal(true)}
              className="rounded-full bg-sky-700 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-800"
            >
              + Nouveau client
            </button>
            <button className="btn" onClick={() => (document.getElementById('my_modal_3') as HTMLDialogElement).showModal()}>open modal</button>
          </div>

        }
      />
      <dialog id="my_modal_3" className="modal">
        <div className="modal-box">
          <form method="dialog">
            {/* if there is a button in form, it will close the modal */}
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
            <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-semibold">Nouveau client</h2>

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
                    placeholder="Nom du client"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="+224 6XX-XXXXXX"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="email@exemple.com"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Adresse
                  </label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="Adresse"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Ville
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                    placeholder="Ville"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Type de client
                  </label>
                  <select
                    value={formData.typeId}
                    onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                  >
                    <option value="">Sélectionner un type</option>
                    {/* {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))} */}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
                    rows={2}
                    placeholder="Notes supplémentaires..."
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={function () { }}
                    className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
                  >
                    {isSubmitting ? 'Création...' : 'Créer'}
                  </button>
                </div>
              </form>
          </div>
        </div>
      </dialog>
      <div className="grid gap-6 xl:grid-cols-[1.25fr_0.95fr]">
        {/* Main Content - Customers Table */}
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="flex gap-4">
            <input
              type="text"
              placeholder="Rechercher par nom ou téléphone..."
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none"
            />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm focus:border-sky-500 focus:outline-none"
            >
              <option value="">Tous les types</option>
              {customerTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <SurfaceCard title="" description="">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left">
                    <th className="pb-3 font-medium text-slate-600">Nom</th>
                    <th className="pb-3 font-medium text-slate-600">Téléphone</th>
                    <th className="pb-3 font-medium text-slate-600">Ville</th>
                    <th className="pb-3 font-medium text-slate-600">Type</th>
                    <th className="pb-3 font-medium text-slate-600 text-right">Total achats</th>
                    <th className="pb-3 font-medium text-slate-600">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Chargement...
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500">
                        Aucun client trouvé
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="py-3">
                          <Link
                            href={`/clients/${customer.id}`}
                            className="font-medium text-sky-700 hover:underline"
                          >
                            {customer.name}
                          </Link>
                        </td>
                        <td className="py-3 text-slate-600">{customer.phone || '-'}</td>
                        <td className="py-3 text-slate-600">{customer.city || '-'}</td>
                        <td className="py-3">
                          {customer.type ? (
                            <span className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs">
                              {customer.type.name}
                            </span>
                          ) : (
                            '-'
                          )}
                        </td>
                        <td className="py-3 text-right font-medium">
                          {formatCurrency(customer.totalPurchases)}
                        </td>
                        <td className="py-3">
                          <span
                            className={`inline-block rounded-full px-2 py-1 text-xs ${customer.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-slate-100 text-slate-600'
                              }`}
                          >
                            {customer.isActive ? 'Actif' : 'Inactif'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </SurfaceCard>
        </div>

        {/* Sidebar - Top Customers */}
        <SurfaceCard
          title="Meilleurs clients"
          description="Top 5 par montant d'achats cumulés"
        >
          <div className="space-y-3">
            {topCustomers.length === 0 ? (
              <p className="text-sm text-slate-500">Aucun client</p>
            ) : (
              topCustomers.map((customer, index) => (
                <div
                  key={customer.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-white p-3"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${index === 0
                        ? 'bg-amber-100 text-amber-800'
                        : index === 1
                          ? 'bg-slate-100 text-slate-600'
                          : index === 2
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-slate-50 text-slate-500'
                        }`}
                    >
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-medium text-slate-900">{customer.name}</p>
                      <p className="text-xs text-slate-500">{customer.city || 'N/A'}</p>
                    </div>
                  </div>
                  <span className="font-semibold text-sky-700">
                    {formatCurrency(customer.totalPurchases)}
                  </span>
                </div>
              ))
            )}
          </div>
        </SurfaceCard>
      </div>

      {/* Add Client Modal */}
        {/* {showAddModal && (
          <AddClientModal
            types={customerTypes}
            onClose={() => setShowAddModal(false)}
            onSuccess={() => {
              setShowAddModal(false);
              // Refresh customers
              window.location.reload();
            }}
          />
        )} */}
    </div>
  );
}

// function AddClientModal({
//   types,
//   onClose,
//   onSuccess,
// }: {
//   types: CustomerType[];
//   onClose: () => void;
//   onSuccess: () => void;
// }) {
//   const [formData, setFormData] = useState({
//     name: '',
//     phone: '',
//     email: '',
//     address: '',
//     city: '',
//     typeId: '',
//     notes: '',
//   });
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [error, setError] = useState('');

//   const handleSubmit = async (e: React.SyntheticEvent) => {
//     e.preventDefault();
//     setIsSubmitting(true);
//     setError('');

//     try {
//       const res = await fetch('/api/clients', {
//         method: 'POST',
//         headers: { 'Content-Type': 'application/json' },
//         body: JSON.stringify({
//           name: formData.name,
//           phone: formData.phone || null,
//           email: formData.email || null,
//           address: formData.address || null,
//           city: formData.city || null,
//           typeId: formData.typeId ? parseInt(formData.typeId) : null,
//           notes: formData.notes || null,
//         }),
//       });

//       if (!res.ok) throw new Error('Erreur lors de la création');

//       onSuccess();
//     } catch (err) {
//       setError('Erreur lors de la création du client');
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   return (
//     <>
//       <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
//         <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
//           <div className="mb-4 flex items-center justify-between">
//             <h2 className="text-lg font-semibold">Nouveau client</h2>
//             <button
//               onClick={onClose}
//               className="text-slate-400 hover:text-slate-600"
//             >
//               ✕
//             </button>
//           </div>

//           <form onSubmit={handleSubmit} className="space-y-4">
//             <div>
//               <label className="mb-1 block text-sm font-medium text-slate-700">
//                 Nom *
//               </label>
//               <input
//                 type="text"
//                 required
//                 value={formData.name}
//                 onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//                 className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
//                 placeholder="Nom du client"
//               />
//             </div>

//             <div>
//               <label className="mb-1 block text-sm font-medium text-slate-700">
//                 Téléphone
//               </label>
//               <input
//                 type="tel"
//                 value={formData.phone}
//                 onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
//                 className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
//                 placeholder="+212 6XX-XXXXXX"
//               />
//             </div>

//             <div>
//               <label className="mb-1 block text-sm font-medium text-slate-700">
//                 Email
//               </label>
//               <input
//                 type="email"
//                 value={formData.email}
//                 onChange={(e) => setFormData({ ...formData, email: e.target.value })}
//                 className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
//                 placeholder="email@exemple.com"
//               />
//             </div>

//             <div>
//               <label className="mb-1 block text-sm font-medium text-slate-700">
//                 Adresse
//               </label>
//               <input
//                 type="text"
//                 value={formData.address}
//                 onChange={(e) => setFormData({ ...formData, address: e.target.value })}
//                 className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
//                 placeholder="Adresse"
//               />
//             </div>

//             <div>
//               <label className="mb-1 block text-sm font-medium text-slate-700">
//                 Ville
//               </label>
//               <input
//                 type="text"
//                 value={formData.city}
//                 onChange={(e) => setFormData({ ...formData, city: e.target.value })}
//                 className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
//                 placeholder="Ville"
//               />
//             </div>

//             <div>
//               <label className="mb-1 block text-sm font-medium text-slate-700">
//                 Type de client
//               </label>
//               <select
//                 value={formData.typeId}
//                 onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
//                 className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
//               >
//                 <option value="">Sélectionner un type</option>
//                 {types.map((type) => (
//                   <option key={type.id} value={type.id}>
//                     {type.name}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             <div>
//               <label className="mb-1 block text-sm font-medium text-slate-700">
//                 Notes
//               </label>
//               <textarea
//                 value={formData.notes}
//                 onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
//                 className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none"
//                 rows={2}
//                 placeholder="Notes supplémentaires..."
//               />
//             </div>

//             {error && <p className="text-sm text-red-600">{error}</p>}

//             <div className="flex gap-3 pt-2">
//               <button
//                 type="button"
//                 onClick={onClose}
//                 className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
//               >
//                 Annuler
//               </button>
//               <button
//                 type="submit"
//                 disabled={isSubmitting}
//                 className="flex-1 rounded-lg bg-sky-700 px-4 py-2 text-sm font-medium text-white hover:bg-sky-800 disabled:opacity-50"
//               >
//                 {isSubmitting ? 'Création...' : 'Créer'}
//               </button>
//             </div>
//           </form>
//         </div>
//       </div>
//     </>
//   );
// }
