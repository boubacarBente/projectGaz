'use client';

import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';

type SalesInvoiceItem = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type SalesInvoice = {
  id: number;
  invoiceNumber: string;
  customerName: string;
  date: string;
  paymentMethod: string;
  notes: string;
  items: SalesInvoiceItem[];
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: 'Paye' | 'Partiel' | 'En attente';
  createdAt: string;
};

type Product = {
  id: number;
  code: string;
  name: string;
  capacity: string;
  unitPrice: number;
};

type Customer = {
  id: number;
  name: string;
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  const sizeClasses = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -80, scale: 0.95 }}
            transition={{ type: 'spring', duration: 0.5, bounce: 0.2 }}
            className={`modal-box ${sizeClasses[size]} w-full relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto`}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-4 sticky top-0 bg-white z-10">
              <h3 className="text-lg font-bold">{title}</h3>
              <button onClick={onClose} className="btn btn-sm btn-circle btn-ghost hover:bg-slate-100">✕</button>
            </div>
            <div className="py-4">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

interface InvoiceLine {
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface InvoiceFormData {
  customerName: string;
  date: string;
  paymentMethod: string;
  notes: string;
  amountPaid: string;
  lines: InvoiceLine[];
}

const initialFormData: InvoiceFormData = {
  customerName: '',
  date: new Date().toISOString().slice(0, 10),
  paymentMethod: 'Espèces',
  notes: '',
  amountPaid: '0',
  lines: [{ productId: '', quantity: '1', unitPrice: '' }],
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Paye': return 'badge-success';
    case 'Partiel': return 'badge-warning';
    case 'En attente': return 'badge-error';
    default: return 'badge-ghost';
  }
}

export default function FacturesPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [invoicesRes, productsRes, customersRes] = await Promise.all([
        fetch('/api/factures'),
        fetch('/api/produits'),
        fetch('/api/clients'),
      ]);
      const invoicesData = await invoicesRes.json();
      const productsData = await productsRes.json();
      const customersData = await customersRes.json();
      setInvoices(invoicesData);
      setProducts(productsData);
      setCustomers(customersData);
      if (productsData.length > 0) {
        setFormData(prev => ({
          ...prev,
          lines: [{ productId: productsData[0].id.toString(), quantity: '1', unitPrice: productsData[0].unitPrice.toString() }]
        }));
      }
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => setFormData(initialFormData);

  const handleAddInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const lines = formData.lines.map(line => ({
        productId: parseInt(line.productId),
        quantity: parseInt(line.quantity),
        amount: parseFloat(line.unitPrice),
      }));
      const res = await fetch('/api/factures', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          date: formData.date,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes,
          amountPaid: parseFloat(formData.amountPaid) || 0,
          lines,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Facture créée avec succès!');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch {
      toast.error('Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    setIsSubmitting(true);
    try {
      const lines = formData.lines.map(line => ({
        productId: parseInt(line.productId),
        quantity: parseInt(line.quantity),
        amount: parseFloat(line.unitPrice),
      }));
      const res = await fetch(`/api/factures/${selectedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: formData.customerName,
          date: formData.date,
          paymentMethod: formData.paymentMethod,
          notes: formData.notes,
          amountPaid: parseFloat(formData.amountPaid) || 0,
          lines,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Facture modifiée avec succès!');
      setShowEditModal(false);
      setSelectedInvoice(null);
      resetForm();
      fetchData();
    } catch {
      toast.error('Erreur lors de la modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteInvoice = async () => {
    if (!selectedInvoice) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/factures/${selectedInvoice.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Facture supprimée avec succès!');
      setShowDeleteModal(false);
      setSelectedInvoice(null);
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (invoice: SalesInvoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      customerName: invoice.customerName,
      date: invoice.date,
      paymentMethod: invoice.paymentMethod,
      notes: invoice.notes,
      amountPaid: invoice.amountPaid.toString(),
      lines: invoice.items.map(item => ({
        productId: item.productId.toString(),
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
      })),
    });
    setShowEditModal(true);
  };

  const openDetailModal = (invoice: SalesInvoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  const openDeleteModal = (invoice: SalesInvoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteModal(true);
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { productId: products[0]?.id.toString() || '', quantity: '1', unitPrice: products[0]?.unitPrice.toString() || '' }],
    }));
  };

  const removeLine = (index: number) => {
    if (formData.lines.length > 1) {
      setFormData(prev => ({
        ...prev,
        lines: prev.lines.filter((_, i) => i !== index),
      }));
    }
  };

  const updateLine = (index: number, field: keyof InvoiceLine, value: string) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => i === index ? { ...line, [field]: value } : line),
    }));
    if (field === 'productId') {
      const product = products.find(p => p.id.toString() === value);
      if (product) {
        setFormData(prev => ({
          ...prev,
          lines: prev.lines.map((line, i) => i === index ? { ...line, unitPrice: product.unitPrice.toString() } : line),
        }));
      }
    }
  };

  const totalAmount = invoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = invoices.reduce((sum, inv) => sum + inv.amountPaid, 0);
  const totalRemaining = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0);
  const paidInvoices = invoices.filter(inv => inv.paymentStatus === 'Paye').length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Facturation"
        title="Factures de vente"
        description="Gestion des factures de vente aux clients."
        actions={
          <button
            onClick={() => {
              resetForm();
              if (products.length > 0) {
                setFormData(prev => ({
                  ...prev,
                  lines: [{ productId: products[0].id.toString(), quantity: '1', unitPrice: products[0].unitPrice.toString() }]
                }));
              }
              setShowAddModal(true);
            }}
            className="btn btn-primary gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle vente
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total ventes</div>
            <div className="stat-value text-info">{formatCurrency(totalAmount)}</div>
            <div className="stat-desc">MAD</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Encaisse</div>
            <div className="stat-value text-success">{formatCurrency(totalPaid)}</div>
            <div className="stat-desc">MAD</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Reste à payer</div>
            <div className="stat-value text-warning">{formatCurrency(totalRemaining)}</div>
            <div className="stat-desc">MAD</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Factures payées</div>
            <div className="stat-value">{paidInvoices}/{invoices.length}</div>
            <div className="stat-desc">Payees</div>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Historique des ventes</h3>
          <p className="text-sm text-slate-500">{invoices.length} facture(s) enregistrée(s)</p>
        </div>
        
        {invoices.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-slate-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-slate-600">Aucune vente enregistrée.</p>
            <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm mt-4">
              Créer une première facture
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>N° Facture</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Encaisse</th>
                  <th>Reste</th>
                  <th>Statut</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="font-medium">{invoice.invoiceNumber}</td>
                    <td>{invoice.customerName}</td>
                    <td>{new Date(invoice.date).toLocaleDateString('fr-MA')}</td>
                    <td className="font-semibold">{formatCurrency(invoice.totalAmount)}</td>
                    <td className="text-success">{formatCurrency(invoice.amountPaid)}</td>
                    <td className={invoice.remainingAmount > 0 ? 'text-warning font-medium' : ''}>
                      {formatCurrency(invoice.remainingAmount)}
                    </td>
                    <td>
                      <span className={`badge ${getStatusColor(invoice.paymentStatus)} badge-sm`}>
                        {invoice.paymentStatus}
                      </span>
                    </td>
                    <td className="text-right">
                      <div className="flex gap-1 justify-end">
                        <button onClick={() => openDetailModal(invoice)} className="btn btn-ghost btn-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button onClick={() => openEditModal(invoice)} className="btn btn-ghost btn-xs">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => openDeleteModal(invoice)} className="btn btn-ghost btn-xs text-error">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nouvelle facture de vente" size="xl">
        <form onSubmit={handleAddInvoice} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Client *</span>
              </label>
              <input
                type="text"
                required
                list="customers-list"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="input input-bordered"
                placeholder="Nom du client"
              />
              <datalist id="customers-list">
                {customers.map(c => <option key={c.id} value={c.name} />)}
              </datalist>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Date</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input input-bordered"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Mode de paiement</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="select select-bordered"
              >
                <option value="Espèces">Espèces</option>
                <option value="Virement">Virement</option>
                <option value="Carte">Carte</option>
                <option value="Chèque">Chèque</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Montant payé</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amountPaid}
                onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                className="input input-bordered"
                placeholder="0.00"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Notes</span>
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input input-bordered"
                placeholder="Observations..."
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Produits</h4>
              <button type="button" onClick={addLine} className="btn btn-ghost btn-sm">
                + Ajouter une ligne
              </button>
            </div>
            <div className="space-y-2">
              {formData.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="label text-xs"><span className="label-text">Produit</span></label>
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(index, 'productId', e.target.value)}
                      className="select select-bordered select-sm w-full"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label text-xs"><span className="label-text">Qté</span></label>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="label text-xs"><span className="label-text">Prix</span></label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="btn btn-ghost btn-sm btn-circle"
                      disabled={formData.lines.length === 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost">
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Créer la facture
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInvoice(null);
          resetForm();
        }}
        title={`Modifier: ${selectedInvoice?.invoiceNumber}`}
        size="xl"
      >
        <form onSubmit={handleEditInvoice} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Client *</span>
              </label>
              <input
                type="text"
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Date</span>
              </label>
              <input
                type="date"
                required
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="input input-bordered"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Mode de paiement</span>
              </label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                className="select select-bordered"
              >
                <option value="Espèces">Espèces</option>
                <option value="Virement">Virement</option>
                <option value="Carte">Carte</option>
                <option value="Chèque">Chèque</option>
              </select>
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Montant payé</span>
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formData.amountPaid}
                onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                className="input input-bordered"
              />
            </div>
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Notes</span>
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="input input-bordered"
              />
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-medium">Produits</h4>
              <button type="button" onClick={addLine} className="btn btn-ghost btn-sm">
                + Ajouter une ligne
              </button>
            </div>
            <div className="space-y-2">
              {formData.lines.map((line, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5">
                    <label className="label text-xs"><span className="label-text">Produit</span></label>
                    <select
                      value={line.productId}
                      onChange={(e) => updateLine(index, 'productId', e.target.value)}
                      className="select select-bordered select-sm w-full"
                    >
                      {products.map(p => (
                        <option key={p.id} value={p.id}>{p.code} - {p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="label text-xs"><span className="label-text">Qté</span></label>
                    <input
                      type="number"
                      min="1"
                      value={line.quantity}
                      onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div className="col-span-3">
                    <label className="label text-xs"><span className="label-text">Prix</span></label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={line.unitPrice}
                      onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                      className="input input-bordered input-sm w-full"
                    />
                  </div>
                  <div className="col-span-2">
                    <button
                      type="button"
                      onClick={() => removeLine(index)}
                      className="btn btn-ghost btn-sm btn-circle"
                      disabled={formData.lines.length === 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedInvoice(null);
                resetForm();
              }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-info">
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvoice(null);
        }}
        title={`Facture ${selectedInvoice?.invoiceNumber}`}
        size="lg"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Client:</span>
                <p className="font-medium">{selectedInvoice.customerName}</p>
              </div>
              <div>
                <span className="text-slate-500">Date:</span>
                <p className="font-medium">{new Date(selectedInvoice.date).toLocaleDateString('fr-MA')}</p>
              </div>
              <div>
                <span className="text-slate-500">Mode paiement:</span>
                <p className="font-medium">{selectedInvoice.paymentMethod}</p>
              </div>
              <div>
                <span className="text-slate-500">Statut:</span>
                <span className={`badge ${getStatusColor(selectedInvoice.paymentStatus)} badge-sm ml-1`}>
                  {selectedInvoice.paymentStatus}
                </span>
              </div>
            </div>

            <div className="border-t border-b border-slate-200 py-4">
              <h4 className="font-medium mb-3">Articles</h4>
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th>Produit</th>
                    <th className="text-right">Qté</th>
                    <th className="text-right">Prix</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.productName}</td>
                      <td className="text-right">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right font-medium">{formatCurrency(item.totalPrice)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-slate-50 rounded-lg">
                <div className="text-slate-500 text-xs">Total</div>
                <div className="font-semibold text-lg">{formatCurrency(selectedInvoice.totalAmount)}</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-slate-500 text-xs">Encaisse</div>
                <div className="font-semibold text-lg text-success">{formatCurrency(selectedInvoice.amountPaid)}</div>
              </div>
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-slate-500 text-xs">Reste</div>
                <div className="font-semibold text-lg text-warning">{formatCurrency(selectedInvoice.remainingAmount)}</div>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="text-sm text-slate-500">
                <span className="font-medium">Notes:</span> {selectedInvoice.notes}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedInvoice(null);
        }}
        title="Confirmer la suppression"
        size="sm"
      >
        <div className="py-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-error/10 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-slate-600">
              Êtes-vous sûr de vouloir supprimer la facture <strong>{selectedInvoice?.invoiceNumber}</strong> ?
              <br />
              <span className="text-sm">Cette action est irréversible.</span>
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedInvoice(null);
              }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button onClick={handleDeleteInvoice} disabled={isSubmitting} className="btn btn-error">
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Supprimer
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
