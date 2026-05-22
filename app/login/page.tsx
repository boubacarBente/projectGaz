'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<'name' | 'password'>('name');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [setupPassword, setSetupPassword] = useState('');
  const [setupConfirm, setSetupConfirm] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/auth/setup')
      .then(res => res.json())
      .then(data => {
        setNeedsSetup(data.needsSetup);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (step === 'password' && passwordRef.current) {
      passwordRef.current.focus();
    }
  }, [step]);

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Veuillez entrer un nom d\'utilisateur');
      return;
    }
    setStep('password');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      toast.error('Veuillez entrer votre mot de passe');
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
    if (!setupPassword.trim() || !setupConfirm.trim()) {
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
        body: JSON.stringify({ name: name.trim(), password: setupPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Erreur');
        setIsSubmitting(false);
        return;
      }

      toast.success('Administrateur créé ! Connectez-vous.');
      setNeedsSetup(false);
      setStep('password');
      setSetupPassword('');
      setSetupConfirm('');
      setIsSubmitting(false);
    } catch {
      toast.error('Erreur serveur');
      setIsSubmitting(false);
    }
  };

  const resetToName = () => {
    setStep('name');
    setPassword('');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <span className="loading loading-spinner loading-lg text-green-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a] p-4">
      <div className="w-full max-w-lg">
        {/* Top bar */}
        <div className="bg-[#1a1a1a] rounded-t-xl border border-[#2a2a2a] border-b-0 px-5 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-[#ff5f56]" />
            <div className="w-3 h-3 rounded-full bg-[#ffbd2e]" />
            <div className="w-3 h-3 rounded-full bg-[#27c93f]" />
          </div>
          <span className="text-[#555] text-xs font-mono ml-2">gestion-gaz — login</span>
        </div>

        {/* Terminal body */}
        <div className="bg-[#121212] rounded-b-xl border border-[#2a2a2a] shadow-2xl shadow-black/50 p-6 md:p-10 font-mono">
          {/* Header */}
          <div className="mb-6 text-[#33ff33] text-xs leading-relaxed">
            <p className="opacity-70">Mini-Centre Distribution — Gestion Gaz v1.0</p>
            <p className="opacity-50">{needsSetup ? 'Aucun utilisateur trouvé. Créez un compte administrateur.' : 'Authentification requise.'}</p>
            <p className="opacity-40 mt-1">{'─'.repeat(40)}</p>
          </div>

          {needsSetup ? (
            /* Setup form */
            <form onSubmit={handleSetup} className="space-y-4">
              <div className="flex items-center gap-2 text-green-400">
                <span className="text-green-500">$</span>
                <span className="text-cyan-400">sudo</span>
                <span>/setup-admin</span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-green-500/50 shrink-0">login:</span>
                <span className="text-white/80">{name || 'admin'}</span>
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-500/50 shrink-0">password:</span>
                  <input
                    type="password"
                    value={setupPassword}
                    onChange={e => setSetupPassword(e.target.value)}
                    className="bg-transparent border-none outline-none text-white/80 font-mono text-sm flex-1 p-0"
                    placeholder="••••••••"
                    autoFocus
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-green-500/50 shrink-0">confirm:</span>
                  <input
                    type="password"
                    value={setupConfirm}
                    onChange={e => setSetupConfirm(e.target.value)}
                    className="bg-transparent border-none outline-none text-white/80 font-mono text-sm flex-1 p-0"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-4 px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-mono text-sm transition-colors"
              >
                {isSubmitting ? (
                  <span className="loading loading-spinner loading-sm" />
                ) : (
                  'Créer l\'administrateur'
                )}
              </button>
            </form>
          ) : (
            /* Login form — two steps */
            <form onSubmit={step === 'name' ? handleNameSubmit : handleLogin}>
              {/* Username — always visible */}
              <div className="flex items-center gap-2 text-sm mb-2">
                <span className="text-green-500/50 shrink-0">{name ? 'login:' : 'login:'}</span>
                {step === 'name' ? (
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNameSubmit(e as any)}
                    className="bg-transparent border-none outline-none text-white/80 font-mono text-sm flex-1 p-0 caret-green-400"
                    placeholder="Entrez votre nom"
                    autoFocus
                  />
                ) : (
                  <span className="text-white/80">{name}</span>
                )}
              </div>

              {/* Password — animated reveal */}
              <AnimatePresence>
                {step === 'password' && (
                  <motion.div
                    initial={{ opacity: 0, y: -6, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -6, height: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="flex items-center gap-2 text-sm mb-6">
                      <span className="text-green-500/50 shrink-0">password:</span>
                      <input
                        ref={passwordRef}
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        className="bg-transparent border-none outline-none text-white/80 font-mono text-sm flex-1 p-0 caret-green-400"
                        placeholder="••••••••"
                      />
                    </div>

                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.15 }}
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-40 text-white font-mono text-sm transition-colors flex items-center justify-center gap-2"
                    >
                      {isSubmitting ? (
                        <span className="loading loading-spinner loading-sm" />
                      ) : (
                        <>
                          <span className="text-green-300">$</span>
                          ./login
                        </>
                      )}
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Back link when on password step */}
              {step === 'password' && (
                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.25 }}
                  type="button"
                  onClick={resetToName}
                  className="mt-3 text-xs text-green-700 hover:text-green-500 font-mono transition-colors"
                >
                  $ login --reset
                </motion.button>
              )}
            </form>
          )}

          {/* Bottom status */}
          <div className="mt-6 pt-3 border-t border-[#1f1f1f] text-[#33ff33]/30 text-[10px] font-mono flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500/50" />
            {needsSetup ? 'setup mode' : `session: ${new Date().toLocaleTimeString()}`}
          </div>
        </div>
      </div>
    </div>
  );
}
