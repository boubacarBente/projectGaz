'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
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

type Operation = {
  id: number;
  type: 'sale' | 'purchase';
  date: string;
  total: number;
  items: { name: string; quantity: number; price: number }[];
};

type Snapshot = {
  totalPurchases: number;
  totalSales: number;
  grossProfit: number;
  sales: Operation[];
  purchases: Operation[];
  soldByProduct: { name: string; quantity: number }[];
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom' as const,
      labels: {
        padding: 20,
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
  },
  scales: {
    x: {
      grid: { display: false },
    },
    y: {
      grid: { color: 'rgba(0,0,0,0.05)' },
    },
  },
};

const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'right' as const,
      labels: {
        padding: 15,
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
  },
  cutout: '65%',
};

export default function DashboardPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading || !snapshot) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  // Process data for charts
  const salesByMonth = Array(12).fill(0);
  const purchasesByMonth = Array(12).fill(0);
  const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];

  snapshot.sales.forEach((sale: Operation) => {
    const month = new Date(sale.date).getMonth();
    salesByMonth[month] += sale.total;
  });

  snapshot.purchases.forEach((purchase: Operation) => {
    const month = new Date(purchase.date).getMonth();
    purchasesByMonth[month] += purchase.total;
  });

  // Line chart data - Ventes vs Achats
  const lineChartData = {
    labels: months,
    datasets: [
      {
        label: 'Ventes',
        data: salesByMonth,
        borderColor: '#0ea5e9',
        backgroundColor: 'rgba(14, 165, 233, 0.1)',
        fill: true,
        tension: 0.4,
      },
      {
        label: 'Achats',
        data: purchasesByMonth,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // Bar chart data - Bénéfice mensuel
  const barChartData = {
    labels: months,
    datasets: [
      {
        label: 'Bénéfice',
        data: salesByMonth.map((s, i) => s - purchasesByMonth[i]),
        backgroundColor: salesByMonth.map((s, i) => 
          s - purchasesByMonth[i] >= 0 ? '#22c55e' : '#ef4444'
        ),
        borderRadius: 8,
      },
    ],
  };

  // Doughnut chart - Top produits
  const productData = snapshot.soldByProduct.slice(0, 5);
  const doughnutChartData = {
    labels: productData.map(p => p.name),
    datasets: [
      {
        data: productData.map(p => p.quantity),
        backgroundColor: [
          '#0ea5e9',
          '#22c55e',
          '#f59e0b',
          '#8b5cf6',
          '#ec4899',
        ],
        borderWidth: 0,
      },
    ],
  };

  const stats = [
    {
      label: 'Achats usine',
      value: `${formatCurrency(snapshot.totalPurchases)} MAD`,
      hint: "Total des factures d'approvisionnement",
      icon: '📦',
      color: 'warning',
    },
    {
      label: 'Ventes clients',
      value: `${formatCurrency(snapshot.totalSales)} MAD`,
      hint: 'Total des factures de vente',
      icon: '💰',
      color: 'info',
    },
    {
      label: 'Clients',
      value: snapshot.sales.length > 0 ? 'Actifs' : '0',
      hint: 'Base clients active',
      icon: '👥',
      color: 'primary',
    },
    {
      label: 'Bénéfice brut',
      value: `${formatCurrency(snapshot.grossProfit)} MAD`,
      hint: 'Ventes - Achats',
      icon: '📈',
      color: snapshot.grossProfit >= 0 ? 'success' : 'error',
    },
  ];

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
        description="Vue d'ensemble de votre activité avec graphiques et statistiques en temps réel."
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="stats shadow">
            <div className="stat">
              <div className="stat-figure text-2xl">{stat.icon}</div>
              <div className="stat-title">{stat.label}</div>
              <div className={`stat-value text-${stat.color}`}>{stat.value}</div>
              <div className="stat-desc">{stat.hint}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Ventes vs Achats</h3>
            <p className="text-sm text-slate-500">Comparaison mensuelle</p>
          </div>
          <div className="h-64">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Produits vendus</h3>
            <p className="text-sm text-slate-500">Top 5 par quantité</p>
          </div>
          <div className="h-64">
            {productData.length > 0 ? (
              <Doughnut data={doughnutChartData} options={doughnutOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400">
                Aucune donnée disponible
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-white/80 bg-white/75 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Bénéfice mensuel</h3>
            <p className="text-sm text-slate-500">Evolution du bénéfice par mois</p>
          </div>
          <div className="h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Actions rapides</h3>
            <p className="text-sm text-slate-500">Accès direct aux fonctionnalités</p>
          </div>
          <div className="space-y-3">
            {quickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
              >
                <span className="text-lg">{link.icon}</span>
                {link.label}
                <svg xmlns="http://www.w3.org/2000/svg" className="ml-auto h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="text-sky-500">📊</span>
              Résumé des ventes
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Nombre de factures</span>
              <span className="font-semibold">{snapshot.sales.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Bouteilles vendues</span>
              <span className="font-semibold">{snapshot.soldByProduct.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Panier moyen</span>
              <span className="font-semibold">
                {snapshot.sales.length > 0 
                  ? formatCurrency(snapshot.totalSales / snapshot.sales.length) + ' MAD'
                  : '0 MAD'}
              </span>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/80 bg-white/75 p-5 shadow-lg shadow-slate-200/60 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <span className="text-amber-500">📦</span>
              Résumé des achats
            </h3>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Nombre de factures</span>
              <span className="font-semibold">{snapshot.purchases.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Total achats</span>
              <span className="font-semibold">{formatCurrency(snapshot.totalPurchases)} MAD</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600">Marge brute</span>
              <span className={`font-semibold ${snapshot.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(snapshot.grossProfit)} MAD
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}