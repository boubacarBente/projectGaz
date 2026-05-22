'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Floating particles ───
function ParticleField() {
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 1,
    delay: Math.random() * 5,
    duration: Math.random() * 8 + 6,
  }));

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
      {particles.map(p => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-white"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            top: `${p.y}%`,
            opacity: 0.08 + Math.random() * 0.1,
          }}
          animate={{
            y: [0, -20, 0],
            opacity: [0.08, 0.2, 0.08],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

// ─── Geometric grid background ───
function GeometricBg() {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden">
      {/* Radial gradient overlay */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(255,255,255,0.03)_0%,_transparent_70%)]" />

      {/* Perspective grid lines */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" viewBox="0 0 1440 900" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="white" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Perspective trapezoid panels */}
      <svg className="absolute bottom-0 w-full opacity-[0.03]" viewBox="0 0 1440 400" preserveAspectRatio="xMidYMax slice">
        <polygon points="0,400 200,0 1240,0 1440,400" fill="none" stroke="white" strokeWidth="0.5" />
        <polygon points="100,400 300,50 1140,50 1340,400" fill="none" stroke="white" strokeWidth="0.3" />
        <polygon points="250,400 430,100 1010,100 1190,400" fill="none" stroke="white" strokeWidth="0.2" />
      </svg>

      {/* Horizontal accent line */}
      <div className="absolute top-1/3 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/5 to-transparent" />
    </div>
  );
}

// ─── Mouse glow follower ───
function MouseGlow() {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouse = useCallback((e: MouseEvent) => {
    if (ref.current) {
      ref.current.style.transform = `translate(${e.clientX - 150}px, ${e.clientY - 150}px)`;
    }
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouse);
    return () => window.removeEventListener('mousemove', handleMouse);
  }, [handleMouse]);

  return (
    <div
      ref={ref}
      className="fixed top-0 left-0 w-[300px] h-[300px] rounded-full bg-white/5 blur-[100px] pointer-events-none z-0 transition-transform duration-500 ease-out will-change-transform"
    />
  );
}

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
        <span className="loading loading-spinner loading-lg text-white/40" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#0a0a0a] font-['Inter',system-ui,sans-serif] overflow-hidden selection:bg-white/10">
      <GeometricBg />
      <ParticleField />
      <MouseGlow />

      {/* Cinematic grain overlay */}
      <div className="fixed inset-0 z-[1] pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='0.5'/%3E%3C/svg%3E")` }}
      />

      {/* Main container */}
      <div className="relative z-10 w-full max-w-md mx-auto px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          className="text-center mb-10"
        >
          {/* Logo / Dragon emblem */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' }}
            className="relative inline-flex items-center justify-center"
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/[0.08] backdrop-blur-xl flex items-center justify-center shadow-2xl shadow-black/50">
              {/* Dragon/Kali-inspired logo */}
              <svg viewBox="0 0 48 48" className="w-10 h-10 sm:w-12 sm:h-12 text-white/70" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M24 4L8 12v10c0 8.84 5.84 16.84 16 20 10.16-3.16 16-11.16 16-20V12L24 4z" />
                <path d="M24 24v16" strokeWidth="1.5" />
                <path d="M16 18l4 4-4 4" />
                <path d="M32 18l-4 4 4 4" />
                <circle cx="24" cy="14" r="2" fill="currentColor" stroke="none" />
              </svg>
            </div>
            {/* Glow ring behind logo */}
            <div className="absolute inset-0 -m-4 rounded-3xl bg-white/5 blur-2xl -z-10" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mt-6 text-2xl sm:text-3xl font-light tracking-wider text-white/80"
          >
            Accès sécurisé
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="mt-2 text-sm text-white/30 font-light tracking-wide"
          >
            Mini-Centre Distribution
          </motion.p>
        </motion.div>

        {/* ─── Login card ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
          className="relative group"
        >
          {/* Glow behind card */}
          <div className="absolute -inset-1 bg-white/5 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />

          <div className="relative backdrop-blur-2xl bg-white/[0.03] border border-white/[0.08] rounded-2xl sm:rounded-3xl p-6 sm:p-10 shadow-2xl shadow-black/40">
            {needsSetup ? (
              /* ─── Setup form ─── */
              <form onSubmit={handleSetup} className="space-y-5">
                <div className="flex items-center gap-3 text-sm text-white/40 font-mono mb-2">
                  <span className="text-emerald-400/60">$</span>
                  <span className="text-cyan-400/50">sudo</span>
                  <span>/setup-admin</span>
                </div>

                <div className="flex items-center gap-3 text-sm">
                  <span className="text-white/40 font-mono w-20 shrink-0">login:</span>
                  <span className="text-white/70 font-mono">{name || 'admin'}</span>
                </div>

                {(['password', 'confirm'] as const).map(field => (
                  <div key={field}>
                    <label className="block text-xs text-white/30 font-mono mb-1.5 tracking-wider uppercase">
                      {field === 'password' ? 'mot de passe' : 'confirmation'}
                    </label>
                    <div className="relative">
                      <input
                        type="password"
                        value={field === 'password' ? setupPassword : setupConfirm}
                        onChange={e => field === 'password' ? setSetupPassword(e.target.value) : setSetupConfirm(e.target.value)}
                        className="w-full bg-transparent border border-white/[0.12] rounded-xl px-4 py-3 text-sm text-white/70 font-mono placeholder-white/20 outline-none transition-all duration-300 focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:bg-white/[0.02]"
                        placeholder="••••••••"
                        autoFocus={field === 'password'}
                      />
                    </div>
                  </div>
                ))}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 px-6 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] hover:border-white/[0.15] text-white/60 hover:text-white/80 text-sm font-light tracking-wider transition-all duration-300 disabled:opacity-30"
                >
                  {isSubmitting ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    'Créer l\'administrateur'
                  )}
                </button>
              </form>
            ) : (
              /* ─── Login form — two steps ─── */
              <form onSubmit={step === 'name' ? handleNameSubmit : handleLogin} className="space-y-5">
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-6">
                  <motion.span
                    animate={{ backgroundColor: step === 'password' ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)' }}
                    className="w-2 h-2 rounded-full bg-white/20 transition-colors duration-500"
                  />
                  <span className="w-6 h-[1px] bg-white/[0.06]" />
                  <motion.span
                    animate={{ backgroundColor: step === 'password' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.06)' }}
                    className="w-2 h-2 rounded-full transition-colors duration-500"
                  />
                </div>

                {/* Username */}
                <motion.div
                  animate={{
                    y: step === 'password' ? -6 : 0,
                    scale: step === 'password' ? 0.98 : 1,
                  }}
                  transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                >
                  <label className="block text-xs text-white/30 font-mono mb-1.5 tracking-wider uppercase">
                    Nom d'utilisateur
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-white/20">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </span>
                    {step === 'name' ? (
                      <input
                        type="text"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleNameSubmit(e as any)}
                        className="w-full bg-transparent border border-white/[0.12] rounded-xl pl-10 pr-4 py-3 text-sm text-white/70 font-light placeholder-white/20 outline-none transition-all duration-300 focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:bg-white/[0.02]"
                        placeholder="Entrez votre nom d'utilisateur"
                        autoFocus
                      />
                    ) : (
                      <div className="w-full border border-white/[0.06] rounded-xl pl-10 pr-4 py-3 text-sm text-white/70 font-light bg-white/[0.02]">
                        {name}
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Password — animated reveal */}
                <AnimatePresence mode="wait">
                  {step === 'password' && (
                    <motion.div
                      key="password-field"
                      initial={{ opacity: 0, y: 20, filter: 'blur(4px)' }}
                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                      transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                    >
                      <label className="block text-xs text-white/30 font-mono mb-1.5 tracking-wider uppercase">
                        Mot de passe
                      </label>
                      <div className="relative">
                        {/* Glow on focus */}
                        <div className="absolute -inset-0.5 bg-white/5 rounded-xl opacity-0 transition-opacity duration-300 has-[input:focus]:opacity-100 pointer-events-none" />
                        <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-white/20 z-10">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                        </span>
                        <input
                          ref={passwordRef}
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="w-full bg-transparent border border-white/[0.12] rounded-xl pl-10 pr-4 py-3 text-sm text-white/70 font-light placeholder-white/20 outline-none transition-all duration-300 focus:border-white/30 focus:ring-1 focus:ring-white/10 focus:bg-white/[0.02] relative z-[1]"
                          placeholder="••••••••"
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit button */}
                <motion.div
                  key={step === 'name' ? 'continue-btn' : 'login-btn'}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 px-6 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.10] border border-white/[0.08] hover:border-white/[0.15] text-white/60 hover:text-white/80 text-sm font-light tracking-wider transition-all duration-300 disabled:opacity-30 flex items-center justify-center gap-2 group/btn"
                  >
                    {isSubmitting ? (
                      <span className="loading loading-spinner loading-sm" />
                    ) : (
                      <>
                        <span>{step === 'name' ? 'Continuer' : 'Connexion'}</span>
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 transition-transform duration-300 ${step === 'password' ? 'group-hover/btn:translate-x-1' : 'group-hover/btn:translate-x-0.5'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={1.5}
                        >
                          {step === 'name' ? (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                          )}
                        </svg>
                      </>
                    )}
                  </button>
                </motion.div>

                {/* Reset link */}
                {step === 'password' && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 }}
                    type="button"
                    onClick={resetToName}
                    className="mt-1 text-xs text-white/20 hover:text-white/40 font-mono transition-colors duration-300"
                  >
                    $ cd ~ &amp;&amp; login --reset
                  </motion.button>
                )}
              </form>
            )}

            {/* Bottom bar */}
            <div className="mt-8 pt-4 border-t border-white/[0.04] flex items-center justify-between text-[10px] text-white/[0.15] font-mono tracking-wider">
              <span className="flex items-center gap-1.5">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500/40" />
                {needsSetup ? 'setup mode' : 'session active'}
              </span>
              <span>v1.0 · connexion sécurisée</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
