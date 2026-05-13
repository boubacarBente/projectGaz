'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { useTheme } from '@/components/theme-provider';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

type Period = 'day' | 'week' | 'month' | 'year' | 'total';

type SaleItem = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
};

type PurchaseItem = {
  productId: number;
  productCode: string;
  productName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
};

type SaleInvoice = {
  id: number;
  invoiceNumber: string;
  customerName: string;
  date: string;
  totalAmount: number;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: string;
  items: SaleItem[];
};

type PurchaseInvoice = {
  id: number;
  reference: string;
  supplier: string;
  date: string;
  totalAmount: number;
  isPaid: boolean;
  items: PurchaseItem[];
};

type Snapshot = {
  totalPurchases: number;
  totalSales: number;
  grossProfit: number;
  sales: SaleInvoice[];
  purchases: PurchaseInvoice[];
  soldByProduct: {
    productCode: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
};

const PERIODS: { key: Period; label: string }[] = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Ann\u00e9e' },
  { key: 'total', label: 'Total' },
];

function formatCurrency(value: number | undefined | null) {
  if (value == null || isNaN(value)) return '0';
  try {
    return new Intl.NumberFormat('fr-MA').format(value);
  } catch {
    return String(value);
  }
}

function getPeriodFilter(period: Period): (date: Date) => boolean {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(startOfDay);
  startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfYear = new Date(now.getFullYear(), 0, 1);

  switch (period) {
    case 'day':
      return (d) => d >= startOfDay;
    case 'week':
      return (d) => d >= startOfWeek;
    case 'month':
      return (d) => d >= startOfMonth;
    case 'year':
      return (d) => d >= startOfYear;
    case 'total':
      return () => true;
  }
}

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('total');
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/operations/snapshot');
        const data = await res.json();
        setSnapshot(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  // Filtrer par période
  const periodFilter = useMemo(() => getPeriodFilter(period), [period]);

  const filteredData = useMemo(() => {
    if (!snapshot) return null;
    const sales = snapshot.sales.filter((s) => periodFilter(new Date(s.date)));
    const purchases = snapshot.purchases.filter((p) => periodFilter(new Date(p.date)));
    const totalSales = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPurchases = purchases.reduce((sum, p) => sum + p.totalAmount, 0);

    // Produits vendus filtrés
    const productMap = new Map<string, { name: string; quantity: number }>();
    for (const sale of sales) {
      for (const item of sale.items) {
        const existing = productMap.get(item.productName) || { name: item.productName, quantity: 0 };
        existing.quantity += item.quantity;
        productMap.set(item.productName, existing);
      }
    }
    const soldByProduct = Array.from(productMap.values()).sort((a, b) => b.quantity - a.quantity);

    return {
      sales,
      purchases,
      totalSales,
      totalPurchases,
      grossProfit: totalSales - totalPurchases,
      salesCount: sales.length,
      purchasesCount: purchases.length,
      soldByProduct,
    };
  }, [snapshot, periodFilter]);

  if (loading || !snapshot || !filteredData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const { sales, purchases, totalSales, totalPurchases, grossProfit, salesCount, purchasesCount, soldByProduct } = filteredData;
  const totalBottlesSold = sales.reduce((sum, s) => sum + s.items.reduce((a, i) => a + i.quantity, 0), 0);
  const totalBottlesPurchased = purchases.reduce((sum, p) => sum + p.items.reduce((a, i) => a + i.quantity, 0), 0);
  const stockTotal = snapshot.soldByProduct.reduce((s, p) => s + p.quantity, 0);

  // Données pour graphiques mensuels (toujours sur 12 mois glissants)
  const months = ['Jan', 'F\u00e9v', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Ao\u00fbt', 'Sep', 'Oct', 'Nov', 'D\u00e9c'];
  const now = new Date();
  const monthlyLabels: string[] = [];
  const monthlySales: number[] = [];
  const monthlyPurchases: number[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthlyLabels.push(`${months[d.getMonth()]} ${d.getFullYear().toString().slice(2)}`);
    const monthSales = snapshot.sales.filter((s) => {
      const sd = new Date(s.date);
      return sd.getMonth() === d.getMonth() && sd.getFullYear() === d.getFullYear();
    }).reduce((sum, s) => sum + s.totalAmount, 0);
    const monthPurchases = snapshot.purchases.filter((p) => {
      const pd = new Date(p.date);
      return pd.getMonth() === d.getMonth() && pd.getFullYear() === d.getFullYear();
    }).reduce((sum, p) => sum + p.totalAmount, 0);
    monthlySales.push(monthSales);
    monthlyPurchases.push(monthPurchases);
  }

  // Stats cards
  const periodLabel = PERIODS.find((p) => p.key === period)?.label || 'Total';
  const statsCards = [
    {
      label: 'Ventes',
      value: `${formatCurrency(totalSales)} GNF`,
      hint: `${salesCount} facture(s)`,
      icon: '💰',
      trend: salesCount > 0 ? `${totalBottlesSold} bouteilles` : null,
      color: 'text-info',
      bgColor: 'bg-info/10',
      borderColor: 'border-info/20',
    },
    {
      label: 'Achats usine',
      value: `${formatCurrency(totalPurchases)} GNF`,
      hint: `${purchasesCount} facture(s)`,
      icon: '📦',
      trend: purchasesCount > 0 ? `${totalBottlesPurchased} bouteilles` : null,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      borderColor: 'border-warning/20',
    },
    {
      label: 'B\u00e9n\u00e9fice brut',
      value: `${formatCurrency(grossProfit)} GNF`,
      hint: grossProfit >= 0 ? 'Positif \u2713' : 'N\u00e9gatif',
      icon: grossProfit >= 0 ? '📈' : '📉',
      color: grossProfit >= 0 ? 'text-success' : 'text-error',
      bgColor: grossProfit >= 0 ? 'bg-success/10' : 'bg-error/10',
      borderColor: grossProfit >= 0 ? 'border-success/20' : 'border-error/20',
    },
    {
      label: 'Stock total',
      value: `${stockTotal}`,
      hint: `Vendues: ${totalBottlesSold} sur la p\u00e9riode`,
      icon: '🫙',
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      borderColor: 'border-primary/20',
      trend: purchasesCount > 0 && period !== 'total' ? `${totalBottlesPurchased} achet\u00e9es` : null,
    },
  ];

  // Graphiques
  const lineChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'Ventes',
        data: monthlySales,
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Achats',
        data: monthlyPurchases,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
    labels: monthlyLabels,
    datasets: [
      {
        label: 'B\u00e9n\u00e9fice',
        data: monthlySales.map((s, i) => s - monthlyPurchases[i]),
        backgroundColor: monthlySales.map((s, i) => s - monthlyPurchases[i] >= 0 ? '#22c55e' : '#ef4444'),
        borderRadius: 8,
      },
    ],
  };

  const topProducts = soldByProduct.slice(0, 5);
  const doughnutChartData = topProducts.length > 0 ? {
    labels: topProducts.map((p) => p.name.length > 20 ? p.name.slice(0, 18) + '...' : p.name),
    datasets: [
      {
        data: topProducts.map((p) => p.quantity),
        backgroundColor: ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'],
        borderWidth: 0,
      },
    ],
  } : null;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: { padding: 20, usePointStyle: true, pointStyle: 'circle', color: isDark ? '#94a3b8' : '#475569' },
      },
    },
    scales: {
      x: { grid: { display: false }, ticks: { color: isDark ? '#94a3b8' : '#64748b' } },
      y: { grid: { color: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }, ticks: { color: isDark ? '#94a3b8' : '#64748b' } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'right' as const, labels: { padding: 15, usePointStyle: true, pointStyle: 'circle', color: isDark ? '#94a3b8' : '#475569' } },
    },
    cutout: '65%',
  };

  const quickLinks = [
    { href: '/depenses', label: 'Saisir une facture usine', icon: '📋' },
    { href: '/factures/nouvelle', label: 'Enregistrer une vente', icon: '🧾' },
    { href: '/factures', label: 'Voir les factures clients', icon: '📊' },
    { href: '/clients', label: 'Gérer les clients', icon: '👤' },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Dashboard"
        title="Tableau de bord"
        description="Vue d'ensemble de votre activité avec des statistiques par période."
        actions={
          <Link
            href="/factures/nouvelle"
            className="btn btn-primary gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle vente
          </Link>
        }
      />

      {/* Période Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-base-content/60 mr-1">Période :</span>
        <div className="join">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`join-item btn btn-sm ${
                period === p.key
                  ? 'btn-primary'
                  : 'btn-ghost'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-base-content/40 ml-2">
          ({periodLabel})
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statsCards.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-2xl border ${stat.borderColor} ${stat.bgColor} p-5 shadow-lg shadow-black/5 backdrop-blur transition-all duration-300 hover:scale-[1.02]`}
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-2xl">{stat.icon}</span>
              {stat.trend && (
                <span className="badge badge-ghost badge-xs">{stat.trend}</span>
              )}
            </div>
            <p className="text-sm text-base-content/60 mb-1">{stat.label}</p>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-base-content/40 mt-1">{stat.hint}</p>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Ventes vs Achats</h3>
            <p className="text-sm text-base-content/60">12 derniers mois</p>
          </div>
          <div className="h-64">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Top produits vendus</h3>
            <p className="text-sm text-base-content/60">Période actuelle</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            {doughnutChartData ? (
              <Doughnut data={doughnutChartData} options={doughnutOptions} />
            ) : (
              <p className="text-base-content/50">Aucune donnée</p>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Bénéfice mensuel</h3>
            <p className="text-sm text-base-content/60">12 derniers mois</p>
          </div>
          <div className="h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Actions rapides</h3>
            <p className="text-sm text-base-content/60">Accès direct</p>
          </div>
          <div className="space-y-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-xl border border-base-200 bg-base-200/50 px-4 py-3 text-sm font-medium transition-all hover:border-primary/30 hover:bg-primary/5"
              >
                <span className="text-lg">{link.icon}</span>
                {link.label}
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-auto h-4 w-4 text-base-content/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Tableau des ventes récentes */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Ventes récentes</h3>
            <p className="text-sm text-base-content/60">{periodLabel} &middot; {salesCount} facture(s)</p>
          </div>
          <Link href="/factures" className="btn btn-ghost btn-sm">
            Voir tout
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {sales.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/50">
            Aucune vente pour cette période.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produits</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {sales.slice(0, 5).map((sale) => (
                  <tr key={sale.id}>
                    <td className="text-sm">{new Date(sale.date).toLocaleDateString('fr-MA')}</td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {sale.items.map((item, i) => (
                          <span key={i} className="badge badge-outline badge-xs">
                            {item.productName} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-right font-medium">{formatCurrency(sale.totalAmount)} GNF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Derniers approvisionnements */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Approvisionnements récents</h3>
            <p className="text-sm text-base-content/60">{periodLabel} &middot; {purchasesCount} facture(s)</p>
          </div>
          <Link href="/depenses" className="btn btn-ghost btn-sm">
            Voir tout
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
        {purchases.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/50">
            Aucun approvisionnement pour cette période.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Produits</th>
                  <th className="text-right">Montant</th>
                </tr>
              </thead>
              <tbody>
                {purchases.slice(0, 5).map((purchase) => (
                  <tr key={purchase.id}>
                    <td className="text-sm">{new Date(purchase.date).toLocaleDateString('fr-MA')}</td>
                    <td>
                      <div className="flex gap-1 flex-wrap">
                        {purchase.items.map((item, i) => (
                          <span key={i} className="badge badge-outline badge-xs">
                            {item.productName} x{item.quantity}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="text-right font-medium">{formatCurrency(purchase.totalAmount)} GNF</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}