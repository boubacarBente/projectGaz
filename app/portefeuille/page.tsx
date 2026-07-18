'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { useSearchFilter, SearchBar, FilterSelect, Pagination } from '@/components/search-filter';
import { Modal } from '@/components/modal';
import { ResponsiveTable, type Column } from '@/components/responsive-table';
import { ExportDropdown, shareOnWhatsApp } from '@/components/export-dropdown';

type Transaction = {
  id: number;
  amount: number;
  type: 'income' | 'expense';
  description: string | null;
  balanceAfter: number;
  createdAt: string;
  updatedAt: string;
};

type Summary = {
  currentBalance: number;
  totalIncome: number;
  totalExpense: number;
  transactionsCount: number;
};

type Period = 'today' | 'day' | 'week' | 'month' | 'year' | 'total';

type WalletReportData = {
  transactions: Transaction[];
  summary: Summary;
};

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
  { key: 'total', label: 'Total' },
];

const WALLET_REPORT_TRANSACTION_LIMIT = 15;

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function formatDate(ts: string) {
  const d = new Date(ts);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHTML(value: string | number | null | undefined) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function toDateInputValue(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return toDateInputValue(new Date());

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDateParams(period: Period, selectedDay: string, selectedMonth?: string): { from?: string; to?: string } {
  const now = new Date();
  const todayStr = toDateInputValue(now);

  switch (period) {
    case 'today':
      return { from: todayStr, to: todayStr };
    case 'day': {
      const dayStr = selectedDay || todayStr;
      return { from: dayStr, to: dayStr };
    }
    case 'week': {
      const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      return { from: toDateInputValue(weekStart), to: todayStr };
    }
    case 'month': {
      const monthStr = selectedMonth || todayStr.slice(0, 7);
      const year = parseInt(monthStr.slice(0, 4), 10);
      const month = parseInt(monthStr.slice(5), 10);
      const lastDay = new Date(year, month, 0).getDate();
      return { from: `${monthStr}-01`, to: `${monthStr}-${String(lastDay).padStart(2, '0')}` };
    }
    case 'year':
      return { from: `${todayStr.slice(0, 4)}-01-01`, to: todayStr };
    case 'total':
      return {};
  }
}

function getDetailedPeriodLabel(
  period: Period,
  selectedMonth: string,
  dateParams: { from?: string; to?: string },
) {
  const from = dateParams.from ? formatDate(`${dateParams.from}T12:00:00`) : '';
  const to = dateParams.to ? formatDate(`${dateParams.to}T12:00:00`) : '';

  switch (period) {
    case 'today':
      return `Aujourd'hui (${from})`;
    case 'day':
      return `Journée du ${from}`;
    case 'week':
      return `Du ${from} au ${to}`;
    case 'month': {
      const month = new Date(`${selectedMonth || toDateInputValue(new Date()).slice(0, 7)}-01T12:00:00`);
      return month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
    }
    case 'year':
      return `Année ${dateParams.from?.slice(0, 4) || new Date().getFullYear()}`;
    case 'total':
      return 'Toutes les transactions';
  }
}

function waitForExportImages(doc: Document) {
  return Promise.all(
    Array.from(doc.images).map((image) => {
      if (image.complete) return Promise.resolve();

      return new Promise<void>((resolve) => {
        image.addEventListener('load', () => resolve(), { once: true });
        image.addEventListener('error', () => resolve(), { once: true });
      });
    }),
  ).then(() => undefined);
}

async function renderWalletReport(html: string) {
  const { default: html2canvas } = await import('html2canvas');
  const reportWidth = 900;
  const iframe = document.createElement('iframe');
  iframe.style.cssText = `position:fixed;left:-9999px;top:0;width:${reportWidth}px;height:1px;border:none;`;
  document.body.appendChild(iframe);

  try {
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error('Impossible de préparer le rapport');

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();
    await waitForExportImages(iframeDoc);
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));

    const reportHeight = Math.ceil(Math.max(
      iframeDoc.documentElement.scrollHeight,
      iframeDoc.body.scrollHeight,
      iframeDoc.documentElement.offsetHeight,
      iframeDoc.body.offsetHeight,
    ));
    iframe.style.height = `${reportHeight}px`;

    return await html2canvas(iframeDoc.body, {
      scale: 2,
      width: reportWidth,
      height: reportHeight,
      windowWidth: reportWidth,
      windowHeight: reportHeight,
      useCORS: true,
      allowTaint: true,
      backgroundColor: 'rgb(255,255,255)',
      logging: false,
    });
  } finally {
    iframe.remove();
  }
}

function buildWalletReportHTML({
  transactions,
  summary,
  periodLabel,
}: WalletReportData & { periodLabel: string }) {
  const sortedTransactions = [...transactions].sort((a, b) => (
    b.createdAt.localeCompare(a.createdAt) || b.id - a.id
  ));
  const displayedTransactions = sortedTransactions.slice(0, WALLET_REPORT_TRANSACTION_LIMIT);
  const incomeTransactions = transactions.filter((transaction) => transaction.type === 'income');
  const expenseTransactions = transactions.filter((transaction) => transaction.type === 'expense');
  const generatedAt = new Date().toLocaleString('fr-FR');
  const hiddenTransactionsCount = Math.max(0, summary.transactionsCount - displayedTransactions.length);

  const rows = displayedTransactions.map((transaction) => `
    <tr>
      <td>${formatDate(transaction.createdAt)}</td>
      <td><span class="type ${transaction.type}">${transaction.type === 'income' ? 'Entrée' : 'Sortie'}</span></td>
      <td>${escapeHTML(transaction.description || 'Sans description')}</td>
      <td class="right ${transaction.type === 'income' ? 'success' : 'danger'}">
        ${transaction.type === 'income' ? '+' : '-'}${formatCurrency(transaction.amount)} GNF
      </td>
      <td class="right">${formatCurrency(transaction.balanceAfter)} GNF</td>
    </tr>
  `).join('');

  return `<!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, Helvetica, sans-serif; background: #ffffff; color: #111827; padding: 30px 34px; }
          .wrap { max-width: 832px; margin: 0 auto; }
          .header { border-bottom: 2px solid #1e293b; margin-bottom: 20px; padding-bottom: 16px; }
          .header-top { display: flex; align-items: center; justify-content: space-between; gap: 18px; }
          .logo { width: 92px; height: 62px; object-fit: contain; }
          h1 { color: #1e293b; font-size: 32px; line-height: 1.15; margin-bottom: 6px; }
          h2 { color: #1e293b; font-size: 22px; margin: 26px 0 12px; }
          p { color: #475569; font-size: 14px; line-height: 1.5; }
          .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; }
          .card { border: 1px solid #dbe4ef; background: #f8fafc; border-radius: 8px; padding: 14px; }
          .label { color: #64748b; font-size: 12px; margin-bottom: 7px; }
          .value { color: #111827; font-size: 19px; font-weight: 700; }
          .success { color: #15803d; }
          .danger { color: #dc2626; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          th { padding: 11px 8px; text-align: left; font-size: 12px; color: #475569; background: #eef3f8; border-bottom: 2px solid #dbe4ef; }
          td { padding: 10px 8px; font-size: 12px; line-height: 1.35; border-bottom: 1px solid #e2e8f0; vertical-align: middle; }
          tr { break-inside: avoid; }
          tbody tr:nth-child(even) { background: #fcfdff; }
          .right { text-align: right; white-space: nowrap; }
          .type { display: inline-block; min-width: 58px; text-align: center; border-radius: 999px; padding: 4px 8px; font-size: 11px; font-weight: 700; }
          .type.income { color: #166534; background: #dcfce7; }
          .type.expense { color: #991b1b; background: #fee2e2; }
          .note { margin-top: 12px; color: #64748b; font-size: 12px; }
          .footer { margin-top: 24px; padding-top: 14px; border-top: 1px solid #e2e8f0; text-align: center; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <header class="header">
            <div class="header-top">
              <div>
                <h1>Rapport du portefeuille</h1>
                <p>Période : <strong>${escapeHTML(periodLabel)}</strong></p>
              </div>
              <img class="logo" src="/logo.jpeg" alt="Logo Gestion Gaz" />
            </div>
            <p>Généré le ${escapeHTML(generatedAt)}</p>
          </header>

          <section class="grid">
            <div class="card"><div class="label">Solde net de la période</div><div class="value ${summary.currentBalance >= 0 ? 'success' : 'danger'}">${formatCurrency(summary.currentBalance)} GNF</div></div>
            <div class="card"><div class="label">Total des entrées</div><div class="value success">${formatCurrency(summary.totalIncome)} GNF</div></div>
            <div class="card"><div class="label">Total des sorties</div><div class="value danger">${formatCurrency(summary.totalExpense)} GNF</div></div>
            <div class="card"><div class="label">Transactions</div><div class="value">${formatCurrency(summary.transactionsCount)}</div></div>
            <div class="card"><div class="label">Nombre d'entrées</div><div class="value success">${formatCurrency(incomeTransactions.length)}</div></div>
            <div class="card"><div class="label">Nombre de sorties</div><div class="value danger">${formatCurrency(expenseTransactions.length)}</div></div>
          </section>

          <h2>Détail des transactions</h2>
          <table>
            <thead>
              <tr><th>Date</th><th>Type</th><th>Description</th><th class="right">Montant</th><th class="right">Solde après</th></tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="5">Aucune transaction sur cette période.</td></tr>'}</tbody>
          </table>
          ${hiddenTransactionsCount > 0 ? `<p class="note">Le détail affiche les ${WALLET_REPORT_TRANSACTION_LIMIT} transactions les plus récentes sur ${formatCurrency(summary.transactionsCount)}. Les totaux restent calculés sur toute la période.</p>` : ''}

          <footer class="footer">
            <p>Gestion Gaz — Rapport financier du portefeuille</p>
          </footer>
        </div>
      </body>
    </html>`;
}

export default function PortefeuillePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [period, setPeriod] = useState<Period>('total');
  const [selectedDay, setSelectedDay] = useState(() => toDateInputValue(new Date()));
  const [selectedMonth, setSelectedMonth] = useState(() => toDateInputValue(new Date()).slice(0, 7));
  const hasLoadedRef = useRef(false);
  const requestIdRef = useRef(0);

  // Formulaire
  const [formType, setFormType] = useState<'income' | 'expense'>('income');
  const [formAmount, setFormAmount] = useState('');
  const [formDate, setFormDate] = useState(() => toDateInputValue(new Date()));
  const [formDescription, setFormDescription] = useState('');

  const { search, setSearch, filter, setFilter, currentPage, setCurrentPage } = useSearchFilter(
    transactions,
    ['description'],
  );

  const ITEMS_PER_PAGE = 15;
  const dateParams = useMemo(
    () => getDateParams(period, selectedDay, selectedMonth),
    [period, selectedDay, selectedMonth],
  );
  const periodLabel = PERIODS.find((p) => p.key === period)?.label || 'Total';
  const reportPeriodLabel = useMemo(
    () => getDetailedPeriodLabel(period, selectedMonth, dateParams),
    [period, selectedMonth, dateParams],
  );
  const reportFileName = useMemo(() => {
    const datePart = dateParams.from
      ? `${dateParams.from}${dateParams.to && dateParams.to !== dateParams.from ? `-${dateParams.to}` : ''}`
      : 'total';
    return `rapport-portefeuille-${datePart}`;
  }, [dateParams]);
  const isPeriodFiltered = period !== 'total';

  const transactionColumns = useMemo<Column<Transaction>[]>(() => [
    { key: 'date', label: 'Date', render: (tx) => <span className="text-sm">{formatDate(tx.createdAt)}</span>, primary: true },
    { key: 'type', label: 'Type', render: (tx) => (
      tx.type === 'income' ? (
        <span className="badge badge-success badge-sm">Entrée</span>
      ) : (
        <span className="badge badge-error badge-sm">Sortie</span>
      )
    )},
    { key: 'amount', label: 'Montant', render: (tx) => (
      <span className={`font-medium ${tx.type === 'income' ? 'text-success' : 'text-error'}`}>
        {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)} GNF
      </span>
    ), className: 'text-right'},
    { key: 'description', label: 'Description', render: (tx) => (
      <span className="text-sm text-base-content/70 max-w-[200px] truncate block">{tx.description || '—'}</span>
    ), hideOnMobile: true},
    { key: 'balance', label: 'Solde après', render: (tx) => (
      <span className="text-sm font-medium">{formatCurrency(tx.balanceAfter)} GNF</span>
    ), className: 'text-right', hideOnMobile: true},
  ], []);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [currentPage, search, filter, dateParams]);

  const fetchData = async (signal?: AbortSignal) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (hasLoadedRef.current) {
      setIsRefreshing(true);
    } else {
      setIsInitialLoading(true);
    }
    try {
      const params = new URLSearchParams();
      params.set('page', String(currentPage));
      params.set('limit', String(ITEMS_PER_PAGE));
      if (search) params.set('search', search);
      if (filter) params.set('type', filter);
      if (dateParams.from) params.set('from', dateParams.from);
      if (dateParams.to) params.set('to', dateParams.to);

      const summaryParams = new URLSearchParams();
      if (dateParams.from) summaryParams.set('from', dateParams.from);
      if (dateParams.to) summaryParams.set('to', dateParams.to);
      const summaryQuery = summaryParams.toString();

      const [txRes, summaryRes] = await Promise.all([
        fetch(`/api/wallet?${params.toString()}`, { signal }),
        fetch(summaryQuery ? `/api/wallet/summary?${summaryQuery}` : '/api/wallet/summary', { signal }),
      ]);

      if (!txRes.ok || !summaryRes.ok) {
        throw new Error('Erreur lors du chargement des données');
      }

      const txData = await txRes.json();
      const summaryData = await summaryRes.json();

      if (signal?.aborted || requestId !== requestIdRef.current) return;

      setTransactions(txData.data);
      setTotal(txData.total);
      setTotalPages(txData.totalPages);
      setSummary(summaryData);
      hasLoadedRef.current = true;
    } catch (error) {
      if (signal?.aborted) return;
      toast.error(error instanceof Error ? error.message : 'Erreur lors du chargement des données');
    } finally {
      if (!signal?.aborted && requestId === requestIdRef.current) {
        setIsInitialLoading(false);
        setIsRefreshing(false);
      }
    }
  };

  const resetForm = () => {
    setFormType('income');
    setFormAmount('');
    setFormDate(toDateInputValue(new Date()));
    setFormDescription('');
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(formAmount);

    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (!formDate) {
      toast.error('Date invalide');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/wallet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          type: formType,
          date: formDate,
          description: formDescription,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Transaction enregistrée avec succès!');
      setShowAddModal(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la création');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditModal = (tx: Transaction) => {
    setSelectedTx(tx);
    setFormType(tx.type);
    setFormAmount(tx.amount.toString());
    setFormDate(toDateInputValue(tx.createdAt));
    setFormDescription(tx.description || '');
    setShowEditModal(true);
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTx) return;

    const amount = parseFloat(formAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Montant invalide');
      return;
    }

    if (!formDate) {
      toast.error('Date invalide');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/wallet/${selectedTx.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          type: formType,
          date: formDate,
          description: formDescription,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erreur');
      }
      toast.success('Transaction modifiée avec succès!');
      setShowEditModal(false);
      setSelectedTx(null);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la modification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (tx: Transaction) => {
    setSelectedTx(tx);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!selectedTx) return;
    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/wallet/${selectedTx.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Erreur');
      toast.success('Transaction supprimée');
      setShowDeleteModal(false);
      setSelectedTx(null);
      fetchData();
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchWalletReportData = async (): Promise<WalletReportData> => {
    const transactionParams = new URLSearchParams({ page: '1', limit: '100000' });
    const summaryParams = new URLSearchParams();

    if (dateParams.from) {
      transactionParams.set('from', dateParams.from);
      summaryParams.set('from', dateParams.from);
    }
    if (dateParams.to) {
      transactionParams.set('to', dateParams.to);
      summaryParams.set('to', dateParams.to);
    }

    const summaryQuery = summaryParams.toString();
    const [transactionsResponse, summaryResponse] = await Promise.all([
      fetch(`/api/wallet?${transactionParams.toString()}`),
      fetch(summaryQuery ? `/api/wallet/summary?${summaryQuery}` : '/api/wallet/summary'),
    ]);

    if (!transactionsResponse.ok || !summaryResponse.ok) {
      throw new Error('Impossible de préparer le rapport du portefeuille');
    }

    const transactionsData = await transactionsResponse.json() as { data: Transaction[] };
    const summaryData = await summaryResponse.json() as Summary;
    return { transactions: transactionsData.data, summary: summaryData };
  };

  const prepareWalletReport = async () => {
    const reportData = await fetchWalletReportData();
    return {
      ...reportData,
      html: buildWalletReportHTML({ ...reportData, periodLabel: reportPeriodLabel }),
    };
  };

  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      toast.info('Génération du rapport PDF...');
      const [{ default: PDF }, report] = await Promise.all([
        import('jspdf'),
        prepareWalletReport(),
      ]);
      const canvas = await renderWalletReport(report.html);
      const imageData = canvas.toDataURL('image/png');
      const pdf = new PDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 8;
      const contentWidth = pageWidth - (margin * 2);
      const contentHeight = pageHeight - (margin * 2);
      const imageHeight = (canvas.height * contentWidth) / canvas.width;
      let remainingHeight = imageHeight;
      let position = margin;

      pdf.addImage(imageData, 'PNG', margin, position, contentWidth, imageHeight);
      remainingHeight -= contentHeight;

      while (remainingHeight > 0) {
        position -= contentHeight;
        pdf.addPage();
        pdf.addImage(imageData, 'PNG', margin, position, contentWidth, imageHeight);
        remainingHeight -= contentHeight;
      }

      pdf.save(`${reportFileName}.pdf`);
      toast.success('Rapport PDF téléchargé avec succès');
    } catch (error) {
      console.error('Wallet report PDF export error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la génération du PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportImage = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      toast.info("Génération de l'image du rapport...");
      const report = await prepareWalletReport();
      const canvas = await renderWalletReport(report.html);
      const link = document.createElement('a');
      link.download = `${reportFileName}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Image du rapport téléchargée avec succès');
    } catch (error) {
      console.error('Wallet report image export error:', error);
      toast.error(error instanceof Error ? error.message : "Erreur lors de la génération de l'image");
    } finally {
      setIsExporting(false);
    }
  };

  const handleShareWhatsApp = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      toast.info('Préparation du rapport pour WhatsApp...');
      const report = await prepareWalletReport();

      await shareOnWhatsApp(
        report.html,
        '',
        `${reportFileName}.png`,
        '',
        { photoOnly: true },
      );
    } catch (error) {
      console.error('Wallet report WhatsApp share error:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors du partage WhatsApp');
    } finally {
      setIsExporting(false);
    }
  };

  if (isInitialLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Gestion financière"
        title="Portefeuille"
        description="Suivez vos entrées et sorties d'argent avec un solde mis à jour automatiquement."
        actions={
          <>
            <button onClick={() => { resetForm(); setShowAddModal(true); }} className="btn btn-primary">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle transaction
            </button>
            <ExportDropdown
              onExportPDF={handleExportPDF}
              onExportImage={handleExportImage}
              onShareWhatsApp={handleShareWhatsApp}
              label={isExporting ? 'Préparation...' : 'Rapport portefeuille'}
            />
          </>
        }
      />

      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-base-content/60 mr-1">Période :</span>
        <div className="join">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => {
                setPeriod(p.key);
                setCurrentPage(1);
              }}
              className={`join-item btn btn-sm ${period === p.key ? 'btn-primary' : 'btn-ghost'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
        {period === 'day' && (
          <input
            type="date"
            value={selectedDay}
            onChange={(e) => {
              setSelectedDay(e.target.value);
              setCurrentPage(1);
            }}
            className="input input-bordered input-sm"
          />
        )}
        {period === 'month' && (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => {
              setSelectedMonth(e.target.value);
              setCurrentPage(1);
            }}
            className="input input-bordered input-sm"
          />
        )}
        <span className="text-xs text-base-content/40 ml-2">({periodLabel})</span>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title">{isPeriodFiltered ? 'Solde période' : 'Solde actuel'}</div>
            <div className={`stat-value text-2xl ${(summary?.currentBalance ?? 0) >= 0 ? 'text-success' : 'text-error'}`}>
              {formatCurrency(summary?.currentBalance ?? 0)} GNF
            </div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title">{isPeriodFiltered ? 'Entrées période' : 'Total entrées'}</div>
            <div className="stat-value text-2xl text-success">{formatCurrency(summary?.totalIncome ?? 0)} GNF</div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title">{isPeriodFiltered ? 'Sorties période' : 'Total sorties'}</div>
            <div className="stat-value text-2xl text-error">{formatCurrency(summary?.totalExpense ?? 0)} GNF</div>
          </div>
        </div>
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-title">Transactions</div>
            <div className="stat-value text-2xl">{summary?.transactionsCount ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur" aria-busy={isRefreshing}>
        <div className="flex flex-col sm:flex-row gap-3 mb-5">
          <div className="flex-1">
            <SearchBar
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              placeholder="Rechercher par description..."
            />
          </div>
          <FilterSelect
            value={filter}
            onChange={(v) => { setFilter(v); }}
            options={[
              { value: 'income', label: 'Entrées' },
              { value: 'expense', label: 'Sorties' },
            ]}
            placeholder="Tous les types"
          />
          {isRefreshing && (
            <div className="flex items-center justify-center px-2 text-primary">
              <span className="loading loading-spinner loading-sm" aria-label="Actualisation" />
            </div>
          )}
        </div>

        {transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-base-content/40">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-medium mb-1">Aucune transaction</p>
            <p className="text-sm">Ajoutez votre première transaction pour commencer.</p>
          </div>
        ) : (
          <>
            <ResponsiveTable<Transaction>
              columns={transactionColumns}
              data={transactions}
              getRowKey={(tx) => tx.id}
              actions={(tx) => (
                <>
                  <button
                    onClick={() => openEditModal(tx)}
                    className="btn btn-ghost btn-xs btn-square text-info"
                    title="Modifier"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => openDeleteModal(tx)}
                    className="btn btn-ghost btn-xs btn-square text-error"
                    title="Supprimer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </>
              )}
            />
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </>
        )}
      </div>

      {/* Add Modal */}
      <Modal
        isOpen={showAddModal}
        onClose={() => { setShowAddModal(false); resetForm(); }}
        title="Nouvelle transaction"
        size="md"
      >
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormType('income')}
              className={`btn flex-1 ${formType === 'income' ? 'btn-success text-white' : 'btn-ghost border border-base-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Entrée
            </button>
            <button
              type="button"
              onClick={() => setFormType('expense')}
              className={`btn flex-1 ${formType === 'expense' ? 'btn-error text-white' : 'btn-ghost border border-base-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Sortie
            </button>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Date</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="input input-bordered w-full"
                required
              />
              <button
                type="button"
                onClick={() => setFormDate(toDateInputValue(new Date()))}
                className="btn btn-ghost border border-base-300"
              >
                Aujourd'hui
              </button>
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Montant (GNF)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="Ex: 100000"
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description (optionnelle)</span>
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              placeholder="Ex: Vente de bouteilles, Achat fournisseur..."
              className="textarea textarea-bordered w-full"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
            <button
              type="button"
              onClick={() => { setShowAddModal(false); resetForm(); }}
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
                  Ajouter
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedTx(null); resetForm(); }}
        title="Modifier la transaction"
        size="md"
      >
        <form onSubmit={handleEdit} className="space-y-4">
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setFormType('income')}
              className={`btn flex-1 ${formType === 'income' ? 'btn-success text-white' : 'btn-ghost border border-base-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Entrée
            </button>
            <button
              type="button"
              onClick={() => setFormType('expense')}
              className={`btn flex-1 ${formType === 'expense' ? 'btn-error text-white' : 'btn-ghost border border-base-300'}`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Sortie
            </button>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Date</span>
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                value={formDate}
                onChange={(e) => setFormDate(e.target.value)}
                className="input input-bordered w-full"
                required
              />
              <button
                type="button"
                onClick={() => setFormDate(toDateInputValue(new Date()))}
                className="btn btn-ghost border border-base-300"
              >
                Aujourd'hui
              </button>
            </div>
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Montant (GNF)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              className="input input-bordered w-full"
              required
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Description (optionnelle)</span>
            </label>
            <textarea
              value={formDescription}
              onChange={(e) => setFormDescription(e.target.value)}
              className="textarea textarea-bordered w-full"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-base-300">
            <button
              type="button"
              onClick={() => { setShowEditModal(false); setSelectedTx(null); resetForm(); }}
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

      {/* Delete Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setSelectedTx(null); }}
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
              Êtes-vous sûr de vouloir supprimer cette transaction ?
              <br />
              <span className="text-sm">Les soldes des transactions suivantes seront recalculés.</span>
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button
              type="button"
              onClick={() => { setShowDeleteModal(false); setSelectedTx(null); }}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button onClick={handleDelete} disabled={isSubmitting} className="btn btn-error">
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
