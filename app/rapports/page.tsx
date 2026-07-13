'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { RapportStatsCards } from '@/components/rapports/rapport-stats-cards';
import { RapportCharts } from '@/components/rapports/rapport-charts';
import { RapportProductTable } from '@/components/rapports/rapport-product-table';
import { RapportTopCustomers } from '@/components/rapports/rapport-top-customers';
import { RapportExecutiveSummary } from '@/components/rapports/rapport-executive-summary';
import { RapportComparison } from '@/components/rapports/rapport-comparison';
import { RapportDebts } from '@/components/rapports/rapport-debts';
import { RapportStockInsights } from '@/components/rapports/rapport-stock-insights';
import type { Period, RapportData, RapportPaymentStatus } from '@/lib/rapports-types';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Annee' },
  { key: 'custom', label: 'Personnalise' },
  { key: 'total', label: 'Total' },
];

const PAYMENT_STATUS_OPTIONS: { key: RapportPaymentStatus; label: string }[] = [
  { key: 'all', label: 'Tous statuts' },
  { key: 'paid', label: 'Payees' },
  { key: 'partial', label: 'Partielles' },
  { key: 'pending', label: 'En attente' },
  { key: 'unpaid', label: 'Impayees' },
];

type FilterOption = {
  id: number;
  label: string;
};

type FilterOptions = {
  products: FilterOption[];
  customers: FilterOption[];
  suppliers: FilterOption[];
};

function getDateParams(
  period: Period,
  selectedDay: string,
  selectedMonth?: string,
  customFrom?: string,
  customTo?: string,
): { from?: string; to?: string } {
  const now = new Date();
  const todayUTC = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const todayStr = todayUTC.toISOString().slice(0, 10);
  switch (period) {
    case 'today': return { from: todayStr, to: todayStr };
    case 'day': return { from: selectedDay, to: selectedDay };
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
      return { from: monthStr + '-01', to: monthStr + '-' + String(lastDay).padStart(2, '0') };
    }
    case 'year': return { from: todayStr.slice(0, 4) + '-01-01', to: todayStr };
    case 'custom': return { from: customFrom || undefined, to: customTo || undefined };
    case 'total': return {};
    default: return {};
  }
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toDateString(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getPreviousDateParams(params: { from?: string; to?: string }) {
  if (!params.from || !params.to) return {};

  const fromDate = new Date(`${params.from}T00:00:00`);
  const toDate = new Date(`${params.to}T00:00:00`);
  if (Number.isNaN(fromDate.getTime()) || Number.isNaN(toDate.getTime())) return {};

  const days = Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1);
  const previousTo = addDays(fromDate, -1);
  const previousFrom = addDays(previousTo, -(days - 1));

  return {
    previousFrom: toDateString(previousFrom),
    previousTo: toDateString(previousTo),
  };
}

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

function escapeHTML(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatExportCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

function formatExportDate(value: string) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('fr-FR');
}

function buildRapportExportHTML(report: RapportData, periodLabel: string): string {
  const fmt = formatExportCurrency;
  const generatedAt = new Date().toLocaleString('fr-FR');
  const comparisonRows = report.comparison
    ? `
      <tr><td>Ventes</td><td>${fmt(report.comparison.current.totalSales)} GNF</td><td>${fmt(report.comparison.previous.totalSales)} GNF</td><td>${report.comparison.changes.totalSales.toFixed(1)}%</td></tr>
      <tr><td>Benefice</td><td>${fmt(report.comparison.current.grossProfit)} GNF</td><td>${fmt(report.comparison.previous.grossProfit)} GNF</td><td>${report.comparison.changes.grossProfit.toFixed(1)}%</td></tr>
      <tr><td>Achats</td><td>${fmt(report.comparison.current.totalPurchases)} GNF</td><td>${fmt(report.comparison.previous.totalPurchases)} GNF</td><td>${report.comparison.changes.totalPurchases.toFixed(1)}%</td></tr>
      <tr><td>Bouteilles</td><td>${report.comparison.current.totalBottlesSold}</td><td>${report.comparison.previous.totalBottlesSold}</td><td>${report.comparison.changes.totalBottlesSold.toFixed(1)}%</td></tr>
    `
    : '<tr><td colspan="4">Comparaison non disponible pour cette periode.</td></tr>';

  const productRows = report.productMargins.slice(0, 20).map((product) => `
    <tr>
      <td><strong>${escapeHTML(product.productCode)}</strong> ${escapeHTML(product.productName)}</td>
      <td class="right">${product.quantity}</td>
      <td class="right">${fmt(product.revenue)} GNF</td>
      <td class="right">${fmt(product.estimatedCost)} GNF</td>
      <td class="right ${product.grossProfit >= 0 ? 'success' : 'danger'}">${fmt(product.grossProfit)} GNF</td>
      <td class="right">${product.marginRate.toFixed(1)}%</td>
    </tr>
  `).join('');

  const receivableRows = report.receivables.slice(0, 12).map((item) => `
    <tr>
      <td>${escapeHTML(item.customerName)}</td>
      <td class="right">${item.invoiceCount}</td>
      <td class="right">${fmt(item.totalAmount)} GNF</td>
      <td class="right">${fmt(item.amountPaid)} GNF</td>
      <td class="right danger">${fmt(item.remainingAmount)} GNF</td>
      <td class="right">${formatExportDate(item.lastInvoiceDate)}</td>
    </tr>
  `).join('');

  const payableRows = report.payables.slice(0, 12).map((item) => `
    <tr>
      <td>${escapeHTML(item.supplierName)}</td>
      <td class="right">${item.invoiceCount}</td>
      <td class="right danger">${fmt(item.totalAmount)} GNF</td>
      <td class="right">${formatExportDate(item.lastInvoiceDate)}</td>
    </tr>
  `).join('');

  const reorderRows = report.stockInsights.reorderSuggestions.slice(0, 12).map((item) => `
    <tr>
      <td><strong>${escapeHTML(item.productCode)}</strong> ${escapeHTML(item.productName)}</td>
      <td class="right">${item.stock}</td>
      <td class="right">${item.stockMin}</td>
      <td class="right warning">${item.suggestedOrder}</td>
    </tr>
  `).join('');

  const topCustomersRows = report.topCustomers.slice(0, 8).map((customer, index) => `
    <tr>
      <td>${index + 1}</td>
      <td>${escapeHTML(customer.name)}</td>
      <td class="right">${customer.invoiceCount}</td>
      <td class="right">${fmt(customer.totalSpent)} GNF</td>
      <td class="right">${fmt(customer.remainingAmount)} GNF</td>
    </tr>
  `).join('');

  const movingRows = report.stockInsights.fastestMovingProducts.slice(0, 8).map((product) => `
    <tr>
      <td><strong>${escapeHTML(product.productCode)}</strong> ${escapeHTML(product.productName)}</td>
      <td class="right">${product.quantity}</td>
      <td class="right">${product.stock}</td>
    </tr>
  `).join('');

  const slowRows = report.stockInsights.slowMovingProducts.slice(0, 8).map((product) => `
    <tr>
      <td><strong>${escapeHTML(product.productCode)}</strong> ${escapeHTML(product.productName)}</td>
      <td class="right">${product.stock}</td>
      <td class="right">${fmt(product.stockValue)} GNF</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: Arial, Helvetica, sans-serif; background: rgb(255,255,255); color: #111827; padding: 34px; }
        .wrap { max-width: 760px; margin: 0 auto; }
        .header { border-bottom: 2px solid #1e293b; padding-bottom: 18px; margin-bottom: 24px; }
        h1 { color: #1e293b; font-size: 28px; margin-bottom: 6px; }
        h2 { color: #1e293b; font-size: 17px; margin: 24px 0 10px; }
        p { font-size: 12px; color: #475569; line-height: 1.5; }
        .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-bottom: 16px; }
        .card { border: 1px solid #e2e8f0; background: #f8fafc; border-radius: 8px; padding: 12px; }
        .label { color: #64748b; font-size: 11px; margin-bottom: 4px; }
        .value { color: #111827; font-size: 15px; font-weight: 700; }
        .success { color: #16a34a; }
        .danger { color: #dc2626; }
        .warning { color: #d97706; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        th { padding: 9px; text-align: left; font-size: 11px; color: #475569; background: #f1f5f9; border-bottom: 2px solid #e2e8f0; }
        td { padding: 9px; font-size: 11px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
        .right { text-align: right; }
        .split { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .footer { margin-top: 30px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; }
      </style>
    </head>
    <body>
      <div class="wrap">
        <div class="header">
          <h1>Rapport analytique</h1>
          <p>Periode : ${escapeHTML(periodLabel)} &nbsp; | &nbsp; Genere le ${escapeHTML(generatedAt)}</p>
        </div>

        <div class="grid">
          <div class="card"><div class="label">Total ventes</div><div class="value success">${fmt(report.summary.totalSales)} GNF</div></div>
          <div class="card"><div class="label">Total achats</div><div class="value">${fmt(report.summary.totalPurchases)} GNF</div></div>
          <div class="card"><div class="label">Benefice brut</div><div class="value ${report.summary.grossProfit >= 0 ? 'success' : 'danger'}">${fmt(report.summary.grossProfit)} GNF</div></div>
          <div class="card"><div class="label">Marge brute</div><div class="value">${report.summary.grossMarginRate.toFixed(1)}%</div></div>
          <div class="card"><div class="label">A encaisser</div><div class="value warning">${fmt(report.summary.totalReceivables)} GNF</div></div>
          <div class="card"><div class="label">A payer</div><div class="value danger">${fmt(report.summary.totalPayables)} GNF</div></div>
        </div>

        <h2>Resume decisionnel</h2>
        <div class="grid">
          <div class="card"><div class="label">Produit leader</div><div class="value">${report.decisionSummary.bestProduct ? `${escapeHTML(report.decisionSummary.bestProduct.productCode)} - ${escapeHTML(report.decisionSummary.bestProduct.productName)}` : 'Aucun'}</div></div>
          <div class="card"><div class="label">Meilleur client</div><div class="value">${escapeHTML(report.decisionSummary.bestCustomer?.name ?? 'Aucun')}</div></div>
          <div class="card"><div class="label">Stock critique</div><div class="value warning">${report.decisionSummary.lowStockCount}</div></div>
        </div>

        <h2>Comparaison periode precedente</h2>
        <table>
          <thead><tr><th>Indicateur</th><th class="right">Actuel</th><th class="right">Avant</th><th class="right">Variation</th></tr></thead>
          <tbody>${comparisonRows}</tbody>
        </table>

        <h2>Marge par produit</h2>
        <table>
          <thead><tr><th>Produit</th><th class="right">Qte</th><th class="right">CA</th><th class="right">Cout</th><th class="right">Benefice</th><th class="right">Marge</th></tr></thead>
          <tbody>${productRows || '<tr><td colspan="6">Aucune vente sur cette periode.</td></tr>'}</tbody>
        </table>

        <h2>Dettes clients</h2>
        <table>
          <thead><tr><th>Client</th><th class="right">Factures</th><th class="right">Total</th><th class="right">Paye</th><th class="right">Reste</th><th class="right">Derniere</th></tr></thead>
          <tbody>${receivableRows || '<tr><td colspan="6">Aucun reste client sur cette periode.</td></tr>'}</tbody>
        </table>

        <h2>Achats non payes</h2>
        <table>
          <thead><tr><th>Fournisseur</th><th class="right">Factures</th><th class="right">Montant</th><th class="right">Derniere</th></tr></thead>
          <tbody>${payableRows || '<tr><td colspan="4">Aucune facture fournisseur impayee.</td></tr>'}</tbody>
        </table>

        <h2>Analyse stock</h2>
        <div class="grid">
          <div class="card"><div class="label">Stock total</div><div class="value">${report.stockInsights.totalStock}</div></div>
          <div class="card"><div class="label">Valeur stock</div><div class="value">${fmt(report.stockInsights.totalStockValue)} GNF</div></div>
          <div class="card"><div class="label">Ruptures</div><div class="value danger">${report.stockInsights.outOfStockCount}</div></div>
        </div>
        <div class="split">
          <div>
            <h2>Produits les plus vendus</h2>
            <table><thead><tr><th>Produit</th><th class="right">Qte</th><th class="right">Stock</th></tr></thead><tbody>${movingRows || '<tr><td colspan="3">Aucun mouvement.</td></tr>'}</tbody></table>
          </div>
          <div>
            <h2>Produits immobiles</h2>
            <table><thead><tr><th>Produit</th><th class="right">Stock</th><th class="right">Valeur</th></tr></thead><tbody>${slowRows || '<tr><td colspan="3">Aucun produit immobile.</td></tr>'}</tbody></table>
          </div>
        </div>

        <h2>Suggestions de reapprovisionnement</h2>
        <table>
          <thead><tr><th>Produit</th><th class="right">Stock</th><th class="right">Min</th><th class="right">Suggere</th></tr></thead>
          <tbody>${reorderRows || '<tr><td colspan="4">Aucune alerte de reapprovisionnement.</td></tr>'}</tbody>
        </table>

        <h2>Top clients</h2>
        <table>
          <thead><tr><th>#</th><th>Client</th><th class="right">Factures</th><th class="right">CA</th><th class="right">Reste</th></tr></thead>
          <tbody>${topCustomersRows || '<tr><td colspan="5">Aucun client.</td></tr>'}</tbody>
        </table>

        <div class="footer">
          <p>ProjectGaz - Rapport de gestion</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

export default function RapportsPage() {
  const [data, setData] = useState<RapportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  const [period, setPeriod] = useState<Period>('total');
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    products: [],
    customers: [],
    suppliers: [],
  });
  const [selectedProductId, setSelectedProductId] = useState('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState('all');
  const [selectedSupplierId, setSelectedSupplierId] = useState('all');
  const [paymentStatus, setPaymentStatus] = useState<RapportPaymentStatus>('all');
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 7);
  });
  const [customFrom, setCustomFrom] = useState(() => {
    const now = new Date();
    const firstDay = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    return firstDay.toISOString().slice(0, 10);
  });
  const [customTo, setCustomTo] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
  });

  const params = useMemo(
    () => getDateParams(period, selectedDay, selectedMonth, customFrom, customTo),
    [period, selectedDay, selectedMonth, customFrom, customTo],
  );
  const previousParams = useMemo(() => getPreviousDateParams(params), [params]);
  const isRefreshing = isLoading && hasLoadedData;

  useEffect(() => {
    const ac = new AbortController();

    async function fetchFilterOptions() {
      try {
        const [productsRes, customersRes, suppliersRes] = await Promise.all([
          fetch('/api/produits?all=true&limit=100000', { signal: ac.signal }),
          fetch('/api/clients?limit=100000', { signal: ac.signal }),
          fetch('/api/fournisseurs?limit=100000', { signal: ac.signal }),
        ]);

        if (ac.signal.aborted) return;

        const [productsJson, customersJson, suppliersJson] = await Promise.all([
          productsRes.json(),
          customersRes.json(),
          suppliersRes.json(),
        ]);

        if (ac.signal.aborted) return;

        setFilterOptions({
          products: (productsJson.data ?? []).map((product: { id: number; code: string; name: string }) => ({
            id: product.id,
            label: `${product.code} - ${product.name}`,
          })),
          customers: (customersJson.data ?? []).map((customer: { id: number; name: string }) => ({
            id: customer.id,
            label: customer.name,
          })),
          suppliers: (suppliersJson.data ?? []).map((supplier: { id: number; name: string }) => ({
            id: supplier.id,
            label: supplier.name,
          })),
        });
      } catch {
        if (ac.signal.aborted) return;
      }
    }

    fetchFilterOptions();
    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    async function fetchData() {
      setIsLoading(true);
      try {
        const qs = new URLSearchParams();
        if (params.from) qs.set('from', params.from);
        if (params.to) qs.set('to', params.to);
        if (previousParams.previousFrom) qs.set('previousFrom', previousParams.previousFrom);
        if (previousParams.previousTo) qs.set('previousTo', previousParams.previousTo);
        if (selectedProductId !== 'all') qs.set('productId', selectedProductId);
        if (selectedCustomerId !== 'all') qs.set('customerId', selectedCustomerId);
        if (selectedSupplierId !== 'all') qs.set('supplierId', selectedSupplierId);
        if (paymentStatus !== 'all') qs.set('paymentStatus', paymentStatus);
        const res = await fetch('/api/rapports?' + qs.toString(), { signal: ac.signal });
        if (ac.signal.aborted) return;
        setData(await res.json());
        setHasLoadedData(true);
      } catch {
        if (ac.signal.aborted) return;
        /* silent */
      } finally {
        if (!ac.signal.aborted) {
          setIsLoading(false);
          setHasLoadedData(true);
        }
      }
    }
    fetchData();
    return () => ac.abort();
  }, [params, previousParams, selectedProductId, selectedCustomerId, selectedSupplierId, paymentStatus]);

  const periodLabel = PERIODS.find((p) => p.key === period)?.label || 'Total';

  const handleExportPDF = async () => {
    if (!data) return;

    setIsExportingPDF(true);
    let iframe: HTMLIFrameElement | null = null;

    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;left:-9999px;top:0;width:820px;height:1800px;border:none;';
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error('Cannot access iframe document');

      iframeDoc.open();
      iframeDoc.write(buildRapportExportHTML(data, periodLabel));
      iframeDoc.close();

      const canvas = await html2canvas(iframeDoc.body, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: 'rgb(255,255,255)',
        logging: false,
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - (margin * 2);
      const imgHeight = (canvas.height * contentWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = margin;

      pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
      heightLeft -= pageHeight - (margin * 2);

      while (heightLeft > 0) {
        position -= pageHeight - (margin * 2);
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', margin, position, contentWidth, imgHeight);
        heightLeft -= pageHeight - (margin * 2);
      }

      pdf.save(`rapport-${periodLabel.toLowerCase()}.pdf`);
    } catch (error) {
      console.error('Rapport PDF export error:', error);
    } finally {
      if (iframe && iframe.parentNode) {
        iframe.parentNode.removeChild(iframe);
      }
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = () => {
    if (!data) return;

    const rows: string[][] = [
      ['Rapport', periodLabel],
      ['Total ventes', String(data.summary.totalSales)],
      ['Total achats', String(data.summary.totalPurchases)],
      ['Benefice brut', String(data.summary.grossProfit)],
      ['Marge %', String(data.summary.grossMarginRate)],
      ['A encaisser', String(data.summary.totalReceivables)],
      ['A payer', String(data.summary.totalPayables)],
      [],
      ['Produits', 'Quantite', 'CA', 'Cout estime', 'Benefice', 'Marge %', 'Stock'],
      ...data.productMargins.map((product) => [
        `${product.productCode} ${product.productName}`,
        String(product.quantity),
        String(product.revenue),
        String(product.estimatedCost),
        String(product.grossProfit),
        String(product.marginRate),
        String(product.stock),
      ]),
      [],
      ['Clients a encaisser', 'Factures', 'Total', 'Paye', 'Reste', 'Derniere facture'],
      ...data.receivables.map((item) => [
        item.customerName,
        String(item.invoiceCount),
        String(item.totalAmount),
        String(item.amountPaid),
        String(item.remainingAmount),
        item.lastInvoiceDate,
      ]),
      [],
      ['Fournisseurs a payer', 'Factures', 'Montant', 'Derniere facture'],
      ...data.payables.map((item) => [
        item.supplierName,
        String(item.invoiceCount),
        String(item.totalAmount),
        item.lastInvoiceDate,
      ]),
      [],
      ['Reapprovisionnement', 'Stock', 'Stock min', 'Quantite suggeree'],
      ...data.stockInsights.reorderSuggestions.map((item) => [
        `${item.productCode} ${item.productName}`,
        String(item.stock),
        String(item.stockMin),
        String(item.suggestedOrder),
      ]),
    ];

    const csv = rows.map((row) => row.map(csvCell).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rapport-${periodLabel.toLowerCase()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if ((isLoading && !hasLoadedData) || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rapports"
        title="Tableau de bord analytique"
        description="Analyse detaillee des performances commerciales et financieres."
      />

      <section className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-base-content/60">Periode</span>
              <div className="flex flex-wrap gap-1">
                {PERIODS.map((p) => (
                  <button
                    key={p.key}
                    onClick={() => setPeriod(p.key)}
                    className={'btn btn-sm ' + (period === p.key ? 'btn-primary' : 'btn-ghost')}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              {isRefreshing && (
                <span className="loading loading-spinner loading-sm text-primary" aria-label="Actualisation" />
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="btn btn-sm btn-outline"
              >
                {isExportingPDF ? 'PDF...' : 'PDF'}
              </button>
              <button type="button" onClick={handleExportExcel} className="btn btn-sm btn-outline">
                Excel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            {period === 'day' && (
              <label className="form-control">
                <span className="label-text">Jour</span>
                <input
                  type="date"
                  value={selectedDay}
                  onChange={(e) => setSelectedDay(e.target.value)}
                  className="input input-bordered input-sm"
                />
              </label>
            )}
            {period === 'month' && (
              <label className="form-control">
                <span className="label-text">Mois</span>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="input input-bordered input-sm"
                />
              </label>
            )}
            {period === 'custom' && (
              <>
                <label className="form-control">
                  <span className="label-text">Du</span>
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="input input-bordered input-sm"
                  />
                </label>
                <label className="form-control">
                  <span className="label-text">Au</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="input input-bordered input-sm"
                  />
                </label>
              </>
            )}

            <label className="form-control">
              <span className="label-text">Produit</span>
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="select select-bordered select-sm"
              >
                <option value="all">Tous les produits</option>
                {filterOptions.products.map((product) => (
                  <option key={product.id} value={product.id}>{product.label}</option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text">Client</span>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="select select-bordered select-sm"
              >
                <option value="all">Tous les clients</option>
                {filterOptions.customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.label}</option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text">Fournisseur</span>
              <select
                value={selectedSupplierId}
                onChange={(e) => setSelectedSupplierId(e.target.value)}
                className="select select-bordered select-sm"
              >
                <option value="all">Tous les fournisseurs</option>
                {filterOptions.suppliers.map((supplier) => (
                  <option key={supplier.id} value={supplier.id}>{supplier.label}</option>
                ))}
              </select>
            </label>

            <label className="form-control">
              <span className="label-text">Statut paiement</span>
              <select
                value={paymentStatus}
                onChange={(e) => setPaymentStatus(e.target.value as RapportPaymentStatus)}
                className="select select-bordered select-sm"
              >
                {PAYMENT_STATUS_OPTIONS.map((status) => (
                  <option key={status.key} value={status.key}>{status.label}</option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </section>

      <div id="rapport-export-area" className="space-y-6 bg-base-100">
        <RapportExecutiveSummary decisionSummary={data.decisionSummary} />
        <RapportComparison comparison={data.comparison} />
        <RapportStatsCards summary={data.summary} periodLabel={periodLabel} stockInsights={data.stockInsights} />
        <RapportCharts monthlyData={data.monthlyData} soldByProduct={data.soldByProduct} />
        <RapportDebts
          receivables={data.receivables}
          payables={data.payables}
          totalReceivables={data.summary.totalReceivables}
          totalPayables={data.summary.totalPayables}
        />
        <RapportStockInsights stockInsights={data.stockInsights} />
        <RapportTopCustomers topCustomers={data.topCustomers} />
        <RapportProductTable
          productMargins={data.productMargins}
          totalSales={data.summary.totalSales}
          periodLabel={periodLabel}
        />
      </div>
    </div>
  );
}
