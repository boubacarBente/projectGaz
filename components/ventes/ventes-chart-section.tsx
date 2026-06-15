'use client';

import { memo } from 'react';
import { motion } from 'framer-motion';
import type { VentesStats, Period } from '@/lib/ventes-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function formatPeriodLabel(label: string) {
  const parts = label.split('-');
  if (parts.length === 2 && !isNaN(Number(parts[0])) && !isNaN(Number(parts[1]))) {
    return new Date(Number(parts[0]), Number(parts[1]) - 1, 1)
      .toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  }
  return label;
}

function VentesChartSectionInner({
  stats,
  period,
}: {
  stats: VentesStats;
  period: Period;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Period chart / Top clients */}
      <div className="bg-base-100 rounded-xl border border-base-300 p-4">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-3">
          {period === 'total' || period === 'today' ? 'Top clients' : 'Évolution du CA'}
        </h4>

        {stats.byPeriod && stats.byPeriod.length > 0 ? (
          <div className="space-y-2 max-h-50 overflow-y-auto">
            {stats.byPeriod.slice(-12).map((item) => {
              const maxVal = Math.max(...stats.byPeriod!.map(p => p.total));
              const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
              return (
                <div key={item.label} className="flex items-center gap-3">
                  <span className="text-xs w-24 text-base-content/60 shrink-0">{formatPeriodLabel(item.label)}</span>
                  <div className="flex-1 h-5 bg-base-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-linear-to-r from-primary/70 to-primary rounded-full"
                    />
                  </div>
                  <span className="text-xs font-semibold w-24 text-right tabular-nums">{formatCurrency(item.total)}</span>
                </div>
              );
            })}
          </div>
        ) : period === 'total' && stats.byCustomer && stats.byCustomer.length > 0 ? (
          <div className="space-y-2 max-h-50 overflow-y-auto">
            {stats.byCustomer.slice(0, 8).map((item) => {
              const maxVal = Math.max(...stats.byCustomer.map(c => c.total));
              const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
              return (
                <div key={item.name} className="flex items-center gap-3">
                  <span className="text-xs font-medium w-28 truncate shrink-0">{item.name || 'Anonyme'}</span>
                  <div className="flex-1 h-5 bg-base-200 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(pct, 2)}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full bg-linear-to-r from-info/60 to-info rounded-full"
                    />
                  </div>
                  <span className="text-xs font-semibold w-24 text-right tabular-nums">{formatCurrency(item.total)}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-base-content/30 text-sm">
            Aucune donnée pour cette période
          </div>
        )}
      </div>

      {/* Recent invoices */}
      <div className="bg-base-100 rounded-xl border border-base-300">
        <div className="px-4 py-3 border-b border-base-200 flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/60">Dernières factures</h4>
          <span className="badge badge-ghost badge-xs">{stats.recentInvoices.length}</span>
        </div>
        {stats.recentInvoices.length > 0 ? (
          <div className="divide-y divide-base-200 max-h-50 overflow-y-auto">
            {stats.recentInvoices.map((inv) => (
              <div key={inv.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-base-200/50 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{inv.invoiceNumber}</span>
                    <span className={`badge badge-xs ${inv.paymentStatus === 'Paye' || inv.paymentStatus === 'Payée' ? 'badge-success' : inv.paymentStatus === 'Partiel' ? 'badge-warning' : 'badge-ghost'}`}>
                      {inv.paymentStatus === 'Paye' ? 'Payée' : inv.paymentStatus}
                    </span>
                  </div>
                  <div className="text-xs text-base-content/50 truncate">{inv.customerName}</div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <div className="text-sm font-semibold tabular-nums">{formatCurrency(inv.totalAmount)}</div>
                  <div className="text-xs text-base-content/40">{inv.date}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-center justify-center py-8 text-base-content/30 text-sm">
            Aucune facture récente
          </div>
        )}
      </div>

      {/* Status breakdown + Payment progress */}
      {stats.byStatus && stats.byStatus.length > 0 && (
        <>
          {/* Status distribution */}
          <div className="bg-base-100 rounded-xl border border-base-300 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-3">Répartition par statut</h4>
            <div className="space-y-3">
              {stats.byStatus.map((item) => {
                const maxVal = Math.max(...stats.byStatus.map(s => s.total));
                const pct = maxVal > 0 ? (item.total / maxVal) * 100 : 0;
                const statusColor = item.status === 'Paye' || item.status === 'Payée' ? 'bg-success' : item.status === 'Partiel' ? 'bg-warning' : 'bg-base-300';
                const statusLabel: Record<string, string> = { Paye: 'Payée', Payée: 'Payée', Partiel: 'Partiel', 'En attente': 'En attente' };
                return (
                  <div key={item.status} className="flex items-center gap-3">
                    <span className="text-xs font-medium w-24">{statusLabel[item.status] ?? item.status}</span>
                    <div className="flex-1 h-6 bg-base-200 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(pct, 2)}%` }}
                        transition={{ duration: 0.6, ease: 'easeOut' }}
                        className={`h-full ${statusColor} rounded-full`}
                      />
                    </div>
                    <span className="text-xs font-semibold w-20 text-right tabular-nums">{formatCurrency(item.total)}</span>
                    <span className="text-xs text-base-content/40 w-10 text-right">{item.count}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Payment progress donut */}
          <div className="bg-base-100 rounded-xl border border-base-300 p-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-3">Progression encaissement</h4>
            <div className="flex items-center gap-6">
              <div className="relative w-28 h-28">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="oklch(var(--b2))" strokeWidth="3" />
                  <motion.circle
                    cx="18" cy="18" r="15.9" fill="none"
                    stroke="oklch(var(--su))" strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={`${stats.total.total > 0 ? (stats.total.paid / stats.total.total) * 100 : 0} ${100 - (stats.total.total > 0 ? (stats.total.paid / stats.total.total) * 100 : 0)}`}
                    initial={{ strokeDasharray: '0 100' }}
                    animate={{ strokeDasharray: `${stats.total.total > 0 ? (stats.total.paid / stats.total.total) * 100 : 0} ${100 - (stats.total.total > 0 ? (stats.total.paid / stats.total.total) * 100 : 0)}` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-success">
                    {stats.total.total > 0 ? Math.round((stats.total.paid / stats.total.total) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success" />
                  <span>Payée: <strong>{formatCurrency(stats.total.paid)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-warning" />
                  <span>Restant: <strong>{formatCurrency(stats.total.remaining)}</strong></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-base-300" />
                  <span>Total: <strong>{formatCurrency(stats.total.total)}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export const VentesChartSection = memo(VentesChartSectionInner);
