'use client';

import { useState, useEffect, useMemo } from 'react';
import { PageHeader } from '@/components/page-header';
import { RapportStatsCards } from '@/components/rapports/rapport-stats-cards';
import { RapportCharts } from '@/components/rapports/rapport-charts';
import { RapportProductTable } from '@/components/rapports/rapport-product-table';
import { RapportTopCustomers } from '@/components/rapports/rapport-top-customers';
import type { Period, RapportData } from '@/lib/rapports-types';

const PERIODS: { key: Period; label: string }[] = [
  { key: 'today', label: "Aujourd'hui" },
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Annee' },
  { key: 'total', label: 'Total' },
];

function getDateParams(period: Period, selectedDay: string, selectedMonth?: string): { from?: string; to?: string } {
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
    case 'total': return {};
  }
}

export default function RapportsPage() {
  const [data, setData] = useState<RapportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedData, setHasLoadedData] = useState(false);
  const [period, setPeriod] = useState<Period>('total');
  const [selectedDay, setSelectedDay] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().slice(0, 10);
  });
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1)).toISOString().slice(0, 7);
  });

  const params = useMemo(() => getDateParams(period, selectedDay, selectedMonth), [period, selectedDay, selectedMonth]);
  const isRefreshing = isLoading && hasLoadedData;

  useEffect(() => {
    const ac = new AbortController();
    async function fetchData() {
      setIsLoading(true);
      try {
        const qs = new URLSearchParams();
        if (params.from) qs.set('from', params.from);
        if (params.to) qs.set('to', params.to);
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
  }, [params]);

  const periodLabel = PERIODS.find((p) => p.key === period)?.label || 'Total';

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

      {/* Period Selector */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-base-content/60 mr-1">Periode :</span>
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

      <RapportStatsCards summary={data.summary} periodLabel={periodLabel} />
      <RapportCharts monthlyData={data.monthlyData} soldByProduct={data.soldByProduct} />
      <RapportTopCustomers topCustomers={data.topCustomers} />
      <RapportProductTable
        soldByProduct={data.soldByProduct}
        totalSales={data.summary.totalSales}
        periodLabel={periodLabel}
      />
    </div>
  );
}
