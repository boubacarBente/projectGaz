'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';
import { PageHeader } from '@/components/page-header';

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
};

const defaultSettings: Settings = {
  companyName: 'Mini-Centre Distribution',
  companyAddress: '',
  companyPhone: '',
  companyEmail: '',
  defaultMinStock: 10,
  currency: 'MAD',
  currencySymbol: 'MAD',
  dateFormat: 'DD/MM/YYYY',
  invoicePrefix: 'FAC',
  purchasePrefix: 'ACH',
  lowStockAlertEnabled: true,
  theme: 'light',
};

// Context for global settings
const SettingsContext = createContext<{
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  isLoading: boolean;
}>({
  settings: defaultSettings,
  updateSettings: async () => {},
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
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

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

interface SettingsFormProps {
  onSave: (settings: Partial<Settings>) => Promise<void>;
  initialSettings: Settings;
  isSubmitting: boolean;
  setIsSubmitting: (v: boolean) => void;
}

function SettingsForm({ onSave, initialSettings, isSubmitting, setIsSubmitting }: SettingsFormProps) {
  const [formData, setFormData] = useState<Settings>(initialSettings);

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
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Company Info */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-info" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Informations de l'entreprise
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Nom de l'entreprise</span>
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => updateField('companyName', e.target.value)}
              className="input input-bordered"
              placeholder="Mini-Centre Distribution"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Téléphone</span>
            </label>
            <input
              type="tel"
              value={formData.companyPhone}
              onChange={(e) => updateField('companyPhone', e.target.value)}
              className="input input-bordered"
              placeholder="+212 6XX XXX XXX"
            />
          </div>
          <div className="form-control md:col-span-2">
            <label className="label">
              <span className="label-text font-medium">Adresse</span>
            </label>
            <textarea
              value={formData.companyAddress}
              onChange={(e) => updateField('companyAddress', e.target.value)}
              className="textarea textarea-bordered"
              rows={2}
              placeholder="Adresse complète..."
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Email</span>
            </label>
            <input
              type="email"
              value={formData.companyEmail}
              onChange={(e) => updateField('companyEmail', e.target.value)}
              className="input input-bordered"
              placeholder="contact@entreprise.ma"
            />
          </div>
        </div>
      </div>

      {/* Stock Settings */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Paramètres du stock
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Seuil de stock minimum par défaut</span>
            </label>
            <input
              type="number"
              min="0"
              value={formData.defaultMinStock}
              onChange={(e) => updateField('defaultMinStock', parseInt(e.target.value) || 0)}
              className="input input-bordered"
            />
            <label className="label">
              <span className="label-text-alt">Alerte quand le stock atteint cette valeur</span>
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer justify-start gap-3">
              <input
                type="checkbox"
                checked={formData.lowStockAlertEnabled}
                onChange={(e) => updateField('lowStockAlertEnabled', e.target.checked)}
                className="checkbox checkbox-primary"
              />
              <span className="label-text">Activer les alertes de stock faible</span>
            </label>
          </div>
        </div>
      </div>

      {/* Currency & Format */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Devise et format
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Devise</span>
            </label>
            <select
              value={formData.currency}
              onChange={(e) => updateField('currency', e.target.value)}
              className="select select-bordered"
            >
              <option value="MAD">MAD - Dirham Marocain</option>
              <option value="EUR">EUR - Euro</option>
              <option value="USD">USD - Dollar US</option>
            </select>
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Format de date</span>
            </label>
            <select
              value={formData.dateFormat}
              onChange={(e) => updateField('dateFormat', e.target.value)}
              className="select select-bordered"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY (31/12/2024)</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY (12/31/2024)</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD (2024-12-31)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Invoice Prefixes */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Préfixes des documents
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Préfixe facture de vente</span>
            </label>
            <input
              type="text"
              value={formData.invoicePrefix}
              onChange={(e) => updateField('invoicePrefix', e.target.value)}
              className="input input-bordered"
              placeholder="FAC"
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text font-medium">Préfixe facture d'achat</span>
            </label>
            <input
              type="text"
              value={formData.purchasePrefix}
              onChange={(e) => updateField('purchasePrefix', e.target.value)}
              className="input input-bordered"
              placeholder="ACH"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-slate-200">
        <button type="submit" disabled={isSubmitting} className="btn btn-primary gap-2">
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

export default function ParametresPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // We'll use local state and fetch since we can't use the context in a server component
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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Paramètres"
        title="Configuration de l'application"
        description="Personnalisez les paramètres de votre application de gestion."
      />

      <div className="rounded-2xl border border-white/80 bg-white/75 p-6 shadow-lg shadow-slate-200/60 backdrop-blur">
        <SettingsForm 
          onSave={handleSave} 
          initialSettings={settings} 
          isSubmitting={isSubmitting}
          setIsSubmitting={setIsSubmitting}
        />
      </div>
    </div>
  );
}
