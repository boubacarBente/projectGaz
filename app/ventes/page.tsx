'use client';

import Link from 'next/link';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { useSearchFilter, SearchBar, FilterSelect, Pagination } from '@/components/search-filter';
import { Modal } from '@/components/modal';

// Dynamic import for PDF generation (client-side only)
let html2canvas: any;
let jsPDF: any;

async function loadExportLibraries() {
  if (!html2canvas || !jsPDF) {
    html2canvas = (await import('html2canvas')).default;
    jsPDF = (await import('jspdf')).default;
  }
  return { html2canvas, jsPDF };
}

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
  costOfGoodsSold?: number;
  grossProfit?: number;
  paymentStatus: 'Paye' | 'Partiel' | 'En attente';
  createdAt: string;
};

type Product = {
  id: number;
  code: string;
  name: string;
  capacity: string;
  unitPrice: number;
  salePrice: number;
};

type Customer = {
  id: number;
  name: string;
};



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
    case 'Paye': return 'badge-primary';
    case 'Partiel': return 'badge-error';
    case 'En attente': return 'badge-primary';
    default: return 'badge-primary';
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
  const { search, setSearch, filter, setFilter, currentPage, setCurrentPage, filtered } = useSearchFilter(
    invoices,
    ['invoiceNumber', 'customerName', 'date', 'paymentStatus'],
    (item, filterValue) => {
      if (filterValue === 'paid') return item.paymentStatus === 'Paye';
      if (filterValue === 'partial') return item.paymentStatus === 'Partiel';
      if (filterValue === 'pending') return item.paymentStatus === 'En attente';
      return true;
    }
  );
  const ITEMS_PER_PAGE = 10;

  // Trier par date de creation (dernier ajout en premier) et paginer
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });
  }, [filtered]);

  const paginatedInvoices = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sorted.slice(start, start + ITEMS_PER_PAGE);
  }, [sorted, currentPage]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));

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
          lines: [{ productId: productsData[0].id.toString(), quantity: '1', unitPrice: productsData[0].salePrice.toString() }]
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
    const lines = formData.lines.map(line => ({
      productId: parseInt(line.productId),
      quantity: parseInt(line.quantity),
      amount: parseFloat(line.unitPrice),
    }));
    
    if (lines.some(line => isNaN(line.quantity) || isNaN(line.amount) || line.quantity <= 0 || line.amount <= 0)) {
      toast.error('Quantité ou prix invalide');
      return;
    }
    
    setIsSubmitting(true);
    try {
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
    const lines = formData.lines.map(line => ({
      productId: parseInt(line.productId),
      quantity: parseInt(line.quantity),
      amount: parseFloat(line.unitPrice),
    }));
    
    if (lines.some(line => isNaN(line.quantity) || isNaN(line.amount) || line.quantity <= 0 || line.amount <= 0)) {
      toast.error('Quantité ou prix invalide');
      return;
    }
    
    setIsSubmitting(true);
    try {
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

  const handleExportPDF = async (invoice: SalesInvoice) => {
    try {
      toast.info('Génération du PDF en cours...');
      const { html2canvas: hc, jsPDF: pdf } = await loadExportLibraries();
      
      // Use iframe to isolate from page CSS
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:1200px;border:none;';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');
      
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; background: rgb(255,255,255); padding: 40px; }
          </style>
        </head>
        <body>${buildInvoiceHTML(invoice)}</body>
        </html>
      `);
      iframeDoc.close();
      
      const canvas = await hc(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'rgb(255,255,255)',
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdfDoc = new pdf({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdfDoc.internal.pageSize.getWidth();
      const pageHeight = pdfDoc.internal.pageSize.getHeight();
      pdfDoc.addImage(imgData, 'PNG', 10, 10, pageWidth - 20, pageHeight - 20);
      pdfDoc.save(`facture-${invoice.invoiceNumber}.pdf`);
      
      document.body.removeChild(iframe);
      toast.success('PDF téléchargé avec succès!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erreur lors de la génération du PDF');
    }
  };

  const handleExportImage = async (invoice: SalesInvoice) => {
    try {
      toast.info('Génération de l\'image en cours...');
      const { html2canvas: hc } = await loadExportLibraries();
      
      // Use iframe to isolate from page CSS
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:1200px;border:none;';
      document.body.appendChild(iframe);
      
      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');
      
      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, Helvetica, sans-serif; background: rgb(255,255,255); padding: 40px; }
          </style>
        </head>
        <body>${buildInvoiceHTML(invoice)}</body>
        </html>
      `);
      iframeDoc.close();
      
      const canvas = await hc(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'rgb(255,255,255)',
        logging: false,
      });
      
      const link = document.createElement('a');
      link.download = `facture-${invoice.invoiceNumber}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
      document.body.removeChild(iframe);
      toast.success('Image téléchargée avec succès!');
    } catch (err) {
      console.error('Image export error:', err);
      toast.error('Erreur lors de la génération de l\'image');
    }
  };

  // Build invoice HTML for export
  function buildInvoiceHTML(invoice: SalesInvoice): string {
    const formatCurrency = (value: number) => new Intl.NumberFormat('fr-FR').format(value);
    const itemsHTML = invoice.items.map(item => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${item.productName}</td>
        <td style="padding:12px;text-align:center;border-bottom:1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding:12px;text-align:right;border-bottom:1px solid #e2e8f0;">${formatCurrency(item.unitPrice)} GNF</td>
        <td style="padding:12px;text-align:right;border-bottom:1px solid #e2e8f0;">${formatCurrency(item.totalPrice)} GNF</td>
      </tr>
    `).join('');
    
    return `
      <div style="max-width:720px;margin:0 auto;">
        <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #1e293b;padding-bottom:20px;">
          <h1 style="font-size:28px;color:#1e293b;margin:0 0 10px 0;">FACTURE DE KORBE</h1>
          <p style="font-size:18px;color:#475569;margin:0;">N° ${invoice.invoiceNumber}</p>
        </div>
        <div style="display:flex;justify-content:space-between;margin-bottom:30px;">
          <div><p style="font-size:12px;color:#64748b;margin:0;">Client</p><p style="font-size:16px;font-weight:bold;margin:5px 0 0 0;">${invoice.customerName}</p></div>
          <div style="text-align:right;">
            <p style="font-size:12px;color:#64748b;margin:0;">Date</p><p style="font-size:14px;margin:5px 0 0 0;">${new Date(invoice.date).toLocaleDateString('fr-FR')}</p>
            <p style="font-size:12px;color:#64748b;margin:15px 0 0 0;">Mode paiement</p><p style="font-size:14px;margin:5px 0 0 0;">${invoice.paymentMethod}</p>
          </div>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:30px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="padding:12px;text-align:left;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Article</th>
            <th style="padding:12px;text-align:center;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Qté</th>
            <th style="padding:12px;text-align:right;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Prix Unit.</th>
            <th style="padding:12px;text-align:right;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Total</th>
          </tr></thead>
          <tbody>${itemsHTML}</tbody>
        </table>
        <div style="display:flex;justify-content:flex-end;margin-bottom:30px;">
          <div style="width:250px;">
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
              <span style="font-size:14px;color:#475569;">Total</span>
              <span style="font-size:16px;font-weight:bold;">${formatCurrency(invoice.totalAmount)} GNF</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
              <span style="font-size:14px;color:#475569;">Avance</span>
              <span style="font-size:16px;font-weight:bold;color:#16a34a;">${formatCurrency(invoice.amountPaid)} GNF</span>
            </div>
            <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
              <span style="font-size:14px;color:#475569;">Reste</span>
              <span style="font-size:16px;font-weight:bold;color:#ea580c;">${formatCurrency(invoice.remainingAmount)} GNF</span>
            </div>
          </div>
        </div>
        ${invoice.notes ? `
        <div style="margin-top:20px;padding:15px;background:#f8fafc;border-radius:8px;">
          <p style="font-size:12px;color:#64748b;margin:0 0 5px 0;">Notes</p>
          <p style="font-size:14px;margin:0;">${invoice.notes}</p>
        </div>` : ''}
        <div style="margin-top:40px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;">
          <p style="font-size:12px;color:#64748b;margin:0;">Merci pour votre confiance</p>
          <p style="font-size:14px;font-weight:bold;margin:10px 0 0 0;">ProjectGaz</p>
        </div>
      </div>
    `;
  }

  const addLine = () => {
    setFormData(prev => ({
      ...prev,
      lines: [...prev.lines, { productId: products[0]?.id.toString() || '', quantity: '1', unitPrice: products[0]?.salePrice.toString() || '' }],
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
          lines: prev.lines.map((line, i) => i === index ? { ...line, unitPrice: product.salePrice.toString() } : line),
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
                  lines: [{ productId: products[0].id.toString(), quantity: '1', unitPrice: products[0].salePrice.toString() }]
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
            <div className="stat-desc">GNF</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Encaisse</div>
            <div className="stat-value text-success">{formatCurrency(totalPaid)}</div>
            <div className="stat-desc">GNF</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Reste à payer</div>
            <div className="stat-value text-warning">{formatCurrency(totalRemaining)}</div>
            <div className="stat-desc">GNF</div>
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
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Historique des ventes</h3>
            <p className="text-sm text-base-content/60">{filtered.length} facture(s) sur {invoices.length}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
            <FilterSelect
              value={filter}
              onChange={setFilter}
              placeholder="Tous les statuts"
              options={[
                { value: 'paid', label: 'Payé' },
                { value: 'partial', label: 'Partiel' },
                { value: 'pending', label: 'En attente' },
              ]}
            />
            <div className="min-w-50">
              <SearchBar
                value={search}
                onChange={setSearch}
                onClear={() => setSearch('')}
                placeholder="Rechercher par N° facture, client, date..."
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-200 px-4 py-12 text-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-base-content/50 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <p className="text-base-content/70">{invoices.length === 0 ? 'Aucune vente enregistrée.' : 'Aucune facture ne correspond aux filtres.'}</p>
            {invoices.length === 0 && (
              <button onClick={() => setShowAddModal(true)} className="btn btn-primary btn-sm mt-4">
                Créer une première facture
              </button>
            )}
          </div>
        ) : (
          <>
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
                  {paginatedInvoices.map((invoice) => (
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
                          <Link href={`/ventes/${invoice.id}`} className="btn btn-ghost btn-xs" title="Voir détail">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                          </Link>
                          <button onClick={() => handleExportPDF(invoice)} className="btn btn-ghost btn-xs text-info" title="Télécharger PDF">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </button>
                          <button onClick={() => handleExportImage(invoice)} className="btn btn-ghost btn-xs text-success" title="Télécharger Image">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </button>
                          <button onClick={() => openEditModal(invoice)} className="btn btn-ghost btn-xs">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button onClick={() => openDeleteModal(invoice)} className="btn btn-ghost btn-xs">
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
      </div>      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Nouvelle facture de vente" size="xl">
        <form onSubmit={handleAddInvoice} className="space-y-4">
          {/* Client & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label block">
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
              <label className="label block">
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

          {/* Produits */}
          <div className="bg-base-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm text-base-content/70">Produits vendus</h4>
              <button type="button" onClick={addLine} className="btn btn-sm btn-primary btn-outline gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th className="bg-base-100">Produit</th>
                    <th className="bg-base-100 text-center">Qté</th>
                    <th className="bg-base-100 text-right">Prix unit.</th>
                    <th className="bg-base-100 text-right">Total</th>
                    <th className="bg-base-100"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lines.map((line, index) => {
                    const qty = parseFloat(line.quantity || '0');
                    const price = parseFloat(line.unitPrice || '0');
                    const total = qty * price;
                    return (
                      <tr key={index}>
                        <td>
                          <select
                            value={line.productId}
                            onChange={(e) => { const p = products.find(p => p.id.toString() === e.target.value); updateLine(index, 'productId', e.target.value); if (p) updateLine(index, 'unitPrice', p.salePrice.toString()); }}
                            className="select select-bordered select-sm w-full focus:select-focus"
                          >
                            <option value="">Sélectionner...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.capacity})</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number" step="any"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                            className="input input-bordered input-sm w-20 text-center focus:input-focus"
                            min="1"
                          />
                        </td>
                        <td>
                          <input
                            type="number" step="any"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                            className="input input-bordered input-sm w-28 text-right focus:input-focus"
                            placeholder="0"
                            min="1"
                          />
                        </td>
                        <td className="text-right font-semibold text-sky-600">
                          {line.quantity && line.unitPrice ? formatCurrency(total) + ' F' : '—'}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="btn btn-ghost btn-sm btn-circle"
                            disabled={formData.lines.length === 1}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-base">
                    <td colSpan={3} className="text-right">Total général</td>
                    <td className="text-right text-sky-600">
                      {formatCurrency(
                        formData.lines.reduce((sum, line) =>
                          sum + (parseFloat(line.quantity || '0') * parseFloat(line.unitPrice || '0')), 0
                        )
                      )} F
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Paiement & Notes */}
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
                type="number" step="any"
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

          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-ghost">Annuler</button>
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
          {/* Client & Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="form-control">
              <label className="label block">
                <span className="label-text font-medium">Client *</span>
              </label>
              <select
                required
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="select select-bordered"
              >
                <option value="">Sélectionner un client...</option>
                {customers.map(c => (
                  <option key={c.id} value={c.name}>{c.name}</option>
                ))}
              </select>
            </div>
            <div className="form-control">
              <label className="label block">
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

          {/* Produits */}
          <div className="bg-base-200/30 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-sm text-base-content/70">Produits vendus</h4>
              <button type="button" onClick={addLine} className="btn btn-sm btn-primary btn-outline gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Ajouter
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="table table-xs">
                <thead>
                  <tr>
                    <th className="bg-base-100">Produit</th>
                    <th className="bg-base-100 text-center">Qté</th>
                    <th className="bg-base-100 text-right">Prix unit.</th>
                    <th className="bg-base-100 text-right">Total</th>
                    <th className="bg-base-100"></th>
                  </tr>
                </thead>
                <tbody>
                  {formData.lines.map((line, index) => {
                    const qty = parseFloat(line.quantity || '0');
                    const price = parseFloat(line.unitPrice || '0');
                    const total = qty * price;
                    return (
                      <tr key={index}>
                        <td>
                          <select
                            value={line.productId}
                            onChange={(e) => { const p = products.find(p => p.id.toString() === e.target.value); updateLine(index, 'productId', e.target.value); if (p) updateLine(index, 'unitPrice', p.salePrice.toString()); }}
                            className="select select-bordered select-sm w-full focus:select-focus"
                          >
                            <option value="">Sélectionner...</option>
                            {products.map(p => (
                              <option key={p.id} value={p.id}>{p.code} - {p.name} ({p.capacity})</option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number" step="any"
                            value={line.quantity}
                            onChange={(e) => updateLine(index, 'quantity', e.target.value)}
                            className="input input-bordered input-sm w-20 text-center focus:input-focus"
                            min="1"
                          />
                        </td>
                        <td>
                          <input
                            type="number" step="any"
                            value={line.unitPrice}
                            onChange={(e) => updateLine(index, 'unitPrice', e.target.value)}
                            className="input input-bordered input-sm w-28 text-right focus:input-focus"
                            placeholder="0"
                            min="1"
                          />
                        </td>
                        <td className="text-right font-semibold text-sky-600">
                          {line.quantity && line.unitPrice ? formatCurrency(total) + ' F' : '—'}
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => removeLine(index)}
                            className="btn btn-ghost btn-sm btn-circle"
                            disabled={formData.lines.length === 1}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="font-bold text-base">
                    <td colSpan={3} className="text-right">Total général</td>
                    <td className="text-right text-sky-600">
                      {formatCurrency(
                        formData.lines.reduce((sum, line) =>
                          sum + (parseFloat(line.quantity || '0') * parseFloat(line.unitPrice || '0')), 0
                        )
                      )} F
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Paiement & Notes */}
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
                type="number" step="any"
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

          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
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
                <span className="text-base-content/60">Client:</span>
                <p className="font-medium">{selectedInvoice.customerName}</p>
              </div>
              <div>
                <span className="text-base-content/60">Date:</span>
                <p className="font-medium">{new Date(selectedInvoice.date).toLocaleDateString('fr-MA')}</p>
              </div>
              <div>
                <span className="text-base-content/60">Mode paiement:</span>
                <p className="font-medium">{selectedInvoice.paymentMethod}</p>
              </div>
              <div>
                <span className="text-base-content/60">Statut:</span>
                <span className={`badge ${getStatusColor(selectedInvoice.paymentStatus)} badge-sm ml-1`}>
                  {selectedInvoice.paymentStatus}
                </span>
              </div>
            </div>

            <div className="border-t border-b border-base-200 py-4">
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

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-base-200 rounded-lg">
                <div className="text-base-content/60 text-xs">Total</div>
                <div className="font-semibold text-lg">{formatCurrency(selectedInvoice.totalAmount)}</div>
              </div>
              <div className="text-center p-3 bg-sky-50 rounded-lg">
                <div className="text-base-content/60 text-xs">Coût de revient</div>
                <div className="font-semibold text-lg text-info">{formatCurrency(selectedInvoice.costOfGoodsSold ?? 0)}</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-base-content/60 text-xs">Encaisse</div>
                <div className="font-semibold text-lg text-success">{formatCurrency(selectedInvoice.amountPaid)}</div>
              </div>
              <div className={`text-center p-3 rounded-lg ${(selectedInvoice.grossProfit ?? 0) >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <div className="text-base-content/60 text-xs">Bénéfice</div>
                <div className={`font-semibold text-lg ${(selectedInvoice.grossProfit ?? 0) >= 0 ? 'text-success' : 'text-error'}`}>
                  {formatCurrency(selectedInvoice.grossProfit ?? 0)}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 text-sm">
              <div className="text-center p-3 bg-amber-50 rounded-lg">
                <div className="text-base-content/60 text-xs">Reste</div>
                <div className="font-semibold text-lg text-warning">{formatCurrency(selectedInvoice.remainingAmount)}</div>
              </div>
            </div>

            {selectedInvoice.notes && (
              <div className="text-sm text-base-content/60">
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
            <p className="text-base-content/70">
              Êtes-vous sûr de vouloir supprimer la facture <strong>{selectedInvoice?.invoiceNumber}</strong> ?
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
            <button onClick={handleDeleteInvoice} disabled={isSubmitting} className="btn btn-primary">
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
