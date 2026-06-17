'use client';

import Link from "next/link";
import Image from 'next/image';
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { useSettings } from "@/app/parametres/page";
import { useTheme } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";
import { motion, AnimatePresence } from 'framer-motion';

const navigation = [
  { 
    href: "/", 
    label: "Dashboard", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-9 9h9a1 1 0 011 1v1a1 1 0 01-1 1h-2" />
      </svg>
    )
  },
  { 
    href: "/ventes", 
    label: "Ventes", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    )
  },
  { 
    href: "/clients", 
    label: "Clients", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  { 
    href: "/produits", 
    label: "Produits", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    )
  },
  {
    href: "/stocks",
    label: "Stocks",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    )
  },

  { 
    href: "/factures-usine", 
    label: "Usine", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    )
  },
  { 
    href: "/fournisseurs", 
    label: "Fournisseurs", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0v2m0-2v-2m0 2H9m2 2v-2m0 2h6m-6 0H7m14 0v2m0-2v-2m0 2H9" />
      </svg>
    )
  },
  {
    href: "/portefeuille",
    label: "Portefeuille",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    )
  },
  { 
    href: "/rapports", 
    label: "Rapports", 
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    href: "/utilisateurs",
    label: "Utilisateurs",
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    )
  },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { settings, isLoading } = useSettings();
  const { theme } = useTheme();
  const { user, logout } = useAuth();
  const isDark = theme === 'dark';
  const companyName = isLoading ? "Gestion Gaz" : settings.companyName;
  const isActive = (href: string) => {
    if (href === "/") return pathname === href;
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  // Login page → render children without sidebar
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Main content background
  const contentBg = isDark ? 'bg-slate-900' : 'bg-base-100';

  return (
    <div className="flex min-h-screen">
      {/* Sidebar - les couleurs sont gérées via CSS variables (--sidebar-color) */}
      <aside className="hidden lg:flex flex-col w-72 min-h-screen text-(--sidebar-text)"
        style={{ backgroundColor: 'var(--sidebar-color)' }}>
        {/* Logo/Header */}
        <div className="p-6 border-b" style={{ borderColor: 'color-mix(in srgb, var(--sidebar-text) 15%, transparent)' }}>
          <Link href="/" className="flex items-center gap-3">
            <Image src={'/logo.jpeg'} alt="" width={100} height={50}></Image>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--sidebar-text)' }}>{companyName}</h1>
              <p className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>Gestion</p>
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <h2 className="text-xs font-bold uppercase tracking-wider mb-3 px-3"
            style={{ color: 'var(--sidebar-text-muted)' }}>
            Navigation
          </h2>
          <ul className="space-y-1">
            {navigation.map((item) => (
              <li key={item.href}>
                <Link 
                  href={item.href} 
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 border ${
                    isActive(item.href) 
                      ? 'text-white border-transparent' 
                      : 'border-transparent'
                  }`}
                  style={{
                    backgroundColor: isActive(item.href)
                      ? 'color-mix(in srgb, var(--sidebar-text) 20%, transparent)'
                      : 'transparent',
                    color: isActive(item.href) ? 'var(--sidebar-text)' : 'var(--sidebar-text-muted)',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive(item.href)) {
                      e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--sidebar-text) 10%, transparent)';
                      e.currentTarget.style.color = 'var(--sidebar-text)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive(item.href)) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--sidebar-text-muted)';
                    }
                  }}
                >
                  <span style={{ color: isActive(item.href) ? 'var(--sidebar-text)' : 'inherit' }}>
                    {item.icon}
                  </span>
                  <span className="font-medium">{item.label}</span>
                </Link>
              </li>
            ))}
          </ul>


        </nav>

        {/* User card */}
        <div className="p-4 border-t" style={{ borderColor: 'color-mix(in srgb, var(--sidebar-text) 15%, transparent)' }}>
          <div className="p-4 rounded-2xl" style={{
            backgroundColor: 'color-mix(in srgb, var(--sidebar-text) 10%, transparent)',
            border: '1px solid color-mix(in srgb, var(--sidebar-text) 15%, transparent)',
          }}>
            {/* User info */}
            {user && (
              <div className="flex items-center gap-3 mb-3 pb-3 border-b" style={{ borderColor: 'color-mix(in srgb, var(--sidebar-text) 15%, transparent)' }}>
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--p-color), var(--s-color))',
                    color: 'white',
                  }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--sidebar-text)' }}>{user.name}</p>
                  <p className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>
                    {user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}
                  </p>
                </div>
              </div>
            )}

            {/* Theme toggle */}
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>Thème</span>
              <ThemeToggle />
            </div>

            {/* Refresh button */}
            <button
              onClick={() => window.location.reload()}
              className="btn btn-sm w-full btn-ghost mb-2"
              style={{ color: 'var(--sidebar-text-muted)' }}
              title="Recharger la page"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Recharger
            </button>

            {/* Settings link */}
            <Link 
              href="/parametres" 
              className="btn btn-sm w-full border-0 text-white mb-2"
              style={{
                background: 'linear-gradient(135deg, var(--p-color), var(--s-color))',
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Paramètres
            </Link>

            {/* Logout button */}
            <button
              onClick={logout}
              className="btn btn-sm w-full btn-ghost"
              style={{ color: 'var(--sidebar-text-muted)' }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Déconnexion
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 py-3 border-b border-base-200 bg-base-100 shadow-sm">
        <Link href="/" className="flex items-center gap-2">
          <Image src={'/logo.jpeg'} alt="" width={32} height={32} className="rounded" />
          <span className="font-bold text-sm">{companyName}</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Drawer Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setMobileMenuOpen(false)}
            />
            <motion.aside
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', duration: 0.4, bounce: 0.1 }}
              className="fixed top-0 right-0 z-50 h-full w-72 shadow-2xl lg:hidden overflow-y-auto"
              style={{ backgroundColor: 'var(--sidebar-color)' }}
            >
              <div className="p-4 border-b flex items-center justify-between"
                style={{ borderColor: 'color-mix(in srgb, var(--sidebar-text) 15%, transparent)' }}>
                <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                  <Image src={'/logo.jpeg'} alt="" width={32} height={32} className="rounded" />
                  <span className="font-bold text-sm" style={{ color: 'var(--sidebar-text)' }}>{companyName}</span>
                </Link>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-ghost btn-sm btn-square"
                  style={{ color: 'var(--sidebar-text)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <nav className="p-4">
                <ul className="space-y-1">
                  {navigation.map((item) => (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200"
                        style={{
                          backgroundColor: isActive(item.href)
                            ? 'color-mix(in srgb, var(--sidebar-text) 20%, transparent)'
                            : 'transparent',
                          color: isActive(item.href) ? 'var(--sidebar-text)' : 'var(--sidebar-text-muted)',
                        }}
                      >
                        {item.icon}
                        <span className="font-medium">{item.label}</span>
                      </Link>
                    </li>
                  ))}

                </ul>
              </nav>
              <div className="p-4 border-t space-y-3" style={{ borderColor: 'color-mix(in srgb, var(--sidebar-text) 15%, transparent)' }}>
                {user && (
                  <div className="flex items-center gap-3 px-3 mb-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, var(--p-color), var(--s-color))' }}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--sidebar-text)' }}>{user.name}</p>
                      <p className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>{user.role === 'admin' ? 'Administrateur' : 'Utilisateur'}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center justify-between px-3">
                  <span className="text-xs" style={{ color: 'var(--sidebar-text-muted)' }}>Thème</span>
                  <ThemeToggle />
                </div>
                <button
                  onClick={() => window.location.reload()}
                  className="btn btn-sm w-full btn-ghost"
                  style={{ color: 'var(--sidebar-text-muted)' }}
                  title="Recharger la page"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Recharger
                </button>
                <button
                  onClick={logout}
                  className="btn btn-sm w-full btn-ghost"
                  style={{ color: 'var(--sidebar-text-muted)' }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Déconnexion
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className={`flex-1 ${contentBg} min-h-screen lg:pt-0 pt-16`}>
        <div className="max-w-7xl mx-auto p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
