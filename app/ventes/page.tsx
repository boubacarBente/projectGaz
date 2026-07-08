'use client';

import { useState, useEffect, useMemo } from 'react';
import { toast } from 'react-toastify';
import { PageHeader } from '@/components/page-header';
import { useSearchFilter, SearchBar, FilterSelect, Pagination } from '@/components/search-filter';
import { VentesStatsCards } from '@/components/ventes/ventes-stats-cards';
import { VentesChartSection } from '@/components/ventes/ventes-chart-section';
import { VentesTable } from '@/components/ventes/ventes-table';
import { shareOnWhatsApp } from '@/components/export-dropdown';
import {
  AddInvoiceModal,
  EditInvoiceModal,
  DetailInvoiceModal,
  DeleteInvoiceModal,
} from '@/components/ventes/ventes-modals';
import type { Period, SalesInvoice, Product, Customer, VentesStats, InvoiceLine, InvoiceFormData } from '@/lib/ventes-types';

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

export default function FacturesPage() {
  const [invoices, setInvoices] = useState<SalesInvoice[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [ventesStats, setVentesStats] = useState<VentesStats | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedInvoices, setHasLoadedInvoices] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<SalesInvoice | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>(initialFormData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Période de filtrage (façon dashboard)
  const [period, setPeriod] = useState<Period>('total');
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 7);
  });

  const { search, setSearch, filter, setFilter, currentPage, setCurrentPage } = useSearchFilter(
    invoices,
    ['invoiceNumber', 'customerName', 'date'],
  );
  const ITEMS_PER_PAGE = 10;

  const stats = useMemo(() => ventesStats ?? {
    total: { total: 0, paid: 0, remaining: 0, count: 0, paidCount: 0 },
    byStatus: [],
    byCustomer: [],
    byPeriod: null,
    recentInvoices: [],
    dailyAvg: 0,
  }, [ventesStats]);
  const getPeriodParams = () => {
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    if (period === 'total') return { from: undefined, to: undefined };
    if (period === 'today') return { from: todayStr, to: todayStr };
    if (period === 'day' && selectedDay) return { from: selectedDay, to: selectedDay };
    if (period === 'week') {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { from: weekStart.toISOString().slice(0, 10), to: todayStr };
    }
    if (period === 'year') {
      const yearStart = today.getFullYear() + '-01-01';
      return { from: yearStart, to: todayStr };
    }
    if (period === 'month' && selectedMonth) {
      const year = parseInt(selectedMonth.slice(0, 4), 10);
      const mon = parseInt(selectedMonth.slice(5), 10);
      const lastDay = new Date(year, mon, 0).getDate();
      return { from: selectedMonth + '-01', to: selectedMonth + '-' + String(lastDay).padStart(2, '0') };
    }
    return { from: undefined, to: undefined };
  };

  // Re-fetch les stats quand la période change
  useEffect(() => {
    const ac = new AbortController();
    const { from, to } = getPeriodParams();
    fetchVentesStats(from, to, ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, selectedDay, selectedMonth]);

  // Re-fetch la table paginée quand la période, la recherche, le filtre ou la page changent
  useEffect(() => {
    const ac = new AbortController();
    const { from, to } = getPeriodParams();
    fetchInvoices(from, to, ac.signal);
    return () => ac.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, selectedDay, selectedMonth, currentPage, search, filter]);

  const fetchVentesStats = async (from?: string, to?: string, signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams();
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      params.set('period', period);
      const res = await fetch(`/api/factures/stats?${params}`, { signal });
      const data = await res.json();
      setVentesStats(data);
    } catch {
      // stats silently fail
    }
  };

  // Fetch products and customers once on mount
  useEffect(() => {
    const ac = new AbortController();
    Promise.all([
      fetch('/api/produits?all=true&limit=100', { signal: ac.signal }),
      fetch('/api/clients?limit=100', { signal: ac.signal }),
    ])
      .then(async ([prodRes, custRes]) => {
        const productsData = await prodRes.json();
        const customersData = await custRes.json();
        setProducts(Array.isArray(productsData.data) ? productsData.data : []);
        setCustomers(Array.isArray(customersData.data) ? customersData.data : []);
      })
      .catch(() => {});
    return () => ac.abort();
  }, []);

  const isRefreshingInvoices = isLoading && hasLoadedInvoices;

  const fetchInvoices = async (from?: string, to?: string, signal?: AbortSignal) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(ITEMS_PER_PAGE));
      if (search) params.set('search', search);
      if (filter === 'paid') params.set('type', 'paid');
      if (filter === 'partial') params.set('type', 'partial');
      if (filter === 'pending') params.set('type', 'pending');
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const invoicesRes = await fetch('/api/factures?' + params, { signal });
      const invoicesData = await invoicesRes.json();
      if (signal?.aborted) return;
      setInvoices(invoicesData.data);
      setTotal(invoicesData.total);
      setTotalPages(invoicesData.totalPages);
      setHasLoadedInvoices(true);
    } catch {
      if (signal?.aborted) return;
      toast.error('Erreur lors du chargement des donnees');
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
        setHasLoadedInvoices(true);
      }
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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la création');
      }
      toast.success('Facture créée avec succès!');
      setShowAddModal(false);
      resetForm();
      const { from, to } = getPeriodParams();
      fetchInvoices(from, to);
      fetchVentesStats(from, to);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la création');
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
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Erreur lors de la modification');
      }
      toast.success('Facture modifiée avec succès!');
      setShowEditModal(false);
      setSelectedInvoice(null);
      resetForm();
      const { from, to } = getPeriodParams();
      fetchInvoices(from, to);
      fetchVentesStats(from, to);
    } catch (err: any) {
      toast.error(err.message || 'Erreur lors de la modification');
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
      const { from, to } = getPeriodParams();
      fetchInvoices(from, to);
      fetchVentesStats(from, to);
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

  const openDeleteModal = (invoice: SalesInvoice) => {
    setSelectedInvoice(invoice);
    setShowDeleteModal(true);
  };

  function buildExportHTML(invoice: SalesInvoice): string {
    const fmt = (value: number) => new Intl.NumberFormat('fr-FR').format(value);
    const itemsHTML = invoice.items.map(item => `
      <tr>
        <td style="padding:12px;border-bottom:1px solid #e2e8f0;">${item.productName}</td>
        <td style="padding:12px;text-align:center;border-bottom:1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding:12px;text-align:right;border-bottom:1px solid #e2e8f0;">${fmt(item.unitPrice)} GNF</td>
        <td style="padding:12px;text-align:right;border-bottom:1px solid #e2e8f0;">${fmt(item.totalPrice)} GNF</td>
      </tr>
    `).join('');
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; background: rgb(255,255,255); padding: 40px; }
        </style>
      </head>
      <body>
        <div style="max-width:720px;margin:0 auto;">
          <div style="text-align:center;margin-bottom:30px;border-bottom:2px solid #1e293b;padding-bottom:20px;">
            <h1 style="font-size:28px;color:#1e293b;margin:0 0 10px 0;">FACTURE DE KORBE</h1>
            <p style="font-size:18px;color:#475569;margin:0;">N ${invoice.invoiceNumber}</p>
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
              <th style="padding:12px;text-align:center;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Qte</th>
              <th style="padding:12px;text-align:right;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Prix Unit.</th>
              <th style="padding:12px;text-align:right;font-size:12px;color:#475569;border-bottom:2px solid #e2e8f0;">Total</th>
            </tr></thead>
            <tbody>${itemsHTML}</tbody>
          </table>
          <div style="display:flex;justify-content:flex-end;margin-bottom:30px;">
            <div style="width:250px;">
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:14px;color:#475569;">Total</span>
                <span style="font-size:16px;font-weight:bold;">${fmt(invoice.totalAmount)} GNF</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:14px;color:#475569;">Avance</span>
                <span style="font-size:16px;font-weight:bold;color:#16a34a;">${fmt(invoice.amountPaid)} GNF</span>
              </div>
              <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #e2e8f0;">
                <span style="font-size:14px;color:#475569;">Reste</span>
                <span style="font-size:16px;font-weight:bold;color:#ea580c;">${fmt(invoice.remainingAmount)} GNF</span>
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
      </body>
      </html>
    `;
  }

  const handleExportPDF = async (invoice: SalesInvoice) => {
    try {
      toast.info('Generation du PDF en cours...');
      const html2canvasModule = await import('html2canvas');
      const jsPDFModule = await import('jspdf');
      const hc = html2canvasModule.default;
      const pdf = jsPDFModule.default;

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:1200px;border:none;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(buildExportHTML(invoice));
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
      pdfDoc.save('facture-' + invoice.invoiceNumber + '.pdf');

      document.body.removeChild(iframe);
      toast.success('PDF telecharge avec succes!');
    } catch (err) {
      console.error('PDF export error:', err);
      toast.error('Erreur lors de la generation du PDF');
    }
  };

  const handleExportImage = async (invoice: SalesInvoice) => {
    try {
      toast.info("Generation de l'image en cours...");
      const html2canvasModule = await import('html2canvas');
      const hc = html2canvasModule.default;

      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;height:1200px;border:none;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(buildExportHTML(invoice));
      iframeDoc.close();

      const canvas = await hc(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'rgb(255,255,255)',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = 'facture-' + invoice.invoiceNumber + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();

      document.body.removeChild(iframe);
      toast.success('Image telechargee avec succes!');
    } catch (err) {
      console.error('Image export error:', err);
      toast.error("Erreur lors de la generation de l'image");
    }
  };

  const handleShareWhatsApp = async (invoice: SalesInvoice) => {
    toast.info('Preparation du partage WhatsApp...');
    const fmt = (value: number) => new Intl.NumberFormat('fr-FR').format(value);
    const textMessage = `Facture N° ${invoice.invoiceNumber} - ${invoice.customerName}\nTotal: ${fmt(invoice.totalAmount)} GNF\nStatut: ${invoice.paymentStatus}`;
    await shareOnWhatsApp(buildExportHTML(invoice), textMessage);
  };

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

  if (isLoading && !hasLoadedInvoices && invoices.length === 0) {
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

      {/* Analytics Dashboard */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 shadow-lg shadow-black/5 backdrop-blur overflow-hidden">
        <div className="p-4 lg:p-6 border-b border-base-200/80">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-lg">Analytiques des ventes</h3>
              <p className="text-sm text-base-content/60">{total} facture(s) au total</p>
            </div>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-center">
              <FilterSelect
                value={filter}
                onChange={setFilter}
                placeholder="Tous les statuts"
                options={[
                  { value: 'paid', label: 'Payée' },
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
              {isRefreshingInvoices && (
                <span className="loading loading-spinner loading-sm text-primary" aria-label="Actualisation" />
              )}
            </div>
          </div>
        </div>

        {/* Dashboard content */}
        <div className="border-t border-base-200/80 bg-base-200/20">
          <div className="p-4 lg:p-6 space-y-4">
            {/* Period + Filter Controls */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex flex-wrap rounded-xl border border-base-300 overflow-hidden bg-base-100 shadow-sm">
                {(['today', 'total', 'year', 'month', 'week', 'day'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => { setPeriod(p); setCurrentPage(1); }}
                    className={`px-3 md:px-4 cursor-pointer py-2 text-xs font-semibold tracking-wide uppercase transition-all duration-200 ${
                      period === p
                        ? 'bg-primary text-primary-content shadow-inner'
                        : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
                    }`}
                  >
                    {p === 'today' ? 'Aujourd\'hui' : p === 'total' ? 'Total' : p === 'year' ? 'Année' : p === 'month' ? 'Mois' : p === 'week' ? 'Semaine' : 'Jour'}
                  </button>
                ))}
              </div>
              {period === 'day' && (
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="input input-bordered input-sm"
                />
              )}
              {period === 'month' && (
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="input input-bordered input-sm"
                />
              )}
            </div>

            <VentesStatsCards stats={stats} />
            <VentesChartSection stats={stats} period={period} />
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 shadow-lg shadow-black/5 backdrop-blur">
        <div className="border-b border-base-200 p-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-semibold text-lg">Historique des ventes</h3>
          <div className="flex flex-wrap rounded-lg border border-base-300 overflow-hidden bg-base-200/50 shadow-xs">
            {(['today', 'total', 'year', 'month', 'week', 'day'] as const).map((p) => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setCurrentPage(1); }}
                className={`px-2 md:px-3 py-1.5 text-xs font-semibold tracking-wide uppercase transition-all duration-200 cursor-pointer ${
                  period === p
                    ? 'bg-primary text-primary-content shadow-xs'
                    : 'text-base-content/60 hover:text-base-content hover:bg-base-200'
                }`}
              >
                {p === 'today' ? 'Aujourd\'hui' : p === 'total' ? 'Total' : p === 'year' ? 'Année' : p === 'month' ? 'Mois' : p === 'week' ? 'Semaine' : 'Jour'}
              </button>
            ))}
          </div>
          {period === 'day' && (
            <input
              type="date"
              value={selectedDay}
              onChange={(e) => { setSelectedDay(e.target.value); setCurrentPage(1); }}
              className="input input-bordered input-xs"
            />
          )}
          {period === 'month' && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => { setSelectedMonth(e.target.value); setCurrentPage(1); }}
              className="input input-bordered input-xs"
            />
          )}
        </div>
        <VentesTable
          invoices={invoices}
          total={total}
          onExportPDF={handleExportPDF}
          onExportImage={handleExportImage}
          onShareWhatsApp={handleShareWhatsApp}
          onEdit={openEditModal}
          onDelete={openDeleteModal}
        />
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      <AddInvoiceModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        formData={formData}
        onFormDataChange={setFormData}
        products={products}
        customers={customers}
        isSubmitting={isSubmitting}
        onSubmit={handleAddInvoice}
        onAddLine={addLine}
        onRemoveLine={removeLine}
        onUpdateLine={updateLine}
      />

      <EditInvoiceModal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedInvoice(null);
          resetForm();
        }}
        formData={formData}
        onFormDataChange={setFormData}
        products={products}
        customers={customers}
        isSubmitting={isSubmitting}
        onSubmit={handleEditInvoice}
        onAddLine={addLine}
        onRemoveLine={removeLine}
        onUpdateLine={updateLine}
        invoiceNumber={selectedInvoice?.invoiceNumber}
      />

      <DetailInvoiceModal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
      />

      <DeleteInvoiceModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedInvoice(null);
        }}
        invoice={selectedInvoice}
        isSubmitting={isSubmitting}
        onConfirm={handleDeleteInvoice}
      />
    </div>
  );
}
