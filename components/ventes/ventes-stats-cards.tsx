'use client';

import { memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { VentesStats } from '@/lib/ventes-types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-MA').format(value);
}

function VentesStatsCardsInner({ stats }: { stats: VentesStats }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key="stats"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.3 }}
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -mr-8 -mt-8" />
            <div className="stat-title text-xs font-semibold tracking-wider uppercase flex items-center gap-1.5">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              Chiffre d'affaires
            </div>
            <div className="stat-value text-2xl lg:text-3xl tracking-tight">
              {formatCurrency(stats.total.total)}<span className="text-sm font-medium text-base-content/40 ml-1">GNF</span>
            </div>
            <div className="stat-desc flex items-center gap-1 mt-1">
              {stats.total.count} facture{stats.total.count !== 1 ? 's' : ''} · {stats.total.paidCount} payée{stats.total.paidCount !== 1 ? 's' : ''}
            </div>
          </div>
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm">
            <div className="stat-title text-xs font-semibold tracking-wider uppercase">Encaisse</div>
            <div className="stat-value text-2xl lg:text-3xl tracking-tight text-success">
              {formatCurrency(stats.total.paid)}<span className="text-sm font-medium text-base-content/40 ml-1">GNF</span>
            </div>
            <div className="stat-desc">
              {stats.total.total > 0 ? Math.round((stats.total.paid / stats.total.total) * 100) : 0}% encaissé
            </div>
          </div>
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm">
            <div className="stat-title text-xs font-semibold tracking-wider uppercase">Reste à payer</div>
            <div className="stat-value text-2xl lg:text-3xl tracking-tight text-warning">
              {formatCurrency(stats.total.remaining)}<span className="text-sm font-medium text-base-content/40 ml-1">GNF</span>
            </div>
            <div className="stat-desc">
              {stats.dailyAvg > 0 ? `Soit ${Math.round(stats.total.remaining / stats.dailyAvg)} jours de CA` : '—'}
            </div>
          </div>
          <div className="stat bg-base-100 rounded-xl border border-base-300 shadow-sm">
            <div className="stat-title text-xs font-semibold tracking-wider uppercase">Moyenne/facture</div>
            <div className="stat-value text-2xl lg:text-3xl tracking-tight">
              {stats.total.count > 0 ? formatCurrency(Math.round(stats.total.total / stats.total.count)) : '0'}
              <span className="text-sm font-medium text-base-content/40 ml-1">GNF</span>
            </div>
            <div className="stat-desc">{formatCurrency(Math.round(stats.dailyAvg))} GNF / jour</div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export const VentesStatsCards = memo(VentesStatsCardsInner);
