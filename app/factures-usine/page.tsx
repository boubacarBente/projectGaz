'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { useSearchFilter, SearchBar, FilterSelect, Pagination } from '@/components/search-filter';
import { Modal } from '@/components/modal';
// DatePicker removed

// Dynamic import for PDF/image generation
let html2canvas: any;
let jsPDF: any;

async function loadExportLibraries() {
  if (!html2canvas || !jsPDF) {
    html2canvas = (await import('html2canvas')).default;
    jsPDF = (await import('jspdf')).default;
  }
  return { html2canvas, jsPDF };
}

type PurchaseInvoiceItem = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

type PurchaseInvoice = {
  id: number;
  reference: string;
  supplierName: string;
  date: string;
  notes: string;
  items: PurchaseInvoiceItem[];
  totalAmount: number;
  isPaid: boolean;
  createdAt: string;
};

type Product = {
  id: number;
  code: string;
  name: string;
  capacity: string;
  unitPrice: number;
};

interface PurchaseLine {
  productId: string;
  quantity: string;
  unitCost: string;
}

interface PurchaseFormData {
  reference: string;
  supplier: string;
  date: string;
  notes: string;
  lines: PurchaseLine[];
  isPaid: boolean;
}

const initialFormData: PurchaseFormData = {
  reference: '',
  supplier: 'Usine',
  date: new Date().toISOString().slice(0, 10),
  notes: '',
  lines: [{ productId: '', quantity: '1', unitCost: '' }],
  isPaid: false,
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

export default function DepensesPage() {
  const [invoices, setInvoices] = useState<PurchaseInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<{ id: number; name: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<PurchaseInvoice | null>(null);
  const [formData, setFormData] = useState<PurchaseFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [supplierFilter, setSupplierFilter] = useState('');

  const { search, setSearch, filter, setFilter, currentPage, setCurrentPage } = useSearchFilter(
    invoices,
    ['reference', 'date'],
  );

  const [depensesStats, setDepensesStats] = useState<{ totalAmount: number; totalBottles: number; averageCost: number } | null>(null);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchData();
  }, [currentPage, search, filter, supplierFilter]);
  useEffect(() => {
    fetchDepensesStats();
  }, [supplierFilter]);

  const fetchDepensesStats = async () => {
    try {
      const params = new URLSearchParams();
      if (supplierFilter) {
        const supplier = suppliers.find(s => s.name.toLowerCase() === supplierFilter.toLowerCase());
        if (supplier) params.set('supplierId', String(supplier.id));
      }
      const res = await fetch(`/api/depenses/stats?${params}`);
      const data = await res.json();
      setDepensesStats(data);
    } catch { /* silent */ }
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(ITEMS_PER_PAGE));
      if (search) params.set('search', search);
      if (filter === 'paid') params.set('paid', 'true');
      if (filter === 'unpaid') params.set('paid', 'false');
      if (supplierFilter) {
        const supplier = suppliers.find(s => s.name.toLowerCase() === supplierFilter.toLowerCase());
        if (supplier) params.set('supplierId', String(supplier.id));
      }
      const [invoicesRes, productsRes, suppliersRes] = await Promise.all([
        fetch(`/api/depenses?${params}`),
        fetch('/api/produits?all=true&limit=100'),
        fetch('/api/fournisseurs?limit=100'),
      ]);
      const invoicesData = await invoicesRes.json();
      const productsData = await productsRes.json();
      const suppliersData = await suppliersRes.json();
      setInvoices(invoicesData.data);
      setTotal(invoicesData.total);
      setTotalPages(invoicesData.totalPages);
      setProducts(productsData.data || productsData);
      setSuppliers(suppliersData.data || suppliersData);
      const prodList = productsData.data || productsData;
      if (prodList.length > 0) {
        setFormData(prev => ({
          ...prev,
          lines: [{ productId: prodList[0].id.toString(), quantity: '1', unitCost: '' }]
        }));
      }
    } catch {
      toast.error('Erreur lors du chargement des données');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => setFormData(initialFormData);

  const handleAddPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const lines = formData.lines
      .filter(line => line.productId && line.quantity && line.unitCost)
      .map(line => ({
        productId: parseInt(line.productId),
        quantity: parseInt(line.quantity),
        amount: parseFloat(line.unitCost),
      }));

    if (lines.length === 0) {
      toast.error('Veuillez ajouter au moins un produit');
      return;
    }

    if (lines.some(line => isNaN(line.quantity) || isNaN(line.amount) || line.quantity <= 0 || line.amount <= 0)) {
      toast.error('Quantité ou prix invalide');
      return;
    }

    // Trouver l'ID du fournisseur à partir du nom
    const supplierObj = suppliers.find(s => s.name === formData.supplier);
    if (!supplierObj) {
      toast.error('Fournisseur invalide');
      return;
    }

    setIsSubmitting(true);
    try {

      const res = await fetch('/api/depenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formData.reference,
          supplierId: supplierObj.id,
          date: formData.date,
          notes: formData.notes,
          lines,
          isPaid: formData.isPaid,
        }),
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Facture enregistrée avec succès!');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;
    const lines = formData.lines
      .filter(line => line.productId && line.quantity && line.unitCost)
      .map(line => ({
        productId: parseInt(line.productId),
        quantity: parseInt(line.quantity),
        amount: parseFloat(line.unitCost),
      }));

    if (lines.length === 0) {
      toast.error('Veuillez ajouter au moins un produit');
      return;
    }

    if (lines.some(line => isNaN(line.quantity) || isNaN(line.amount) || line.quantity <= 0 || line.amount <= 0)) {
      toast.error('Quantité ou prix invalide');
      return;
    }

    // Trouver l'ID du fournisseur à partir du nom
    const supplierObj = suppliers.find(s => s.name === formData.supplier);
    if (!supplierObj) {
      toast.error('Fournisseur invalide');
      return;
    }

    setIsSubmitting(true);
    try {

      const res = await fetch(`/api/depenses/${selectedInvoice.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reference: formData.reference,
          supplierId: supplierObj.id,
          date: formData.date,
          notes: formData.notes,
          lines,
          isPaid: formData.isPaid,
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

  const handleDeletePurchase = async () => {
    if (!selectedInvoice) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/depenses/${selectedInvoice.id}`, {
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

  const openEditModal = (invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      reference: invoice.reference,
      supplier: invoice.supplierName,
      date: invoice.date,
      notes: invoice.notes,
      lines: invoice.items.map(item => ({
        productId: item.productId.toString(),
        quantity: item.quantity.toString(),
        unitCost: item.unitCost.toString(),
      })),
      isPaid: invoice.isPaid,
    });
    setShowEditModal(true);
  };

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { productId: products[0]?.id.toString() || '', quantity: '1', unitCost: '' }],
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

  const updateLine = (index: number, field: keyof PurchaseLine, value: string) => {
    setFormData(prev => ({
      ...prev,
      lines: prev.lines.map((line, i) => i === index ? { ...line, [field]: value } : line),
    }));
  };

  const openDeleteModal = (invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteModal(true);
  };

  const openDetailModal = (invoice: PurchaseInvoice) => {
    setSelectedInvoice(invoice);
    setShowDetailModal(true);
  };

  // Export functions (same as factures)
  const handleExportPDF = async (invoice: PurchaseInvoice) => {
    try {
      toast.info('Génération du PDF en cours...');
      const { html2canvas: hc, jsPDF: pdf } = await loadExportLibraries();

      const content = buildPurchaseInvoiceHTML(invoice);
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:1200px;border:none;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe');

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html><html><head><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; background: rgb(255,255,255); padding: 40px; }
        </style></head><body>${content}</body></html>
      `);
      iframeDoc.close();

      const canvas = await hc(iframeDoc.body, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: 'rgb(255,255,255)', logging: false,
      });

      const pdfDoc = new pdf({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdfDoc.internal.pageSize.getWidth();
      const pageHeight = pdfDoc.internal.pageSize.getHeight();
      pdfDoc.addImage(canvas.toDataURL('image/png'), 'PNG', 10, 10, pageWidth - 20, pageHeight - 20);
      pdfDoc.save(`facture-usine-${invoice.reference}.pdf`);

      document.body.removeChild(iframe);
      toast.success('PDF téléchargé!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const handleExportImage = async (invoice: PurchaseInvoice) => {
    try {
      toast.info('Génération de l\'image en cours...');
      const { html2canvas: hc } = await loadExportLibraries();

      const content = buildPurchaseInvoiceHTML(invoice);
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:1200px;border:none;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe');

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html><html><head><style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; background: rgb(255,255,255); padding: 40px; }
        </style></head><body>${content}</body></html>
      `);
      iframeDoc.close();

      const canvas = await hc(iframeDoc.body, {
        scale: 2, useCORS: true, allowTaint: true, backgroundColor: 'rgb(255,255,255)', logging: false,
      });

      const link = document.createElement('a');
      link.download = `facture-usine-${invoice.reference}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      document.body.removeChild(iframe);
      toast.success('Image téléchargée!');
    } catch (err) {
      console.error('Image export error:', err);
      toast.error('Erreur lors de la génération de l\'image');
    }
  };

  function buildPurchaseInvoiceHTML(invoice: PurchaseInvoice): string {
    const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR').format(value);
    const itemsHTML = invoice.items.map(item => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${item.productCode}</td>
        <td style="padding:12px;text-align:center;border-bottom:1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding:12px;text-align:right;border-bottom:1px solid #e2e8f0;">${formatCurrency(item.unitCost)} GNF</td>
        <td style="padding:12px;text-align:right;border-bottom:1px solid #e2e8f0;">${formatCurrency(item.totalCost)} GNF</td>
      </tr>
    `).join('');

    return `
      <div style="max-width:720px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #1e293b;padding-bottom:20px;">
          <h1 style="font-size:28px;color:#1e293b;margin:0 0 10px 0;">FACTURE USINE</h1>
          <p style="font-size:18px;color:#475569;margin:0;">N° ${invoice.reference}</p>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:30px;">
          <div><p style="font-size:12px;color:#64748b;margin:0;">Fournisseur</p><p style="font-size:16px;font-weight:bold;margin:5px 0 0 0;">${invoice.supplierName}</p></div>
          <div style="text-align:right;">
            <p style="font-size:12px;color:#64748b;margin:0;">Date</p><p style="font-size:14px;margin:5px 0 0 0;">${new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:12px;text-align:left;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Code</th>
            <th style="padding:12px;text-align:center;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Qté</th>
            <th style="padding:12px;text-align:right;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Coût Unit.</th>
            <th style="padding:12px;text-align:right;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Total</th>
          </tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-bottom:30px;">
          <div style="width:250px;">
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
              <span style="font-size:14px;color:#475569;">Total</span>
              <span style="font-size:16px;font-weight:bold;color:#1e293b;">${formatCurrency(invoice.totalAmount)} GNF</span>
            </div>
          </div>
        </div>
        ${invoice.notes ? `
        <div style="margin-top:20px;padding:15px;background:#f8fafc;border-radius:8px;">
          <p style="font-size:12px;color:#64748b;margin:0 0 5px 0;">Notes</p>
          <p style="font-size:14px;margin:0;">${invoice.notes}</p>
        </div>` : ''}
        <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="font-size:12px;color:#64748b;margin:0;">Facture d'usine - Achat produits</p>
          <p style="font-size:14px;font-weight:bold;margin:10px 0 0 0;">ProjectGaz</p>
        </div>
      </div>
    `;
  }

  const totalAmount = depensesStats?.totalAmount ?? 0;
  const totalBottles = depensesStats?.totalBottles ?? 0;
  const averageCost = depensesStats?.averageCost ?? 0;

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
        eyebrow="Approvisionnement"
        title="Factures d'usine"
        description="Gestion des factures d'approvisionnement en bouteilles de gaz."
        actions={
          <button
            onClick={() => {
              resetForm();
              if (products.length > 0) {
                setFormData(prev => ({ ...prev, productId: products[0].id.toString() }));
              }
              setShowAddModal(true);
            }}
            className="btn btn-primary gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle facture
          </button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total approvisionnement</div>
            <div className="stat-value text-warning">{formatCurrency(totalAmount)}</div>
            <div className="stat-desc">GNF</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Bouteilles reçues</div>
            <div className="stat-value text-info">{totalBottles}</div>
            <div className="stat-desc">Total bouteilles reçu</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Coût moyen</div>
            <div className="stat-value text-secondary">{formatCurrency(averageCost)}</div>
            <div className="stat-desc">GNF par facture</div>
          </div>
        </div>
      </div>

      {/* Invoice List */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Historique des factures</h3>
            <p className="text-sm text-base-content/60">{total} facture(s)</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <FilterSelect
              value={supplierFilter}
              onChange={setSupplierFilter}
              placeholder="Tous les fournisseurs"
              options={suppliers.map(s => ({ value: s.name, label: s.name }))}
            />
            <FilterSelect
              value={filter}
              onChange={setFilter}
              placeholder="Tous les statuts"
              options={[
                { value: 'paid', label: 'Payée' },
                { value: 'unpaid', label: 'Non payée' },
              ]}
            />
            <div className="min-w-50">
              <SearchBar
                value={search}
                onChange={setSearch}
                onClear={() => setSearch('')}
                placeholder="Rechercher par réf., fournisseur, date..."
              />
            </div>
          </div>
        </div>

        {invoices.length === 0 && !isLoading ? (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-200 px-4 py-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-base-content/50 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-base-content/70">{total === 0 && invoices.length === 0 ? "Aucune facture d'approvisionnement enregistrée." : "Aucune facture ne correspond aux filtres."}</p>
            {total === 0 && invoices.length === 0 && (
              <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm mt-4">
                Ajouter une première facture
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="table table-zebra">
                <thead>
                  <tr>
                    <th>Référence</th>
                    <th>Fournisseur</th>
                    <th>Date</th>
                    <th>Produits</th>
                    <th>Total</th>
                    <th>Statut</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id}>
                      <td className="font-medium">{invoice.reference}</td>
                      <td>{invoice.supplierName}</td>
                      <td>{new Date(invoice.date).toLocaleDateString('fr-MA')}</td>
                      <td>
                        <div className="text-sm">
                          {invoice.items.map((item, idx) => (
                            <span key={idx} className="badge badge-outline badge-sm mr-1">
                              {item.productCode} x{item.quantity}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="font-semibold text-warning">{formatCurrency(invoice.totalAmount)} GNF</td>
                      <td>
                        {invoice.isPaid ? (
                          <span className="badge badge-primary">Payée</span>
                        ) : (
                          <span className="badge bg-danger">Non payée</span>
                        )}
                      </td>
                      <td className="text-right">
                        <div className="flex gap-1 justify-end">
                          <Link href={`/factures-usine/${invoice.id}`} className="btn btn-ghost btn-xs" title="Voir détail">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <button onClick={() => openEditModal(invoice)} className="btn btn-ghost btn-xs" title="Modifier">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => openDeleteModal(invoice)} className="btn btn-ghost btn-xs" title="Supprimer">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        title={
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Nouvelle facture d'approvisionnement
          </div>
        }
        size="xl"
      >
        <form onSubmit={handleAddPurchase} className="space-y-6">
          {/* Section: Informations générales */}
          <div className="bg-base-200/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Informations générales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Référence facture *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="input input-bordered input-primary focus:input-focus"
                  placeholder="USINE-2026-001"
                />
                <label className="label">
                  <span className="label-text-alt">Numéro de référence unique</span>
                </label>
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Fournisseur</span>
                </label>
                <select
                  required
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="select select-bordered select-primary focus:select-focus"
                >
                  <option value="">Sélectionner un fournisseur...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Date de la facture</span>
                </label>
                <input type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full input-md"
                />
              </div>
            </div>
          </div>

          {/* Section: Paiement */}
          <div className="bg-base-200/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Paiement
            </h4>
            <div className="form-control">
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input
                    type="checkbox"
                    checked={formData.isPaid}
                    onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                    className="toggle toggle-success toggle-lg"
                  />
                  <div className="flex flex-col items-start">
                    <span className="label-text font-semibold text-lg">Facture payée</span>
                    <span className="text-sm text-base-content/60">
                      {formData.isPaid ? 'La facture a été réglée au fournisseur' : 'La facture n\'a pas encore été réglée'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section: Produits */}
          <div className="bg-base-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm text-base-content/70 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Produits commandés
              </h4>
              <button type="button" onClick={addLine} className="btn btn-sm btn-primary btn-outline gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th className="bg-base-100">Produit</th>
                    <th className="bg-base-100 text-center">Quantité</th>
                    <th className="bg-base-100 text-right">Coût unitaire (GNF)</th>
                    <th className="bg-base-100 text-right">Total</th>
                    <th className="bg-base-100"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lines.map((line, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          value={line.productId}
                          onChange={(e) => { const p = products.find(p => p.id.toString() === e.target.value); updateLine(index, 'productId', e.target.value); if (p) updateLine(index, 'unitCost', p.unitPrice.toString()); }}
                          className="select select-bordered select-sm w-full focus:select-focus"
                        >
                          <option value="">Sélectionner...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.code} - {product.name} ({product.capacity})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number" step="any"
                          value={line.quantity}
                          onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                          className="input input-bordered input-sm w-20 text-center focus:input-focus"
                        />
                      </td>
                      <td>
                        <input
                          type="number" step="any"
                          value={line.unitCost}
                          onChange={(e) => updateLine(index, 'unitCost', e.target.value)}
                          className="input input-bordered input-sm w-28 text-right focus:input-focus"
                          placeholder="0"
                        />
                      </td>
                      <td className="text-right font-semibold text-warning">
                        {line.quantity && line.unitCost
                          ? formatCurrency(parseInt(line.quantity) * parseFloat(line.unitCost || '0'))
                          : '0'} GNF
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="btn btn-ghost btn-sm btn-circle"
                          disabled={formData.lines.length === 1}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-base">
                    <td colSpan={3} className="text-right">Total général</td>
                    <td className="text-right text-warning">
                      {formData.lines.reduce((sum, line) =>
                        sum + (parseFloat(line.quantity || '0') * parseFloat(line.unitCost || '0')), 0
                      ).toLocaleString('fr-MA')} GNF
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Notes (optionnel)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="textarea textarea-bordered textarea-primary focus:textarea-focus"
              rows={2}
              placeholder="Ajouter des notes ou remarques..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
            <button
              type="button"
              onClick={() => setShowAddModal(false)}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer la facture
                </div>
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
        title={
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Modifier la facture
          </div>
        }
        size="xl"
      >
        <form onSubmit={handleEditPurchase} className="space-y-6">
          {/* Section: Informations générales */}
          <div className="bg-base-200/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Informations générales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Référence facture *</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.reference}
                  onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                  className="input input-bordered input-primary focus:input-focus"
                />
              </div>
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Fournisseur</span>
                </label>
                <select
                  required
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="select select-bordered select-primary focus:select-focus"
                >
                  <option value="">Sélectionner un fournisseur...</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="form-control">
                <label className="label">
                  <span className="label-text font-medium">Date de la facture</span>
                </label>
                <input type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="w-full input-md"
                />
              </div>
            </div>
          </div>

          {/* Section: Paiement */}
          <div className="bg-base-200/30 rounded-xl p-4">
            <h4 className="font-semibold text-sm text-base-content/70 mb-4 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Paiement
            </h4>
            <div className="form-control">
              <div className="form-control">
                <label className="label cursor-pointer justify-start gap-4">
                  <input
                    type="checkbox"
                    checked={formData.isPaid}
                    onChange={(e) => setFormData({ ...formData, isPaid: e.target.checked })}
                    className="toggle toggle-success toggle-lg"
                  />
                  <div className="flex flex-col items-start">
                    <span className="label-text font-semibold text-lg">Facture payée</span>
                    <span className="text-sm text-base-content/60">
                      {formData.isPaid ? 'La facture a été réglée au fournisseur' : 'La facture n\'a pas encore été réglée'}
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Section: Produits */}
          <div className="bg-base-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm text-base-content/70 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                Produits commandés
              </h4>
              <button type="button" onClick={addLine} className="btn btn-sm btn-primary btn-outline gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th className="bg-base-100">Produit</th>
                    <th className="bg-base-100 text-center">Quantité</th>
                    <th className="bg-base-100 text-right">Coût unitaire (GNF)</th>
                    <th className="bg-base-100 text-right">Total</th>
                    <th className="bg-base-100"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lines.map((line, index) => (
                    <tr key={index}>
                      <td>
                        <select
                          value={line.productId}
                          onChange={(e) => { const p = products.find(p => p.id.toString() === e.target.value); updateLine(index, 'productId', e.target.value); if (p) updateLine(index, 'unitCost', p.unitPrice.toString()); }}
                          className="select select-bordered select-sm w-full focus:select-focus"
                        >
                          <option value="">Sélectionner...</option>
                          {products.map((product) => (
                            <option key={product.id} value={product.id}>
                              {product.code} - {product.name} ({product.capacity})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <input
                          type="number" step="any"

                          value={line.quantity}
                          onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                          className="input input-bordered input-sm w-20 text-center focus:input-focus"
                        />
                      </td>
                      <td>
                        <input
                          type="number" step="any"


                          value={line.unitCost}
                          onChange={(e) => updateLine(index, 'unitCost', e.target.value)}
                          className="input input-bordered input-sm w-28 text-right focus:input-focus"
                          placeholder="0"
                        />
                      </td>
                      <td className="text-right font-semibold text-warning">
                        {line.quantity && line.unitCost
                          ? formatCurrency(parseInt(line.quantity) * parseFloat(line.unitCost || '0'))
                          : '0'} GNF
                      </td>
                      <td>
                        <button
                          type="button"
                          onClick={() => removeLine(index)}
                          className="btn btn-ghost btn-sm btn-circle"
                          disabled={formData.lines.length === 1}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-base">
                    <td colSpan={3} className="text-right">Total général</td>
                    <td className="text-right text-warning">
                      {formData.lines.reduce((sum, line) =>
                        sum + (parseFloat(line.quantity || '0') * parseFloat(line.unitCost || '0')), 0
                      ).toLocaleString('fr-MA')} GNF
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Notes (optionnel)</span>
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="textarea textarea-bordered textarea-primary focus:textarea-focus"
              rows={2}
              placeholder="Ajouter des notes ou remarques..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
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
            <button type="submit" disabled={isSubmitting} className="btn btn-primary">
              {isSubmitting ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <div className="flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Enregistrer les modifications
                </div>
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
        title={`Facture ${selectedInvoice?.reference}`}
        size="xl"
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-base-content/60">Référence</p>
                <p className="font-medium">{selectedInvoice.reference}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Date</p>
                <p className="font-medium">{new Date(selectedInvoice.date).toLocaleDateString('fr-FR')}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Fournisseur</p>
                <p className="font-medium">{selectedInvoice.supplierName}</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Montant total</p>
                <p className="font-medium text-warning">{formatCurrency(selectedInvoice.totalAmount)} GNF</p>
              </div>
              <div>
                <p className="text-xs text-base-content/60">Statut</p>
                {selectedInvoice.isPaid ? (
                  <span className="badge badge-primary">Payée</span>
                ) : (
                  <span className="badge badge-primary">Non payée</span>
                )}
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="table table-xs">
                <thead className="bg-base-200">
                  <tr>
                    <th>Code</th>
                    <th className="text-center">Qté</th>
                    <th className="text-right">Coût</th>
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedInvoice.items.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.productCode}</td>
                      <td className="text-center">{item.quantity}</td>
                      <td className="text-right">{formatCurrency(item.unitCost)}</td>
                      <td className="text-right">{formatCurrency(item.totalCost)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {selectedInvoice.notes && (
              <div>
                <p className="text-xs text-base-content/60">Notes</p>
                <p className="text-sm">{selectedInvoice.notes}</p>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t">
              <button onClick={() => { setShowDetailModal(false); setShowEditModal(true); }} className="btn btn-primary btn-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Modifier
              </button>
              <button onClick={() => handleExportPDF(selectedInvoice)} className="btn btn-primary btn-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                PDF
              </button>
              <button onClick={() => handleExportImage(selectedInvoice)} className="btn btn-primary btn-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Image
              </button>
            </div>
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
            <p className="text-base-content/70">
              Êtes-vous sûr de vouloir supprimer la facture <strong>{selectedInvoice?.reference}</strong> ?
              <br />
              <span className="text-sm">Cette action est irréversible.</span>
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
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
            <button onClick={handleDeletePurchase} disabled={isSubmitting} className="btn btn-primary">
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
