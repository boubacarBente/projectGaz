'use client';

import { memo, useMemo } from 'react';
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
import type { RapportData } from '@/lib/rapports-types';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler,
);

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
    legend: {
      position: 'bottom' as const,
      labels: { padding: 15, usePointStyle: true, pointStyle: 'circle' },
    },
  },
  cutout: '65%',
};

const months = ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Aout', 'Sep', 'Oct', 'Nov', 'Dec'];

function RapportChartsInner({
  monthlyData,
  soldByProduct,
}: {
  monthlyData: RapportData['monthlyData'];
  soldByProduct: RapportData['soldByProduct'];
}) {
  const lineChartData = useMemo(
    () => ({
      labels: monthlyData.map((m) => {
        const [y, mn] = m.month.split('-');
        return `${months[parseInt(mn) - 1]} ${y.slice(2)}`;
      }),
      datasets: [
        {
          label: 'Ventes',
          data: monthlyData.map((m) => m.sales),
          borderColor: '#0ea5e9',
          backgroundColor: 'rgba(14,165,233,0.1)',
          fill: true,
          tension: 0.4,
        },
        {
          label: 'Achats',
          data: monthlyData.map((m) => m.purchases),
          borderColor: '#f59e0b',
          backgroundColor: 'rgba(245,158,11,0.1)',
          fill: true,
          tension: 0.4,
        },
      ],
    }),
    [monthlyData],
  );

  const barChartData = useMemo(
    () => ({
      labels: monthlyData.map((m) => {
        const [, mn] = m.month.split('-');
        return months[parseInt(mn) - 1];
      }),
      datasets: [
        {
          label: 'Benefice',
          data: monthlyData.map((m) => m.profit),
          backgroundColor: monthlyData.map((m) => (m.profit >= 0 ? '#22c55e' : '#ef4444')),
          borderRadius: 8,
        },
      ],
    }),
    [monthlyData],
  );

  const productChartData = useMemo(
    () => ({
      labels: soldByProduct.slice(0, 5).map((p) => p.productCode),
      datasets: [
        {
          data: soldByProduct.slice(0, 5).map((p) => p.quantity),
          backgroundColor: ['#0ea5e9', '#22c55e', '#f59e0b', '#8b5cf6', '#ec4899'],
          borderWidth: 0,
        },
      ],
    }),
    [soldByProduct],
  );

  return (
    <>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Ventes vs Achats</h3>
            <p className="text-sm text-base-content/60">12 derniers mois</p>
          </div>
          <div className="h-56 sm:h-64">
            <Line data={lineChartData} options={chartOptions} />
          </div>
        </div>

        <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
          <div className="mb-4">
            <h3 className="font-semibold text-lg">Benefice mensuel</h3>
            <p className="text-sm text-base-content/60">Par mois</p>
          </div>
          <div className="h-56 sm:h-64">
            <Bar data={barChartData} options={chartOptions} />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-base-200/80 bg-base-100/80 p-5 shadow-lg shadow-black/5 backdrop-blur">
        <div className="mb-4">
          <h3 className="font-semibold text-lg">Top produits vendus</h3>
          <p className="text-sm text-base-content/60">Par quantite</p>
        </div>
        <div className="h-56 sm:h-64 flex items-center justify-center">
          {soldByProduct.length > 0 ? (
            <Doughnut data={productChartData} options={doughnutOptions} />
          ) : (
            <p className="text-base-content/50">Aucune donnee</p>
          )}
        </div>
      </div>
    </>
  );
}

export const RapportCharts = memo(RapportChartsInner);
