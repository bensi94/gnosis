import { useState, useEffect } from 'react';
import { ArrowUpCircle, X, Download, RotateCw, Loader2 } from 'lucide-react';
import type { UpdateInfo } from '../lib/types';

type UpdateState = 'available' | 'downloading' | 'ready' | 'error';

const supportsAutoUpdate = window.electronAPI.platform !== 'linux' && window.electronAPI.isPackaged;

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [state, setState] = useState<UpdateState>('available');

  useEffect(() => {
    window.electronAPI.onUpdateAvailable((info) => {
      setUpdate(info);
      setState('available');
    });
    return () => window.electronAPI.offUpdateAvailable();
  }, []);

  useEffect(() => {
    window.electronAPI.onUpdateDownloaded(() => setState('ready'));
    window.electronAPI.onUpdateError(() => setState('error'));
    return () => {
      window.electronAPI.offUpdateDownloaded();
      window.electronAPI.offUpdateError();
    };
  }, []);

  if (!update) return null;

  const { version, releaseUrl } = update;

  function handleDismiss() {
    void window.electronAPI.dismissUpdate(version);
    setUpdate(null);
  }

  function handleUpdate() {
    setState('downloading');
    void window.electronAPI.applyUpdate();
  }

  function handleRestart() {
    void window.electronAPI.restartToUpdate();
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm updateBanner">
      <div className="flex items-center gap-2">
        <ArrowUpCircle className="h-4 w-4 shrink-0" />

        {state === 'downloading' ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Downloading update...
          </span>
        ) : state === 'ready' ? (
          <span className="flex items-center gap-2">
            Update ready &mdash;
            <button
              onClick={handleRestart}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors updateBanner-btn"
            >
              <RotateCw className="h-3 w-3" />
              Restart
            </button>
          </span>
        ) : (
          <>
            <span>
              Gnosis <strong>v{version}</strong> is available
            </span>
            {supportsAutoUpdate && state === 'available' ? (
              <button
                onClick={handleUpdate}
                className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors updateBanner-btn"
              >
                <Download className="h-3 w-3" />
                Update
              </button>
            ) : (
              <button
                onClick={() => void window.electronAPI.openExternal(releaseUrl)}
                className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors updateBanner-btn"
              >
                <Download className="h-3 w-3" />
                Download
              </button>
            )}
          </>
        )}
      </div>
      <button onClick={handleDismiss} className="shrink-0 transition-opacity hover:opacity-80">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
