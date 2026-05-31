'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { PageHeader } from '@/components/page-header';
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

type Period = 'today' | 'day' | 'week' | 'month' | 'year' | 'total';

type RapportData = {
  summary: {
    totalPurchases: number;
    totalSales: number;
    grossProfit: number;
    totalBottlesSold: number;
    averageBasket: number;
    totalBottlesInStock: number;
    totalInvoices: number;
    totalCustomers: number;
  };
  monthlyData: {
    month: string;
    purchases: number;
    sales: number;
    profit: number;
  }[];
  soldByProduct: {
    productCode: string;
    productName: string;
    quantity: number;
    revenue: number;
  }[];
  topCustomers: {
    name: string;
    totalSpent: number;
    invoiceCount: number;
  }[];
};

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: 'Aujourd\u2019hui' },
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Ann\u00e9e' },
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

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: { padding: 20, usePointStyle: true, pointStyle: 'circle' },
    },
  },
  scales: {
    x: { grid: { display: false } },
    y: { grid: { color: 'rgba(0,0,0,0.05)' } },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { position: 'right' as const, labels: { padding: 15, usePointStyle: true, pointStyle: 'circle' } },
  },
  cutout: '65%',
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

const months = ['Jan', 'F\u00e9v', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Ao\u00fbt', 'Sep', 'Oct', 'Nov', 'D\u00e9c'];

export default function RapportsPage() {
  const [data, setData] = useState<RapportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState<Period>('total');
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 7);
  });

  // Re-fetch when period, selectedDay or selectedMonth changes
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const params = getDateParams(period, selectedDay, selectedMonth);
        const qs = new URLSearchParams();
        if (params.from) qs.set('from', params.from);
        if (params.to) qs.set('to', params.to);
        const res = await fetch(`/api/rapports?${qs.toString()}`);
        const json = await res.json();
        setData(json);
      } catch (error) {
        console.error('Error fetching rapport data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [period, selectedDay]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const { summary, monthlyData, soldByProduct, topCustomers } = data;
  const periodLabel = PERIODS.find((p) => p.key === period)?.label || 'Total';

  // Chart data
  const lineChartData = {
    labels: monthlyData.map(m => {
      const [year, month] = m.month.split('-');
      return `${months[parseInt(month) - 1]} ${year.slice(2)}`;
    }),
    datasets: [
      {
        label: 'Ventes',
        data: monthlyData.map(m => m.sales),
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Achats',
        data: monthlyData.map(m => m.purchases),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const barChartData = {
    labels: monthlyData.map(m => {
      const [year, month] = m.month.split('-');
      return `${months[parseInt(month) - 1]}`;
    }),
    datasets: [
      {
        label: 'Bénéfice',
        data: monthlyData.map(m => m.profit),
        backgroundColor: monthlyData.map(m => m.profit >= 0 ? '#22c55e' : '#ef4444'),
        borderRadius: 8,
      },
    ],
  };

  const productChartData = {
    labels: soldByProduct.slice(0, 5).map(p => p.productCode),
    datasets: [
      {
        data: soldByProduct.slice(0, 5).map(p => p.quantity),
        backgroundColor: ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'],
        borderWidth: 0,
      },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rapports"
        title="Tableau de bord analytique"
        description="Analyse détaillée des performances commerciales et financières."
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
        <span className="text-xs text-base-content/40 ml-2">
          ({periodLabel})
        </span>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-info/20 bg-info/10 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{'\uD83D\uDCB0'}</span>
          </div>
          <p className="text-sm text-base-content/60 mb-1">Ventes</p>
          <p className="text-xl font-bold text-info">{formatCurrency(summary.totalSales)} GNF</p>
          <p className="text-xs text-base-content/40 mt-1">{summary.totalBottlesSold} bouteilles</p>
        </div>

        <div className="rounded-2xl border border-warning/20 bg-warning/10 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{'\uD83D\uDCE6'}</span>
          </div>
          <p className="text-sm text-base-content/60 mb-1">Achats usine</p>
          <p className="text-xl font-bold text-warning">{formatCurrency(summary.totalPurchases)} GNF</p>
          <p className="text-xs text-base-content/40 mt-1">{summary.totalInvoices} facture(s)</p>
        </div>

        <div className="rounded-2xl border border-success/20 bg-success/10 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{'\uD83D\uDCC8'}</span>
          </div>
          <p className="text-sm text-base-content/60 mb-1">Bénéfice brut</p>
          <p className={`text-xl font-bold ${summary.grossProfit >= 0 ? 'text-success' : 'text-error'}`}>
            {formatCurrency(summary.grossProfit)} GNF
          </p>
          <p className="text-xs text-base-content/40 mt-1">marge</p>
        </div>

        <div className="rounded-2xl border border-accent/20 bg-accent/10 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="flex items-start justify-between mb-3">
            <span className="text-2xl">{'\uD83E\uDDFE'}</span>
          </div>
          <p className="text-sm text-base-content/60 mb-1">Bouteilles vendues</p>
          <p className="text-xl font-bold text-accent">{summary.totalBottlesSold}</p>
          <p className="text-xs text-base-content/40 mt-1">unités</p>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Panier moyen</p>
          <p className="text-lg font-bold">{formatCurrency(summary.averageBasket)} GNF</p>
        </div>
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Stock actuel</p>
          <p className="text-lg font-bold">{summary.totalBottlesInStock} bouteilles</p>
        </div>
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Clients actifs</p>
          <p className="text-lg font-bold">{summary.totalCustomers}</p>
        </div>
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur">
          <p className="text-xs text-base-content/60">Période</p>
          <p className="text-lg font-bold">{periodLabel}</p>
        </div>
      </div>

      {/* Charts Row 1 */}
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
            <h3 className="font-semibold text-lg">Bénéfice mensuel</h3>
            <p className="text-sm text-base-content/60">Par mois</p>
          </div>
          <div className="h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Top produits vendus</h3>
            <p className="text-sm text-base-content/60">Par quantité</p>
          </div>
          <div className="h-64 flex items-center justify-center">
            {soldByProduct.length > 0 ? (
              <Doughnut data={productChartData} options={doughnutOptions} />
            ) : (
              <p className="text-base-content/50">Aucune donnée</p>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Top clients</h3>
            <p className="text-sm text-base-content/60">Par chiffre d'affaires</p>
          </div>
          {topCustomers.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-base-content/50">
              Aucun client
            </div>
          ) : (
            <div className="space-y-3">
              {topCustomers.map((customer, index) => (
                <div key={customer.name} className="flex items-center justify-between p-3 rounded-xl bg-base-200">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm ${
                      index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-slate-400' : index === 2 ? 'bg-amber-600' : 'bg-slate-300'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium">{customer.name}</p>
                      <p className="text-xs text-base-content/60">{customer.invoiceCount} facture(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">{formatCurrency(customer.totalSpent)}</p>
                    <p className="text-xs text-base-content/60">GNF</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Products Table */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg">Détail des ventes par produit</h3>
            <p className="text-sm text-base-content/60">{periodLabel} &middot; {soldByProduct.length} produit(s)</p>
          </div>
        </div>
        {soldByProduct.length === 0 ? (
          <div className="rounded-xl border border-dashed border-base-300 bg-base-200 px-4 py-8 text-center text-sm text-base-content/50">
            Aucune vente pour cette période.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table table-zebra">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th className="text-right">Quantité</th>
                  <th className="text-right">Chiffre d'affaires</th>
                  <th className="text-right">Part</th>
                </tr>
              </thead>
              <tbody>
                {soldByProduct.map((product) => {
                  const percentage = summary.totalSales > 0 ? (product.revenue / summary.totalSales) * 100 : 0;
                  return (
                    <tr key={product.productCode}>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="badge badge-neutral badge-sm">{product.productCode}</span>
                          {product.productName}
                        </div>
                      </td>
                      <td className="text-right font-medium">{product.quantity}</td>
                      <td className="text-right font-semibold text-success">{formatCurrency(product.revenue)}</td>
                      <td className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <div className="w-16 h-2 bg-base-200 rounded-full overflow-hidden">
                            <div className="h-full bg-info rounded-full" style={{ width: `${Math.min(percentage, 100)}%` }}></div>
                          </div>
                          <span className="text-sm">{percentage.toFixed(1)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
