'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { toast } from 'react-toastify';
import { motion } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  // Setup mode
  const [setupName, setSetupName] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');

  useEffect(() => {
    // Vérifier si un admin existe déjà
    fetch('/api/auth/setup')
      .then(res => res.json())
      .then(data => {
        setNeedsSetup(data.needsSetup);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !password.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur de connexion');
        setIsSubmitting(false);
        return;
      }

      toast.success('Connexion réussie !');
      router.push('/');
    } catch {
      toast.error('Erreur de connexion au serveur');
      setIsSubmitting(false);
    }
  };

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setupName.trim() || !setupPassword.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }
    if (setupPassword.length < 4) {
      toast.error('Le mot de passe doit contenir au moins 4 caractères');
      return;
    }
    if (setupPassword !== setupConfirm) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: setupName.trim(), password: setupPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        setIsSubmitting(false);
        return;
      }

      toast.success('Administrateur créé ! Connectez-vous.');
      setNeedsSetup(false);
      setName(setupName.trim());
      setSetupName('');
      setSetupPassword('');
      setSetupConfirm('');
      setIsSubmitting(false);
    } catch {
      toast.error('Erreur serveur');
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-200">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-200 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-base-100 rounded-2xl shadow-xl border border-base-200 p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 overflow-hidden">
              <Image src="/logo.jpeg" alt="Logo" width={80} height={80} className="object-cover" />
            </div>
            <h1 className="text-2xl font-bold text-base-content">
              {needsSetup ? 'Configuration initiale' : 'Connexion'}
            </h1>
            <p className="text-sm text-base-content/60 mt-1">
              {needsSetup
                ? 'Créez le compte administrateur'
                : 'Connectez-vous à votre espace'}
            </p>
          </div>

          {needsSetup ? (
            /* Formulaire de création du premier admin */
            <form onSubmit={handleSetup} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1.5">
                  Nom d&apos;utilisateur
                </label>
                <input
                  type="text"
                  value={setupName}
                  onChange={e => setSetupName(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="admin"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1.5">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={setupPassword}
                  onChange={e => setSetupPassword(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1.5">
                  Confirmer le mot de passe
                </label>
                <input
                  type="password"
                  value={setupConfirm}
                  onChange={e => setSetupConfirm(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full gap-2"
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                )}
                Créer l&apos;administrateur
              </button>
            </form>
          ) : (
            /* Formulaire de connexion */
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1.5">
                  Nom d&apos;utilisateur
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="Entrez votre nom"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-base-content/80 mb-1.5">
                  Mot de passe
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="input input-bordered w-full"
                  placeholder="••••••••"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary w-full gap-2"
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm"></span>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                )}
                Se connecter
              </button>
            </form>
          )}

          <div className="mt-6 text-center text-xs text-base-content/40">
            {needsSetup
              ? 'Première connexion détectée — créez votre compte administrateur'
              : 'Session valable le temps de la navigation'}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
