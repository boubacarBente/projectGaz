'use client';

import { useState, useEffect, createContext, useContext, ReactNode, useRef } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';
import { applyThemeColors } from '@/lib/colors';

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
        applyThemeColors(data.primaryColor, data.sidebarColor, data.theme === 'dark');
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
      applyThemeColors(settings.primaryColor, settings.sidebarColor, settings.theme === 'dark');
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
        applyThemeColors(
          field === 'primaryColor' ? value as string : newData.primaryColor,
          field === 'sidebarColor' ? value as string : newData.sidebarColor,
          isDark,
        );
      }
      return newData;
    });
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
        <div className="flex items-center gap-4 mb-4">
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
        </div>

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
    </form>
  );
}

// ============================================
// Main Page
// ============================================
export default function ParametresPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [settings, setSettings] = useState<Settings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch('/api/parametres');
        const data = await res.json();
        setSettings(data);
      } catch (error) {
        console.error('Error loading settings:', error);
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
      const updated = await res.json();
      setSettings(updated);
      toast.success('Paramètres enregistrés!');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <span className="loading loading-spinner loading-lg text-primary"></span>
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
