'use client';

import { useState, useEffect, useRef } from 'react';
import { PageHeader } from '@/components/page-header';
import { DatePicker } from '@/components/date-picker';
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

const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];

// Évite les erreurs StrictMode + Chart.js (double mount/unmount)
function SafeChart({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); return () => setReady(false); }, []);
  if (!ready) return <div className="h-64" />;
  return <>{children}</>;
}

export default function RapportsPage() {
  const [data, setData] = useState<RapportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        if (from) params.set('from', from);
        if (to) params.set('to', to);
        const query = params.toString();
        const res = await fetch(`/api/rapports${query ? '?' + query : ''}`);
        const json = await res.json();
        setData(json);
        chartKey.current += 1;
      } catch (error) {
        console.error('Error fetching rapport data:', error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [from, to, refreshKey]);

  // Incrémenté à chaque fetch réussi pour forcer le remount des chartes
  const chartKey = useRef(0);

  if (isLoading || !data) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  const { summary, monthlyData, soldByProduct, topCustomers } = data;

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

      {/* Filtres date */}
      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-4 shadow-lg shadow-black/5 backdrop-blur flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-base-content/60">Période</span>
        <DatePicker value={from} onChange={setFrom} placeholder="Du" className="w-36" />
        <span className="text-xs text-base-content/40">—</span>
        <DatePicker value={to} onChange={setTo} placeholder="Au" className="w-36" />
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }} className="btn btn-ghost btn-xs btn-square text-error">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <div className="flex-1" />
        <button onClick={() => setRefreshKey(k => k + 1)} disabled={isLoading} className="btn btn-ghost btn-sm btn-square" title="Actualiser">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total ventes</div>
            <div className="stat-value text-info">{formatCurrency(summary.totalSales)}</div>
            <div className="stat-desc">GNF</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total achats</div>
            <div className="stat-value text-warning">{formatCurrency(summary.totalPurchases)}</div>
            <div className="stat-desc">GNF</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Bénéfice brut</div>
            <div className={`stat-value ${summary.grossProfit >= 0 ? 'text-success' : 'text-error'}`}>
              {formatCurrency(summary.grossProfit)}
            </div>
            <div className="stat-desc">GNF</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Bouteilles vendues</div>
            <div className="stat-value">{summary.totalBottlesSold}</div>
            <div className="stat-desc">unités</div>
          </div>
        </div>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Panier moyen</div>
            <div className="stat-value text-lg">{formatCurrency(summary.averageBasket)}</div>
            <div className="stat-desc">GNF/facture</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Stock actuel</div>
            <div className="stat-value text-lg">{summary.totalBottlesInStock}</div>
            <div className="stat-desc">bouteilles</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Total factures</div>
            <div className="stat-value text-lg">{summary.totalInvoices}</div>
            <div className="stat-desc">achats + ventes</div>
          </div>
        </div>
        <div className="stats shadow">
          <div className="stat">
            <div className="stat-title">Clients</div>
            <div className="stat-value text-lg">{summary.totalCustomers}</div>
            <div className="stat-desc">actifs</div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div key={`line-${chartKey.current}`} className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Ventes vs Achats (12 mois)</h3>
            <p className="text-sm text-base-content/60">Évolution mensuelle</p>
          </div>
          <div className="h-64">
            <SafeChart><Line data={lineChartData} options={chartOptions} /></SafeChart>
          </div>
        </div>

        <div key={`bar-${chartKey.current}`} className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Bénéfice mensuel</h3>
            <p className="text-sm text-base-content/60">Par mois</p>
          </div>
          <div className="h-64">
            <SafeChart><Bar data={barChartData} options={chartOptions} /></SafeChart>
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div key={`donut-${chartKey.current}`} className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Top produits vendus</h3>
            <p className="text-sm text-base-content/60">Par quantité</p>
          </div>
          <div className="h-64">
            {soldByProduct.length > 0 ? (
              <SafeChart><Doughnut data={productChartData} options={doughnutOptions} /></SafeChart>
            ) : (
              <div className="flex items-center justify-center h-full text-base-content/50">
                Aucune donnée
              </div>
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
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Détail des ventes par produit</h3>
          <p className="text-sm text-base-content/60">{soldByProduct.length} produit(s) vendu(s)</p>
        </div>
        {soldByProduct.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-base-300 bg-base-200 px-4 py-12 text-center">
            <p className="text-base-content/70">Aucune vente enregistrée.</p>
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
                            <div className="h-full bg-info rounded-full" style={{ width: `${percentage}%` }}></div>
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
