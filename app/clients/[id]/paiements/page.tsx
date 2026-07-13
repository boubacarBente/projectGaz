'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';
import { ExportDropdown, shareOnWhatsApp } from '@/components/export-dropdown';

// ---------- types ----------
type Period = 'today' | 'day' | 'week' | 'month' | 'year' | 'total';

type Invoice = {
  id: number;
  invoiceNumber: string;
  customerName: string;
  date: string;
  paymentMethod: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: string;
  grossProfit?: number;
  items: { productName: string; productCode: string; quantity: number; unitPrice: number; totalPrice: number }[];
};

type PeriodAgg = {
  period: string;
  count: number;
  total: number;
  paid: number;
  profit: number;
};

type Customer = {
  id: number;
  name: string;
  phone: string | null;
  email?: string | null;
  city: string | null;
  totalPurchases: number | null;
};

type AggregateTotals = {
  totalInvoices: number;
  totalAmount: number;
  totalPaid: number;
  totalRemaining: number;
  totalProfit: number;
  totalItems: number;
};

type CustomerPaymentsData = {
  customer: Customer;
  invoices: Invoice[];
  aggregates: {
    all: AggregateTotals;
    byDay: PeriodAgg[];
    byWeek: PeriodAgg[];
    byMonth: PeriodAgg[];
    byYear: PeriodAgg[];
  };
};

type ProductReportRow = {
  productCode: string;
  productName: string;
  quantity: number;
  revenue: number;
};

// ---------- helpers ----------
const fCF = (v: number) => new Intl.NumberFormat('fr-FR').format(v);

function escapeHTML(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value: string) {
  if (!value) return '-';
  return new Date(value + 'T12:00:00').toLocaleDateString('fr-FR');
}

function getPeriodLabel(
  period: Period,
  selectedDay: string,
  selectedMonth: string,
  dateParams: { from?: string; to?: string },
) {
  switch (period) {
    case 'today':
      return `Aujourd'hui (${formatDate(dateParams.from || selectedDay)})`;
    case 'day':
      return `Jour du ${formatDate(selectedDay)}`;
    case 'week':
      return `Semaine du ${formatDate(dateParams.from || selectedDay)} au ${formatDate(dateParams.to || selectedDay)}`;
    case 'month': {
      const monthValue = selectedMonth || new Date().toISOString().slice(0, 7);
      const monthDate = new Date(`${monthValue}-01T12:00:00`);
      const monthLabel = monthDate.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
      return `Mois de ${monthLabel}`;
    }
    case 'year':
      return `Année ${(dateParams.from || new Date().toISOString()).slice(0, 4)}`;
    case 'total':
      return 'Total';
  }
}

function slugifyFilenamePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function waitForExportImages(doc: Document) {
  const images = Array.from(doc.images);
  if (images.length === 0) return Promise.resolve();

  return Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }),
  ).then(() => undefined);
}

function getProductReportRows(invoices: Invoice[]): ProductReportRow[] {
  const rows = new Map<string, ProductReportRow>();

  for (const invoice of invoices) {
    for (const item of invoice.items) {
      const key = item.productCode || item.productName;
      const existing = rows.get(key);

      rows.set(key, {
        productCode: item.productCode,
        productName: item.productName,
        quantity: (existing?.quantity ?? 0) + item.quantity,
        revenue: (existing?.revenue ?? 0) + item.totalPrice,
      });
    }
  }

  return Array.from(rows.values()).sort((a, b) => b.revenue - a.revenue);
}

function buildCustomerReportHTML({
  customer,
  invoices,
  totals,
  periodLabel,
}: {
  customer: Customer;
  invoices: Invoice[];
  totals: AggregateTotals;
  periodLabel: string;
}) {
  const sortedInvoices = [...invoices].sort((a, b) => b.date.localeCompare(a.date));
  const latestInvoices = sortedInvoices.slice(0, 10);
  const remainingInvoices = sortedInvoices.filter((invoice) => invoice.remainingAmount > 0).slice(0, 10);
  const products = getProductReportRows(invoices).slice(0, 12);
  const paymentRate = totals.totalAmount > 0 ? (totals.totalPaid / totals.totalAmount) * 100 : 0;
  const generatedAt = new Date().toLocaleString('fr-FR');

  const latestRows = latestInvoices.map((invoice) => `
    <tr>
      <td>${escapeHTML(invoice.invoiceNumber)}</td>
      <td>${formatDate(invoice.date)}</td>
      <td class="right">${fCF(invoice.totalAmount)} GNF</td>
      <td class="right">${fCF(invoice.amountPaid)} GNF</td>
      <td class="right ${invoice.remainingAmount > 0 ? 'warning' : 'success'}">${fCF(invoice.remainingAmount)} GNF</td>
      <td>${escapeHTML(invoice.paymentStatus)}</td>
    </tr>
  `).join('');

  const remainingRows = remainingInvoices.map((invoice) => `
    <tr>
      <td>${escapeHTML(invoice.invoiceNumber)}</td>
      <td>${formatDate(invoice.date)}</td>
      <td class="right">${fCF(invoice.totalAmount)} GNF</td>
      <td class="right danger">${fCF(invoice.remainingAmount)} GNF</td>
    </tr>
  `).join('');

  const productRows = products.map((product) => `
    <tr>
      <td><strong>${escapeHTML(product.productCode)}</strong> ${escapeHTML(product.productName)}</td>
      <td class="right">${fCF(product.quantity)}</td>
      <td class="right">${fCF(product.revenue)} GNF</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; background: rgb(255,255,255); color: #111827; padding: 36px; }
        .wrap { max-width: 760px; margin: 0 auto; }
        .header { border-bottom: 2px solid #1e293b; padding-bottom: 18px; margin-bottom: 24px; }
        .header-top { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
        .logo { width: 86px; height: 58px; object-fit: contain; }
        h1 { color: #1e293b; font-size: 28px; margin-bottom: 6px; }
        h2 { color: #1e293b; font-size: 17px; margin: 24px 0 10px; }
        p { font-size: 12px; color: #475569; line-height: 1.5; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 14px; }
        .card { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px; padding: 12px; }
        .label { color: #64748b; font-size: 11px; margin-bottom: 4px; }
        .value { color: #111827; font-size: 15px; font-weight: 700; }
        .score { display: flex; align-items: center; gap: 8px; color: #16a34a; }
        .check { display: inline-flex; width: 22px; height: 22px; align-items: center; justify-content: center; border-radius: 999px; background: #dcfce7; color: #16a34a; font-weight: 700; }
        .success { color: #16a34a; }
        .danger { color: #dc2626; }
        .warning { color: #d97706; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th { padding: 9px; text-align: left; font-size: 11px; color: #475569; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; }
        td { padding: 9px; font-size: 11px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .right { text-align: right; }
        .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="header">
          <div class="header-top">
            <div>
              <h1>Rapport client</h1>
              <p>Client : <strong>${escapeHTML(customer.name)}</strong> &nbsp; | &nbsp; Période : ${escapeHTML(periodLabel)}</p>
            </div>
            <img class="logo" src="/logo.jpeg" alt="Logo" />
          </div>
          <p>Telephone : ${escapeHTML(customer.phone || '-')} &nbsp; | &nbsp; Ville : ${escapeHTML(customer.city || '-')} &nbsp; | &nbsp; Genere le ${escapeHTML(generatedAt)}</p>
        </div>

        <div class="grid">
          <div class="card"><div class="label">Factures</div><div class="value">${fCF(totals.totalInvoices)}</div></div>
          <div class="card"><div class="label">Montant total</div><div class="value success">${fCF(totals.totalAmount)} GNF</div></div>
          <div class="card"><div class="label">Total paye</div><div class="value">${fCF(totals.totalPaid)} GNF</div></div>
          <div class="card"><div class="label">Reste à Payer</div><div class="value ${totals.totalRemaining > 0 ? 'danger' : 'success'}">${fCF(totals.totalRemaining)} GNF</div></div>
          <div class="card"><div class="label">Taux paiement</div><div class="value">${paymentRate.toFixed(1)}%</div></div>
          <div class="card"><div class="label">Rapport complet</div><div class="value score"><span class="check">✓</span><span>100%</span></div></div>
        </div>

        <h2>Situation du client</h2>
        <div class="card">
          <p>${totals.totalRemaining > 0
            ? `Ce client doit encore <strong>${fCF(totals.totalRemaining)} GNF</strong>. Priorite : relancer les factures ouvertes.`
            : 'Toutes les factures de cette période sont réglées.'}
          </p>
        </div>

        <h2>Dernieres ventes</h2>
        <table>
          <thead><tr><th>Facture</th><th>Date</th><th class="right">Montant</th><th class="right">Paye</th><th class="right">Reste</th><th>Statut</th></tr></thead>
          <tbody>${latestRows || '<tr><td colspan="6">Aucune vente sur cette période.</td></tr>'}</tbody>
        </table>

        <h2>Factures a encaisser</h2>
        <table>
          <thead><tr><th>Facture</th><th>Date</th><th class="right">Montant</th><th class="right">Reste</th></tr></thead>
          <tbody>${remainingRows || '<tr><td colspan="4">Aucun reste a encaisser.</td></tr>'}</tbody>
        </table>

        <h2>Produits achetes</h2>
        <table>
          <thead><tr><th>Produit</th><th class="right">Quantite</th><th class="right">Chiffre d'affaires</th></tr></thead>
          <tbody>${productRows || '<tr><td colspan="3">Aucun produit vendu.</td></tr>'}</tbody>
        </table>

        <div class="footer">
          <p>ProjectGaz - Rapport client</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

const statusCfg: Record<string, { label: string; cls: string }> = {
  Paye:     { label: 'Payée',      cls: 'badge-soft badge-success' },
  Payée:    { label: 'Payée',      cls: 'badge-soft badge-success' },
  Partiel:  { label: 'Partielle',  cls: 'badge-soft badge-warning' },
  'En attente': { label: 'En attente', cls: 'badge-soft badge-error' },
};

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'total', label: 'Total' },
];

function getDateParams(period: Period, selectedDay: string, selectedMonth?: string): { from?: string; to?: string } {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayStr = todayUTC.toISOString().slice(0, 10);

  switch (period) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case 'day':
      return { from: selectedDay, to: selectedDay };
    case 'week': {
      const weekStart = new Date(todayUTC);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { from: weekStart.toISOString().slice(0, 10), to: todayStr };
    }
    case 'month': {
      const monthStr = selectedMonth || todayStr.slice(0, 7);
      const year = parseInt(monthStr.slice(0, 4), 10);
      const mon = parseInt(monthStr.slice(5), 10);
      const lastDay = new Date(year, mon, 0).getDate();
      const monthEnd = monthStr + '-' + String(lastDay).padStart(2, '0');
      return { from: monthStr + '-01', to: monthEnd };
    }
    case 'year':
      return { from: todayStr.slice(0, 4) + '-01-01', to: todayStr };
    case 'total':
      return {};
  }
}

// ---------- Status Badge ----------
function StatusBadge({ status }: { status: string }) {
  const cfg = statusCfg[status] || { label: status, cls: 'badge-soft' };
  return <span className={`badge ${cfg.cls} text-xs`}>{cfg.label}</span>;
}

// ---------- Payment Method Icon ----------
function PaymentIcon({ method }: { method: string }) {
  const isCash = method === 'Espèces' || method === 'Especes';
  return (
    <span className={`inline-flex items-center justify-center w-9 h-9 rounded-xl text-sm font-bold ${
      isCash ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'
    }`}>
      {isCash ? '\u{1F4B5}' : '\u{1F4B3}'}
    </span>
  );
}

// ---------- Main Component ----------
export default function CustomerPaymentsPage() {
  const params = useParams();
  const customerId = params.id as string;

  const [data, setData] = useState<CustomerPaymentsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [showReport, setShowReport] = useState(true);
  const [period, setPeriod] = useState<Period>('total');
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 7);
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'date' | 'totalAmount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Build from/to from period and pass to API
  const dateParams = useMemo(() => getDateParams(period, selectedDay, selectedMonth), [period, selectedDay, selectedMonth]);
  const isRefreshing = loading && hasLoadedData;

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      setLoading(true);
      try {
        const qs = new URLSearchParams();
        if (dateParams.from) qs.set('from', dateParams.from);
        if (dateParams.to) qs.set('to', dateParams.to);
        const res = await fetch(`/api/clients/${customerId}/paiements?${qs.toString()}`, { signal: controller.signal });
        const d = await res.json();
        if (controller.signal.aborted) return;
        setData(d);
        setHasLoadedData(true);
      } catch (e) {
        if (controller.signal.aborted) return;
        console.error(e);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
          setHasLoadedData(true);
        }
      }
    })();
    return () => controller.abort();
  }, [customerId, dateParams]);

  const { customer, invoices, aggregates } = data || {};

  // Filter + sort invoices
  const filteredInvoices = useMemo(() => {
    if (!invoices) return [];
    let list = [...invoices];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (inv: Invoice) =>
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.date.includes(q) ||
          inv.paymentMethod.toLowerCase().includes(q) ||
          inv.paymentStatus.toLowerCase().includes(q)
      );
    }
    list.sort((a: Invoice, b: Invoice) => {
      const cmp = sortField === 'date'
        ? a.date.localeCompare(b.date)
        : a.totalAmount - b.totalAmount;
      return sortDir === 'desc' ? -cmp : cmp;
    });
    return list;
  }, [invoices, searchQuery, sortField, sortDir]);

  const toggleSort = (field: 'date' | 'totalAmount') => {
    if (sortField === field) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortField(field); setSortDir('desc'); }
  };

  // Compute card totals from the API aggregates
  const cardTotals = aggregates?.all || null;

  const periodLabel = useMemo(
    () => getPeriodLabel(period, selectedDay, selectedMonth, dateParams),
    [period, selectedDay, selectedMonth, dateParams],
  );
  const exportFileBase = useMemo(() => {
    const clientPart = customer ? slugifyFilenamePart(customer.name) : 'client';
    const periodPart = slugifyFilenamePart(periodLabel) || 'total';
    return `rapport-client-${clientPart}-${periodPart}`;
  }, [customer, periodLabel]);
  const productReportRows = useMemo(() => getProductReportRows(invoices ?? []), [invoices]);
  const latestInvoices = useMemo(
    () => [...(invoices ?? [])].sort((a: Invoice, b: Invoice) => b.date.localeCompare(a.date)).slice(0, 5),
    [invoices],
  );
  const remainingInvoices = useMemo(
    () => [...(invoices ?? [])]
      .filter((invoice: Invoice) => invoice.remainingAmount > 0)
      .sort((a: Invoice, b: Invoice) => b.remainingAmount - a.remainingAmount),
    [invoices],
  );

  const getReportHTML = () => {
    if (!customer || !cardTotals) return null;
    return buildCustomerReportHTML({
      customer,
      invoices: invoices ?? [],
      totals: cardTotals,
      periodLabel,
    });
  };

  const handleExportPDF = async () => {
    const html = getReportHTML();
    if (!html || !customer) return;

    let iframe: HTMLIFrameElement | null = null;

    try {
      toast.info('Generation du PDF en cours...');
      const html2canvasModule = await import('html2canvas');
      const jsPDFModule = await import('jspdf');
      const hc = html2canvasModule.default;
      const PDF = jsPDFModule.default;

      iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:820px;height:1400px;border:none;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();
      await waitForExportImages(iframeDoc);

      const canvas = await hc(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'rgb(255,255,255)',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdfDoc = new PDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdfDoc.internal.pageSize.getWidth();
      const pageHeight = pdfDoc.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;

      pdfDoc.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
      heightLeft -= pageHeight - (margin * 2);

      while (heightLeft > 0) {
        position -= pageHeight - (margin * 2);
        pdfDoc.addPage();
        pdfDoc.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
        heightLeft -= pageHeight - (margin * 2);
      }

      pdfDoc.save(`${exportFileBase}.pdf`);
      toast.success('PDF telecharge avec succes!');
    } catch (err) {
      console.error('Customer report PDF export error:', err);
      toast.error('Erreur lors de la generation du PDF');
    } finally {
      if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
    }
  };

  const handleExportImage = async () => {
    const html = getReportHTML();
    if (!html || !customer) return;

    let iframe: HTMLIFrameElement | null = null;

    try {
      toast.info("Generation de l'image en cours...");
      const html2canvasModule = await import('html2canvas');
      const hc = html2canvasModule.default;

      iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:820px;height:1400px;border:none;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();
      await waitForExportImages(iframeDoc);

      const canvas = await hc(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'rgb(255,255,255)',
        logging: false,
      });

      const link = document.createElement('a');
      link.download = `${exportFileBase}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();

      toast.success('Image telechargee avec succes!');
    } catch (err) {
      console.error('Customer report image export error:', err);
      toast.error("Erreur lors de la generation de l'image");
    } finally {
      if (iframe?.parentNode) iframe.parentNode.removeChild(iframe);
    }
  };

  const handleShareWhatsApp = async () => {
    const html = getReportHTML();
    if (!html || !customer || !cardTotals) return;

    toast.info('Preparation du partage WhatsApp...');
    const textMessage = `Rapport client - ${customer.name}\nTotal: ${fCF(cardTotals.totalAmount)} GNF\nReste à Payer: ${fCF(cardTotals.totalRemaining)} GNF\nPériode: ${periodLabel}`;
    await shareOnWhatsApp(html, textMessage, `${exportFileBase}.png`);
  };

  if (loading && !hasLoadedData) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-3xl bg-base-200/50 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-28 rounded-2xl bg-base-200/50 animate-pulse" />)}
        </div>
        <div className="h-96 rounded-3xl bg-base-200/50 animate-pulse" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-16 h-16 rounded-full bg-base-200 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-3.464-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
        </div>
        <h2 className="text-xl font-semibold">Client introuvable</h2>
        <Link href="/clients" className="btn btn-outline btn-sm">Retour aux clients</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ---------- Header ---------- */}
      <section className="rounded-3xl border border-base-200/80 bg-base-100/80 p-6 md:p-8 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
              Historique des paiements
            </p>
            <div className="flex items-center gap-3 mt-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-lg font-bold text-primary">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">{customer.name}</h1>
                <p className="text-sm text-base-content/50">
                  {customer.phone || '\u2014'}
                  {customer.city && <span> \u00B7 {customer.city}</span>}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowReport((value) => !value)}
              className="btn btn-primary btn-sm"
            >
              {showReport ? 'Masquer rapport' : 'Afficher rapport'}
            </button>
            <ExportDropdown
              onExportPDF={handleExportPDF}
              onExportImage={handleExportImage}
              onShareWhatsApp={handleShareWhatsApp}
              label="Rapport"
            />
            <Link href={`/clients/${customerId}`} className="btn btn-outline btn-sm gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              Profil client
            </Link>
            <Link href="/clients" className="btn btn-outline btn-sm">
              Tous les clients
            </Link>
          </div>
        </div>
      </section>

      {/* ---------- Period Selector ---------- */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-base-content/60 mr-1">Période :</span>
        <div className="join">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`join-item btn btn-sm ${
                period === p.key ? 'btn-primary' : 'btn-ghost'
              }`}
            >
              {p.label}
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
        <span className="text-xs text-base-content/40 ml-2">({periodLabel})</span>
        {isRefreshing && (
          <span className="loading loading-spinner loading-sm text-primary" aria-label="Actualisation" />
        )}
      </div>

      {/* ---------- Global Stats ---------- */}
      {cardTotals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-base-200/80 bg-base-100/60 p-5">
            <p className="text-sm font-medium text-base-content/50">Factures</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-base-content">{fCF(cardTotals.totalInvoices)}</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
          <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <p className="text-sm font-medium text-base-content/50">Montant total</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-primary">{fCF(cardTotals.totalAmount)} GNF</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
          <div className="rounded-2xl border border-base-200/80 bg-base-100/60 p-5">
            <p className="text-sm font-medium text-base-content/50">Total payé</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-base-content">{fCF(cardTotals.totalPaid)} GNF</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
          <div className="rounded-2xl border border-base-200/80 bg-base-100/60 p-5">
            <p className="text-sm font-medium text-base-content/50">Reste à Payer</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-base-content">{fCF(cardTotals.totalRemaining)} GNF</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
          <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
            <p className="text-sm font-medium text-base-content/50">Bénéfice brut</p>
            <p className={`mt-2 text-2xl font-semibold tracking-tight ${cardTotals.totalProfit >= 0 ? 'text-success' : 'text-error'}`}>{fCF(cardTotals.totalProfit)} GNF</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
          <div className="rounded-2xl border border-base-200/80 bg-base-100/60 p-5">
            <p className="text-sm font-medium text-base-content/50">Articles vendus</p>
            <p className="mt-2 text-2xl font-semibold tracking-tight text-base-content">{cardTotals.totalItems > 0 ? fCF(cardTotals.totalItems) : '\u2014'}</p>
            <p className="mt-1 text-xs text-base-content/40">{periodLabel}</p>
          </div>
        </div>
      )}

      {showReport && cardTotals && (
        <section className="rounded-3xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-primary">Rapport client</p>
              <h2 className="mt-1 text-xl font-bold">Situation complete de {customer.name}</h2>
              <p className="mt-1 text-sm text-base-content/60">
                Synthese de la periode {periodLabel.toLowerCase()} : ventes, reste à payer, produits achetes et dernieres factures.
              </p>
            </div>
            <ExportDropdown
              onExportPDF={handleExportPDF}
              onExportImage={handleExportImage}
              onShareWhatsApp={handleShareWhatsApp}
              label="Exporter"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
              <p className="text-xs text-base-content/60">Reste à Payer</p>
              <p className={`mt-2 text-xl font-bold ${cardTotals.totalRemaining > 0 ? 'text-warning' : 'text-success'}`}>
                {fCF(cardTotals.totalRemaining)} GNF
              </p>
              <p className="mt-1 text-xs text-base-content/50">
                {cardTotals.totalRemaining > 0 ? 'A encaisser' : 'Client a jour'}
              </p>
            </div>
            <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
              <p className="text-xs text-base-content/60">Taux paiement</p>
              <p className="mt-2 text-xl font-bold text-success">
                {cardTotals.totalAmount > 0 ? ((cardTotals.totalPaid / cardTotals.totalAmount) * 100).toFixed(1) : '0.0'}%
              </p>
              <p className="mt-1 text-xs text-base-content/50">{fCF(cardTotals.totalPaid)} GNF payes</p>
            </div>
            <div className="rounded-2xl border border-info/20 bg-info/5 p-4">
              <p className="text-xs text-base-content/60">Derniere vente</p>
              <p className="mt-2 text-xl font-bold text-info">
                {latestInvoices[0] ? formatDate(latestInvoices[0].date) : '-'}
              </p>
              <p className="mt-1 text-xs text-base-content/50">
                {latestInvoices[0] ? latestInvoices[0].invoiceNumber : 'Aucune facture'}
              </p>
            </div>
            <div className="rounded-2xl border border-success/20 bg-success/5 p-4">
              <p className="text-xs text-base-content/60">Rapport complet</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-success/15 text-lg font-bold text-success">
                  ✓
                </span>
                <p className="text-xl font-bold text-success">100%</p>
              </div>
              <p className="mt-1 text-xs text-base-content/50">Toutes les donnees essentielles</p>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-3">
            <div>
              <div className="mb-3">
                <h3 className="font-semibold">Dernieres ventes</h3>
                <p className="text-xs text-base-content/60">Les ventes recentes de ce client.</p>
              </div>
              {latestInvoices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/50">
                  Aucune vente.
                </div>
              ) : (
                <div className="space-y-2">
                  {latestInvoices.map((invoice) => (
                    <div key={invoice.id} className="rounded-xl border border-base-200 bg-base-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link href={`/ventes/${invoice.id}`} className="font-semibold text-primary hover:underline">
                            {invoice.invoiceNumber}
                          </Link>
                          <p className="text-xs text-base-content/50">{formatDate(invoice.date)} &middot; {invoice.paymentMethod}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{fCF(invoice.totalAmount)}</p>
                          <p className={`text-xs ${invoice.remainingAmount > 0 ? 'text-warning' : 'text-success'}`}>
                            reste {fCF(invoice.remainingAmount)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-3">
                <h3 className="font-semibold">A encaisser</h3>
                <p className="text-xs text-base-content/60">Factures avec un reste a payer.</p>
              </div>
              {remainingInvoices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/50">
                  Aucun reste a payer.
                </div>
              ) : (
                <div className="space-y-2">
                  {remainingInvoices.slice(0, 5).map((invoice) => (
                    <div key={invoice.id} className="rounded-xl border border-warning/30 bg-warning/5 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Link href={`/ventes/${invoice.id}`} className="font-semibold hover:underline">
                            {invoice.invoiceNumber}
                          </Link>
                          <p className="text-xs text-base-content/50">{formatDate(invoice.date)}</p>
                        </div>
                        <p className="font-bold text-warning">{fCF(invoice.remainingAmount)} GNF</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="mb-3">
                <h3 className="font-semibold">Produits achetes</h3>
                <p className="text-xs text-base-content/60">Produits classes par chiffre d&apos;affaires.</p>
              </div>
              {productReportRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/50">
                  Aucun produit vendu.
                </div>
              ) : (
                <div className="space-y-2">
                  {productReportRows.slice(0, 5).map((product) => (
                    <div key={`${product.productCode}-${product.productName}`} className="rounded-xl border border-base-200 bg-base-100 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <span className="badge badge-neutral badge-sm">{product.productCode}</span>
                          <p className="mt-1 text-sm font-medium">{product.productName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{fCF(product.revenue)} GNF</p>
                          <p className="text-xs text-base-content/50">{fCF(product.quantity)} unite(s)</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Search + Invoices table ---------- */}
      <section className="rounded-3xl border border-base-200/80 bg-base-100/80 shadow-lg shadow-black/5 backdrop-blur overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-base-200/60 flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4">
          <div className="relative w-full sm:w-64">
            <svg xmlns="http://www.w3.org/2000/svg" className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              type="text"
              placeholder="Rechercher une facture..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="input input-bordered input-sm w-full pl-9 text-sm"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="table text-sm">
            <thead className="bg-base-200/30">
              <tr>
                <th className="w-12"></th>
                <th>Facture</th>
                <th className="cursor-pointer select-none" onClick={() => toggleSort('date')}>
                  <span className="inline-flex items-center gap-1">
                    Date
                    {sortField === 'date' && (
                      <svg xmlns="http://www.w3.org/2000/svg" className={`h-3 w-3 transition-transform ${sortDir === 'asc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                    )}
                  </span>
                </th>
                <th>Articles</th>
                <th className="text-right">Montant</th>
                <th className="text-right">Payé</th>
                <th className="text-right">Reste</th>
                <th className="text-right">Bénéfice</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <AnimatePresence mode="popLayout">
                {filteredInvoices.length === 0 ? (
                  <tr><td colSpan={10} className="text-center py-12 text-base-content/40">Aucune facture trouvée</td></tr>
                ) : (
                  filteredInvoices.map((inv: Invoice, idx: number) => (
                    <motion.tr
                      key={inv.id}
                      layout
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2, delay: idx * 0.02 }}
                      className="group hover:bg-base-200/40 transition-colors"
                    >
                      <td><PaymentIcon method={inv.paymentMethod} /></td>
                      <td>
                        <Link href={`/ventes/${inv.id}`} className="font-medium text-primary hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="text-base-content/70 whitespace-nowrap">
                        {new Date(inv.date + 'T12:00:00').toLocaleDateString('fr-FR')}
                      </td>
                      <td className="text-base-content/70">
                        <span className="inline-flex items-center gap-1.5">
                          {inv.items.length} art.
                          <span className="text-xs text-base-content/30">&middot;</span>
                          <span className="text-xs text-base-content/40">{inv.items.reduce((s, item) => s + item.quantity, 0)} u.</span>
                        </span>
                      </td>
                      <td className="text-right font-medium tabular-nums">{fCF(inv.totalAmount)}</td>
                      <td className="text-right tabular-nums text-base-content/70">{fCF(inv.amountPaid)}</td>
                      <td className="text-right tabular-nums text-base-content/70">{fCF(inv.remainingAmount)}</td>
                      <td className={`text-right tabular-nums font-medium ${
                        (inv.grossProfit ?? 0) >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'
                      }`}>
                        {fCF(inv.grossProfit ?? 0)}
                      </td>
                      <td><StatusBadge status={inv.paymentStatus} /></td>
                      <td>
                        <Link
                          href={`/ventes/${inv.id}`}
                          className="btn btn-ghost btn-xs btn-square opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </Link>
                      </td>
                    </motion.tr>
                  ))
                )}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
