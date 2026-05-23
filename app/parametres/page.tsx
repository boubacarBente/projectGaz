'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { Modal } from '@/components/modal';
import { applyThemeColors } from '@/lib/colors';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

type Settings = {
  companyName: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  defaultMinStock: number;
  currency: string;
  currencySymbol: string;
  dateFormat: string;
  invoicePrefix: string;
  purchasePrefix: string;
  lowStockAlertEnabled: boolean;
  theme: 'light' | 'dark';
  primaryColor: string;
  sidebarColor: string;
};

const defaultSettings: Settings = {
  companyName: 'Mini-Centre Distribution',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  defaultMinStock: 10,
  currency: 'GNF',
  currencySymbol: 'GNF',
  dateFormat: 'DD/MM/YYYY',
  invoicePrefix: 'FAC',
  purchasePrefix: 'ACH',
  lowStockAlertEnabled: true,
  theme: 'light',
  primaryColor: '#1e40af',
  sidebarColor: '#1e293b',
};

// Context for global settings
const SettingsContext = createContext<{
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  isLoading: boolean;
}>({
  settings: defaultSettings,
  updateSettings: async () => { },
  isLoading: true,
});

export const useSettings = () => useContext(SettingsContext);

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/parametres');
        const data = await res.json();
        setSettings(data);
        // Appliquer les couleurs dès le chargement
        applyThemeColors(
          data.primaryColor || defaultSettings.primaryColor,
          data.sidebarColor || defaultSettings.sidebarColor,
          data.theme === 'dark',
        );
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // Appliquer les couleurs à chaque changement de settings
  useEffect(() => {
    if (!isLoading) {
      applyThemeColors(
        settings.primaryColor || defaultSettings.primaryColor,
        settings.sidebarColor || defaultSettings.sidebarColor,
        settings.theme === 'dark',
      );
    }
  }, [settings.primaryColor, settings.sidebarColor, settings.theme, isLoading]);

  const updateSettingsHandler = async (updates: Partial<Settings>) => {
    try {
      const res = await fetch('/api/parametres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Erreur');
      const updated = await res.json();
      setSettings(updated);
      toast.success('Paramètres enregistrés!');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
      throw error;
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings: updateSettingsHandler, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

// ============================================
// Card Component for sections
// ============================================
function SettingsCard({
  title,
  icon,
  iconBg,
  children
}: {
  title: string;
  icon: React.ReactNode;
  iconBg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-base-100 border border-base-200 rounded-2xl overflow-hidden shadow-sm">
      <div className="px-6 py-4 bg-base-200/20 border-b border-base-200 flex items-center gap-3">
        <div className={`p-2 rounded-xl ${iconBg}`}>
          {icon}
        </div>
        <h3 className="font-semibold text-base-content">{title}</h3>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  );
}

// ============================================
// Settings Form
// ============================================
interface SettingsFormProps {
  onSave: (settings: Partial<Settings>) => Promise<void>;
  initialSettings: Settings;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}

function SettingsForm({ onSave, initialSettings, isSubmitting, setIsSubmitting }: SettingsFormProps) {
  const [formData, setFormData] = useState<Settings>(initialSettings);
  const [isResettingData, setIsResettingData] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showSeedModal, setShowSeedModal] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setFormData(initialSettings);
  }, [initialSettings]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSave(formData);
    setIsSubmitting(false);
  };

  const updateField = (field: keyof Settings, value: string | number | boolean) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      // Appliquer instantanément les couleurs dès que l'utilisateur change
      // primaryColor, sidebarColor ou theme
      if (field === 'primaryColor' || field === 'sidebarColor' || field === 'theme') {
        const isDark = field === 'theme' ? value === 'dark' : newData.theme === 'dark';
        const primary = field === 'primaryColor' ? (value as string) : newData.primaryColor;
        const sidebar = field === 'sidebarColor' ? (value as string) : newData.sidebarColor;
        if (primary && sidebar) {
          applyThemeColors(primary, sidebar, isDark);
        }
      }
      return newData;
    });
  };

  const handleResetDatabase = async () => {
    setIsResettingData(true);
    try {
      const res = await fetch('/api/parametres/reset-data', {
        method: 'POST',
      });

      if (!res.ok) {
        throw new Error('Erreur');
      }

      toast.success('Base réinitialisée avec succès.');
      setShowResetModal(false);
      window.location.reload();
    } catch {
      toast.error('Erreur lors de la réinitialisation de la base.');
    } finally {
      setIsResettingData(false);
    }
  };

  const handleSeedDatabase = async () => {
    setIsSeeding(true);
    setSeedResult(null);
    try {
      const res = await fetch('/api/parametres/seed-data', {
        method: 'POST',
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erreur');
      }

      setSeedResult(data.message || 'Données préremplies avec succès.');
      toast.success('Données de démo créées!');
      setShowSeedModal(false);
      setTimeout(() => window.location.reload(), 1500);
    } catch {
      toast.error('Erreur lors du préremplissage.');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Info Card */}
      <SettingsCard
        title="Informations de l'entreprise"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        }
        iconBg="bg-info/10 text-info"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">

          <div className='flex justify-center gap-4'>
            <div className="form-control w-full">
              <label className="label block">
                <span className="label-text font-medium text-sm">Nom de l'entreprise</span>
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors"
                placeholder="Mini-Centre Distribution"
              />
            </div>
            <div className="form-control w-full">
              <label className="label block">
                <span className="label-text font-medium text-sm">Téléphone</span>
              </label>
              <input
                type="tel"
                value={formData.companyPhone}
                onChange={(e) => updateField('companyPhone', e.target.value)}
                className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors"
                placeholder="+224 6XX XXX XXX"
              />
            </div>
          </div>
          <div className="form-control">
            <label className="label block">
              <span className="label-text font-medium text-sm">Email</span>
            </label>
            <input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => updateField('companyEmail', e.target.value)}
              className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors"
              placeholder="contact@entreprise.ma"
            />
          </div>
          <div className="form-control md:col-span-2">
            <label className="label block">
              <span className="label-text font-medium text-sm">Adresse</span>
            </label>
            <textarea
              value={formData.companyAddress}
              onChange={(e) => updateField('companyAddress', e.target.value)}
              className="textarea textarea-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors"
              rows={5}
              placeholder="Adresse complète..."
            />
          </div>
        </div>
      </SettingsCard>

      {/* Stock Settings Card */}
      <SettingsCard
        title="Gestion du stock"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        }
        iconBg="bg-warning/10 text-warning"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium text-sm">Seuil de stock minimum par défaut</span>
            </label>
            <input
              type="number" step="any"
              
              value={formData.defaultMinStock}
              onChange={(e) => updateField('defaultMinStock', parseInt(e.target.value) || 0)}
              className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors"
            />
            <label className="label">
              <span className="label-text-alt text-xs opacity-60">Alerte quand le stock atteint cette valeur</span>
            </label>
          </div>
          <div className="form-control flex flex-col justify-center">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                checked={formData.lowStockAlertEnabled}
                onChange={(e) => updateField('lowStockAlertEnabled', e.target.checked)}
                className="checkbox checkbox-primary checkbox-sm"
              />
              <span className="label-text font-medium text-sm">Activer les alertes de stock faible</span>
            </label>
          </div>
        </div>
      </SettingsCard>
{/* Appearance Card */}
      <SettingsCard
        title="Apparence"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        }
        iconBg="bg-accent/10 text-accent"
      >
        {/* <div className="flex items-center gap-4 mb-4">
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                checked={formData.theme === 'dark'}
                onChange={(e) => updateField('theme', e.target.checked ? 'dark' : 'light')}
                className="checkbox checkbox-primary checkbox-sm"
              />
              <span className="label-text font-medium text-sm">Mode sombre</span>
            </label>
          </div>
          <div className="text-sm text-base-content/60">
            {formData.theme === 'dark' ? '🌙' : '☀️'}
          </div>
        </div> */}

        <div className="divider divider-ghost my-2">Personnalisation des couleurs</div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Primary Color */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium text-sm">Couleur principale (boutons & accents)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={formData.primaryColor}
                  onChange={(e) => updateField('primaryColor', e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border border-base-300 bg-transparent"
                  style={{ padding: 2 }}
                />
              </div>
              <input
                type="text"
                value={formData.primaryColor}
                onChange={(e) => updateField('primaryColor', e.target.value)}
                className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors font-mono flex-1"
                placeholder="#1e40af"
              />
              <div
                className="w-8 h-8 rounded-full border border-base-300 shrink-0"
                style={{ backgroundColor: formData.primaryColor }}
              />
            </div>
          </div>

          {/* Sidebar Color */}
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium text-sm">Couleur du sidebar</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={formData.sidebarColor}
                  onChange={(e) => updateField('sidebarColor', e.target.value)}
                  className="w-12 h-12 rounded-xl cursor-pointer border border-base-300 bg-transparent"
                  style={{ padding: 2 }}
                />
              </div>
              <input
                type="text"
                value={formData.sidebarColor}
                onChange={(e) => updateField('sidebarColor', e.target.value)}
                className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors font-mono flex-1"
                placeholder="#1e293b"
              />
              <div
                className="w-8 h-8 rounded-full border border-base-300 shrink-0"
                style={{ backgroundColor: formData.sidebarColor }}
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      {/* Currency & Format Card */}
      <SettingsCard
        title="Devise et format"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        }
        iconBg="bg-success/10 text-success"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-5">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium text-sm">Devise</span>
            </label>
            <select
              value={formData.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              className="select select-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors"
            >
              <option value="GNF">GNF - Franc Guinéen</option>
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - Dollar US</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium text-sm">Format de date</span>
            </label>
            <select
              value={formData.dateFormat}
              onChange={(e) => updateField('dateFormat', e.target.value)}
              className="select select-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium text-sm">Symbole devise</span>
            </label>
            <input
              type="text"
              value={formData.currencySymbol}
              onChange={(e) => updateField('currencySymbol', e.target.value)}
              className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors"
              placeholder="GNF"
            />
          </div>
        </div>
      </SettingsCard>

      {/* Invoice Prefixes Card */}
      <SettingsCard
        title="Préfixes des documents"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        }
        iconBg="bg-primary/10 text-primary"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium text-sm">Préfixe facture de vente</span>
            </label>
            <div className="join">
              <span className="join-item flex items-center px-3 bg-base-200/50 border border-base-300 border-r-0 rounded-l-lg text-base-content/60 text-sm">FAC-</span>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={(e) => updateField('invoicePrefix', e.target.value)}
                className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors rounded-l-none flex-1"
                placeholder="001"
              />
            </div>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium text-sm">Préfixe facture d'achat</span>
            </label>
            <div className="join">
              <span className="join-item flex items-center px-3 bg-base-200/50 border border-base-300 border-r-0 rounded-l-lg text-base-content/60 text-sm">ACH-</span>
              <input
                type="text"
                value={formData.purchasePrefix}
                onChange={(e) => updateField('purchasePrefix', e.target.value)}
                className="input input-bordered bg-base-200/30 focus:bg-base-200/50 transition-colors rounded-l-none flex-1"
                placeholder="001"
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title="Zone dangereuse"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-7.938 4h15.876c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L2.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        }
        iconBg="bg-error/10 text-error"
      >
        <div className="rounded-2xl border border-error/20 bg-error/5 p-5">
          <h4 className="mb-2 font-semibold text-error">Réinitialiser la base de données</h4>
          <p className="text-sm leading-6 text-base-content/70">
            Cette action supprime les clients, les types de clients, les factures de vente, les factures d&apos;usine,
            les fournisseurs, les mouvements de stock, le stock actuel et remet les paramètres par défaut.
            <strong> Les produits sont conservés.</strong>
          </p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              disabled={isResettingData || isSubmitting}
              className="btn btn-error gap-2"
            >
              {isResettingData ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              )}
              Réinitialiser la base
            </button>
          </div>
        </div>
      </SettingsCard>

      {/* Seed Data Card */}
      <SettingsCard
        title="Préremplir les données"
        icon={
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
        }
        iconBg="bg-success/10 text-success"
      >
        <div className="rounded-2xl border border-success/20 bg-success/5 p-5">
          <h4 className="mb-2 font-semibold text-success">Ajouter des données de démonstration</h4>
          <p className="text-sm leading-6 text-base-content/70">
            Crée automatiquement 5 clients et 5 fournisseurs avec des informations réalistes.
            Idéal pour tester l&apos;application après une réinitialisation ou une première installation.
            <br />
            <span className="font-medium">Aucune donnée existante ne sera modifiée.</span>
          </p>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={() => setShowSeedModal(true)}
              disabled={isSeeding || isSubmitting}
              className="btn btn-success gap-2"
            >
              {isSeeding ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              )}
              Préremplir les données
            </button>
          </div>
        </div>
      </SettingsCard>

      {/* Submit Button */}
      <div className="flex justify-end pt-4">
        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary gap-2 min-w-50"
        >
          {isSubmitting ? (
            <span className="loading loading-spinner loading-sm"></span>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          )}
          Enregistrer les paramètres
        </button>
      </div>

      <Modal
        isOpen={showResetModal}
        onClose={() => {
          if (!isResettingData) {
            setShowResetModal(false);
          }
        }}
        title="Confirmer la réinitialisation"
        size="sm"
      >
        <div className="py-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-error/10 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-error" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <p className="text-base-content/70">
              Voulez-vous vraiment réinitialiser les données opérationnelles ?
              <br />
              <span className="text-sm">
                Les clients, les factures, le stock, les mouvements, les fournisseurs et les produits seront supprimés.
              </span>
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button
              type="button"
              onClick={() => setShowResetModal(false)}
              disabled={isResettingData}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleResetDatabase}
              disabled={isResettingData}
              className="btn btn-error"
            >
              {isResettingData ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Confirmer
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSeedModal}
        onClose={() => {
          if (!isSeeding) {
            setShowSeedModal(false);
          }
        }}
        title="Confirmer le préremplissage"
        size="sm"
      >
        <div className="py-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-success/10 p-3 rounded-full">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            </div>
            <p className="text-base-content/70">
              Préremplir la base avec 5 clients et 5 fournisseurs&nbsp;?
              <br />
              <span className="text-sm">
                Cette action n&apos;affectera pas les données existantes.
              </span>
            </p>
          </div>
          {seedResult && (
            <div className="mb-4 p-3 bg-success/5 border border-success/20 rounded-xl text-sm text-success whitespace-pre-line">
              {seedResult}
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4 border-t border-base-200">
            <button
              type="button"
              onClick={() => setShowSeedModal(false)}
              disabled={isSeeding}
              className="btn btn-ghost"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={handleSeedDatabase}
              disabled={isSeeding}
              className="btn btn-success"
            >
              {isSeeding ? (
                <span className="loading loading-spinner loading-sm"></span>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Confirmer
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>
    </form>
  );
}

// ============================================
// Main Page Component
// ============================================
export default function ParametresPage() {
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/parametres');
        if (res.ok) {
          const data = await res.json();
          const merged = { ...defaultSettings, ...data };
          setSettings(merged);
        }
      } catch {
        // fallback to defaults
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async (updates: Partial<Settings>) => {
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/parametres', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (!res.ok) throw new Error('Erreur');
      const saved = await res.json();
      setSettings(prev => ({ ...prev, ...saved }));
      toast.success('Paramètres enregistrés!');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-base-content/40">Vous devez être connecté.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 max-w-5xl mx-auto"
    >
      <PageHeader
        eyebrow="Configuration"
        title="Paramètres"
        description="Personnalisez les paramètres de votre application selon vos besoins"
      />

      <div className="rounded-2xl border border-base-200 bg-base-100 p-1 shadow-xl shadow-base-200/30">
        <SettingsForm
          onSave={handleSave}
          initialSettings={settings}
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      </div>
    </motion.div>
  );
}

