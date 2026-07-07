'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';

type UpdateState =
  | 'idle'
  | 'checking'
  | 'current'
  | 'available'
  | 'downloading'
  | 'downloaded'
  | 'error'
  | 'dev'
  | 'unavailable';

function getPayloadVersion(payload?: ElectronUpdatePayload | null) {
  return payload && typeof payload.version === 'string' ? payload.version : null;
}

function getProgress(payload: ElectronUpdatePayload | number) {
  if (typeof payload === 'number') return payload;
  return typeof payload.percent === 'number' ? payload.percent : null;
}

export function UpdateStatus() {
  const [isElectron, setIsElectron] = useState(false);
  const [currentVersion, setCurrentVersion] = useState<string | null>(null);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [state, setState] = useState<UpdateState>('idle');
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const manualCheckRef = useRef(false);

  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.isElectron) return;

    setIsElectron(true);
    api.getAppVersion().then(setCurrentVersion).catch(() => setCurrentVersion(null));

    const unsubscribers = [
      api.onUpdateChecking?.(() => {
        setState('checking');
        setMessage('Verification en cours...');
      }),
      api.onUpdateAvailable?.((payload) => {
        const version = getPayloadVersion(payload);
        setLatestVersion(version);
        setState('available');
        setProgress(null);
        setMessage(version ? `Version ${version} disponible` : 'Mise a jour disponible');
        toast.info(
          version
            ? `Mise a jour ${version} disponible. Telechargement en cours...`
            : 'Mise a jour disponible. Telechargement en cours...',
          { toastId: 'update-available' }
        );
      }),
      api.onUpdateProgress?.((payload) => {
        const percent = getProgress(payload);
        setState('downloading');
        setProgress(percent);
        setMessage(percent === null ? 'Telechargement en cours...' : `Telechargement ${percent}%`);
      }),
      api.onUpdateDownloaded?.((payload) => {
        const version = getPayloadVersion(payload);
        setLatestVersion(version);
        setState('downloaded');
        setProgress(100);
        setMessage(version ? `Version ${version} prete` : 'Mise a jour prete');
        toast.success('Mise a jour telechargee. Redemarrez pour l installer.', {
          toastId: 'update-downloaded',
          autoClose: false,
        });
      }),
      api.onUpdateNotAvailable?.((payload) => {
        const version = getPayloadVersion(payload);
        setLatestVersion(version);
        setState('current');
        setProgress(null);
        setMessage('Application a jour');
        if (manualCheckRef.current) {
          toast.info('Application deja a jour.', { toastId: 'update-current' });
        }
      }),
      api.onUpdateError?.((payload) => {
        const errorMessage = payload.message || 'Verification impossible';
        setState('error');
        setMessage(errorMessage);
        toast.error(`Mise a jour: ${errorMessage}`, {
          toastId: 'update-error',
          autoClose: 8000,
        });
      }),
    ].filter(Boolean) as ElectronUpdateUnsubscribe[];

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe());
    };
  }, []);

  const isBusy = state === 'checking' || state === 'downloading' || state === 'available';
  const statusText = useMemo(() => {
    if (message) return message;
    if (state === 'dev') return 'Mode developpement';
    if (state === 'unavailable') return 'Updater indisponible';
    return 'Verifier les mises a jour';
  }, [message, state]);

  const checkForUpdates = async () => {
    const api = window.electronAPI;
    if (!api?.checkForUpdates) return;

    manualCheckRef.current = true;
    setState('checking');
    setMessage('Verification en cours...');

    const result = await api.checkForUpdates();
    if (result?.status === 'dev') {
      setState('dev');
      setMessage('Mode developpement');
      toast.info('Les mises a jour sont actives seulement dans l app installee.');
    } else if (result?.status === 'unavailable') {
      setState('unavailable');
      setMessage('Updater indisponible');
      toast.error('Le module de mise a jour est indisponible.');
    } else if (result?.status === 'error') {
      setState('error');
      setMessage(result.error || 'Verification impossible');
    }
  };

  if (!isElectron) return null;

  return (
    <div
      className="mb-3 rounded-xl px-3 py-2 text-xs"
      style={{
        color: 'var(--sidebar-text-muted)',
        backgroundColor: 'color-mix(in srgb, var(--sidebar-text) 8%, transparent)',
        border: '1px solid color-mix(in srgb, var(--sidebar-text) 14%, transparent)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="truncate">Version {currentVersion || '...'}</span>
        <button
          type="button"
          onClick={checkForUpdates}
          disabled={isBusy}
          className="btn btn-ghost btn-xs min-h-7 h-7 px-2"
          style={{ color: 'var(--sidebar-text)' }}
        >
          Maj
        </button>
      </div>
      <div className="mt-1 truncate" title={statusText}>
        {statusText}
      </div>
      {state === 'downloading' && progress !== null && (
        <progress className="progress progress-primary mt-2 h-1.5 w-full" value={progress} max={100} />
      )}
      {latestVersion && state !== 'current' && (
        <div className="mt-1 truncate">Derniere: {latestVersion}</div>
      )}
    </div>
  );
}
