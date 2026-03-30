'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { PageHeader } from '@/components/page-header';

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

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  if (!isOpen) return null;
  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };
  return (
    <div className="modal modal-open">
      <div className={`modal-box ${sizeClasses[size]} w-full`}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost">✕</button>
        </div>
        <div className="py-4">{children}</div>
      </div>
      <div className="modal-backdrop" onClick={onClose} />
    </div>
  );
}

interface ClientFormData { name: string; phone: string; email: string; address: string; city: string; typeId: string; notes: string; }
const initialFormData: ClientFormData = { name: '', phone: '', email: '', address: '', city: '', typeId: '', notes: '' };

export default function ClientsPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerTypes, setCustomerTypes] = useState<CustomerType[]>([]);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<ClientFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchCustomers(); }, [search, selectedType]);
  useEffect(() => { fetchCustomerTypes(); }, []);

  const fetchCustomers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (selectedType) params.set('typeId', selectedType);
      const res = await fetch(`/api/clients?${params}`);
      const data = await res.json();
      setCustomers(data);
    } catch { toast.error('Erreur lors du chargement des clients'); }
    finally { setIsLoading(false); }
  };

  const fetchCustomerTypes = async () => {
    try {
      const res = await fetch('/api/clients/types');
      const data = await res.json();
      setCustomerTypes(data);
    } catch (error) { console.error('Error:', error); }
  };

  const resetForm = () => setFormData(initialFormData);

  const handleAddClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, phone: formData.phone || null, email: formData.email || null, address: formData.address || null, city: formData.city || null, typeId: formData.typeId ? parseInt(formData.typeId) : null, notes: formData.notes || null }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Client ajouté avec succès!');
      setShowAddModal(false);
      resetForm();
      fetchCustomers();
    } catch { toast.error('Erreur lors de la création'); }
    finally { setIsSubmitting(false); }
  };

  const handleEditClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${selectedCustomer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formData.name, phone: formData.phone || null, email: formData.email || null, address: formData.address || null, city: formData.city || null, typeId: formData.typeId ? parseInt(formData.typeId) : null, notes: formData.notes || null }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Client modifié avec succès!');
      setShowEditModal(false);
      setSelectedCustomer(null);
      resetForm();
      fetchCustomers();
    } catch { toast.error('Erreur lors de la modification'); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteClient = async () => {
    if (!selectedCustomer) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/clients/${selectedCustomer.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Client supprimé avec succès!');
      setShowDeleteModal(false);
      setSelectedCustomer(null);
      fetchCustomers();
    } catch { toast.error('Erreur lors de la suppression'); }
    finally { setIsSubmitting(false); }
  };

  const openEditModal = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({ name: customer.name, phone: customer.phone || '', email: customer.email || '', address: customer.address || '', city: customer.city || '', typeId: customer.typeId?.toString() || '', notes: customer.notes || '' });
    setShowEditModal(true);
  };

  const openDeleteModal = (customer: Customer) => { setSelectedCustomer(customer); setShowDeleteModal(true); };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-MA', { style: 'currency', currency: 'MAD' }).format(amount);
  const topCustomers = [...customers].sort((a, b) => b.totalPurchases - a.totalPurchases).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Clients" title="Gestion des clients" description="Consultation et gestion de la clientèle avec recherche rapide et identification des meilleurs comptes." actions={
        <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn btn-primary gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Nouveau client
        </button>
      } />

      <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-lg shadow-slate-200/60 backdrop-blur">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="relative flex-1 max-w-md">
            <input type="text" placeholder="Rechercher un client..." value={search} onChange={(e) => setSearch(e.target.value)} className="input input-bordered w-full pl-10" />
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>
          <select value={selectedType} onChange={(e) => setSelectedType(e.target.value)} className="select select-bordered w-full md:w-48">
            <option value="">Tous les types</option>
            {customerTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stats shadow"><div className="stat"><div className="stat-title">Total Clients</div><div className="stat-value text-primary">{customers.length}</div><div className="stat-desc">Clients enregistrés</div></div></div>
        <div className="stats shadow"><div className="stat"><div className="stat-title">Clients Actifs</div><div className="stat-value text-success">{customers.filter(c => c.isActive).length}</div><div className="stat-desc">Clients en activité</div></div></div>
        <div className="stats shadow"><div className="stat"><div className="stat-title">Achats Totaux</div><div className="stat-value text-info">{formatCurrency(customers.reduce((sum, c) => sum + c.totalPurchases, 0))}</div><div className="stat-desc">Volume d&apos;achats</div></div></div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/80 bg-white/75 shadow-lg shadow-slate-200/60 backdrop-blur">
          <div className="border-b border-slate-200 p-4"><h3 className="font-semibold text-lg">Liste des clients</h3></div>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="flex items-center justify-center p-8"><span className="loading loading-spinner loading-lg text-primary"></span></div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                <p>Aucun client trouvé</p>
              </div>
            ) : (
              <table className="table">
                <thead><tr className="bg-slate-50"><th className="font-semibold">Client</th><th className="font-semibold">Contact</th><th className="font-semibold">Ville</th><th className="font-semibold">Type</th><th className="font-semibold text-right">Achats</th><th className="font-semibold text-center">Actions</th></tr></thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-slate-50">
                      <td><div className="flex items-center gap-3"><div className="avatar placeholder"><div className="bg-primary text-primary-content w-10 rounded-full"><span className="text-lg">{customer.name.charAt(0).toUpperCase()}</span></div></div><div><div className="font-semibold">{customer.name}</div><div className="text-xs text-slate-500">{customer.isActive ? <span className="badge badge-success badge-xs">Actif</span> : <span className="badge badge-ghost badge-xs">Inactif</span>}</div></div></div></td>
                      <td><div className="text-sm">{customer.phone && <div className="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>{customer.phone}</div>}{customer.email && <div className="flex items-center gap-1 text-slate-500"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{customer.email}</div>}</div></td>
                      <td>{customer.city || '-'}</td>
                      <td>{customer.type ? <span className="badge badge-outline">{customer.type.name}</span> : <span className="text-slate-400">-</span>}</td>
                      <td className="text-right font-semibold text-primary">{formatCurrency(customer.totalPurchases)}</td>
                      <td><div className="flex justify-center gap-2"><button onClick={() => openEditModal(customer)} className="btn btn-ghost btn-sm" title="Modifier"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button><button onClick={() => openDeleteModal(customer)} className="btn btn-ghost btn-sm" title="Supprimer"><svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 rounded-2xl border border-white/80 bg-white/75 shadow-lg shadow-slate-200/60 backdrop-blur">
          <div className="border-b border-slate-200 p-4"><h3 className="font-semibold text-lg flex items-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" /></svg>Top Clients</h3></div>
          <div className="p-4 space-y-4">
            {topCustomers.length === 0 ? <p className="text-center text-slate-500 py-4">Aucun client</p> : topCustomers.map((customer, index) => (
              <div key={customer.id} className="flex items-center gap-3">
                <div className={`avatar placeholder ${index === 0 ? 'online' : ''}`}><div className={`w-10 rounded-full ${index === 0 ? 'bg-warning text-warning-content' : index === 1 ? 'bg-slate-400 text-slate-900' : index === 2 ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-700'}`}><span className="text-lg font-bold">#{index + 1}</span></div></div>
                <div className="flex-1 min-w-0"><p className="font-semibold truncate">{customer.name}</p><p className="text-xs text-slate-500">{customer.city || 'N/A'}</p></div>
                <span className="font-bold text-primary text-sm">{formatCurrency(customer.totalPurchases)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); resetForm(); }} title="Ajouter un nouveau client" size="lg">
        <form onSubmit={handleAddClient} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control"><label className="label"><span className="label-text font-medium">Nom *</span></label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input input-bordered" placeholder="Nom du client" /></div>
            <div className="form-control"><label className="label"><span className="label-text font-medium">Téléphone</span></label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input input-bordered" placeholder="+212 6XX-XXXXXX" /></div>
            <div className="form-control"><label className="label"><span className="label-text font-medium">Email</span></label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input input-bordered" placeholder="email@exemple.com" /></div>
            <div className="form-control"><label className="label"><span className="label-text font-medium">Ville</span></label><input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="input input-bordered" placeholder="Ville" /></div>
            <div className="form-control md:col-span-2"><label className="label"><span className="label-text font-medium">Adresse</span></label><input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input input-bordered" placeholder="Adresse complète" /></div>
            <div className="form-control md:col-span-2"><label className="label"><span className="label-text font-medium">Type de client</span></label><select value={formData.typeId} onChange={(e) => setFormData({ ...formData, typeId: e.target.value })} className="select select-bordered"><option value="">Sélectionner un type</option>{customerTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div>
            <div className="form-control md:col-span-2"><label className="label"><span className="label-text font-medium">Notes</span></label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="textarea textarea-bordered" rows={3} placeholder="Notes supplémentaires..." /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => { setShowAddModal(false); resetForm(); }} className="btn btn-ghost">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">{isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>Ajouter</>}</button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={showEditModal} onClose={() => { setShowEditModal(false); setSelectedCustomer(null); resetForm(); }} title={selectedCustomer ? `Modifier: ${selectedCustomer.name}` : 'Modifier client'} size="lg">
        <form onSubmit={handleEditClient} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control"><label className="label"><span className="label-text font-medium">Nom *</span></label><input type="text" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="input input-bordered" placeholder="Nom du client" /></div>
            <div className="form-control"><label className="label"><span className="label-text font-medium">Téléphone</span></label><input type="tel" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} className="input input-bordered" placeholder="+212 6XX-XXXXXX" /></div>
            <div className="form-control"><label className="label"><span className="label-text font-medium">Email</span></label><input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="input input-bordered" placeholder="email@exemple.com" /></div>
            <div className="form-control"><label className="label"><span className="label-text font-medium">Ville</span></label><input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="input input-bordered" placeholder="Ville" /></div>
            <div className="form-control md:col-span-2"><label className="label"><span className="label-text font-medium">Adresse</span></label><input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="input input-bordered" placeholder="Adresse complète" /></div>
            <div className="form-control md:col-span-2"><label className="label"><span className="label-text font-medium">Type de client</span></label><select value={formData.typeId} onChange={(e) => setFormData({ ...formData, typeId: e.target.value })} className="select select-bordered"><option value="">Sélectionner un type</option>{customerTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></div>
            <div className="form-control md:col-span-2"><label className="label"><span className="label-text font-medium">Notes</span></label><textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="textarea textarea-bordered" rows={3} placeholder="Notes supplémentaires..." /></div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => { setShowEditModal(false); setSelectedCustomer(null); resetForm(); }} className="btn btn-ghost">Annuler</button>
            <button type="submit" disabled={isSubmitting} className="btn btn-info">{isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>Enregistrer</>}</button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={showDeleteModal} onClose={() => { setShowDeleteModal(false); setSelectedCustomer(null); }} title="Confirmer la suppression" size="sm">
        <div className="py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-error/10 p-3 rounded-full"><svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
            <p className="text-slate-600">Êtes-vous sûr de vouloir supprimer le client <strong>{selectedCustomer?.name}</strong> ?<br /><span className="text-sm">Cette action est irréversible.</span></p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => { setShowDeleteModal(false); setSelectedCustomer(null); }} className="btn btn-ghost">Annuler</button>
            <button onClick={handleDeleteClient} disabled={isSubmitting} className="btn btn-error">{isSubmitting ? <span className="loading loading-spinner loading-sm"></span> : <><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>Supprimer</>}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}