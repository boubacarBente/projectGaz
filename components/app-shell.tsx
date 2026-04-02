'use client';

import Link from "next/link";
import { ReactNode } from "react";
import { useSettings } from "@/app/parametres/page";

const navigation = [
  { href: "/", label: "Dashboard", description: "Vue d'ensemble" },
  {
    href: "/factures",
    label: "Factures",
    description: "Ventes, paiements et impressions",
  },
  { href: "/clients", label: "Clients", description: "Profils et historique" },
  { href: "/produits", label: "Produits", description: "Catalogue et tarifs" },
  { href: "/stock", label: "Stock", description: "Inventaire et alertes" },
  {
    href: "/depenses",
    label: "Depenses",
    description: "Suivi des charges de l'activite",
  },
  {
    href: "/rapports",
    label: "Rapports",
    description: "Analyses et tendances",
  },
  {
    href: "/parametres",
    label: "Parametres",
    description: "Configuration de l'application",
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { settings, isLoading } = useSettings();
  const companyName = isLoading ? "Gestion Gaz" : settings.companyName;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.18),transparent_32%),linear-gradient(180deg,#f7fafc_0%,#eef4fb_48%,#eaf0f7_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col lg:flex-row">
        <aside className="border-b border-white/70 bg-slate-950 px-6 py-8 text-slate-100 shadow-2xl shadow-slate-950/10 lg:sticky lg:top-0 lg:min-h-screen lg:w-80 lg:border-b-0 lg:border-r lg:px-8">
          <div className="mb-8 space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">
              {companyName}
            </p>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                {settings.companyName || "Mini-centre de distribution"}
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                {settings.companyAddress || "Application de gestion"}
              </p>
            </div>
          </div>

          <nav className="space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group block rounded-2xl border border-white/8 bg-white/4 px-4 py-3 transition hover:border-amber-300/40 hover:bg-white/8"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium text-white">{item.label}</span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400 transition group-hover:text-amber-200">
                    Ouvrir
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-300">{item.description}</p>
              </Link>
            ))}
          </nav>

          <div className="mt-8 rounded-3xl border border-amber-300/20 bg-amber-300/10 p-5 text-sm text-amber-50">
            <p className="font-semibold">Routes du cahier des charges</p>
            <p className="mt-2 leading-6 text-amber-100/90">
              Factures, clients, produits, stock, depenses, rapports et
              parametres sont maintenant accessibles depuis la navigation.
            </p>
          </div>
        </aside>

        <main className="flex-1 px-5 py-6 sm:px-8 lg:px-10 lg:py-10">
          <div className="mx-auto max-w-5xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
