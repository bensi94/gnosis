import { useState, useEffect, useCallback } from 'react';
import { ArrowUpCircle, X } from 'lucide-react';
import type { UpdateInfo } from '../lib/types';

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    window.electronAPI.onUpdateAvailable((info) => setUpdate(info));
    return () => window.electronAPI.offUpdateAvailable();
  }, []);

  const handleDismiss = useCallback((version: string) => {
    void window.electronAPI.dismissUpdate(version);
    setUpdate(null);
  }, []);

  const handleDownload = useCallback((url: string) => {
    void window.electronAPI.openExternal(url);
  }, []);

  if (!update) return null;

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm updateBanner">
      <div className="flex items-center gap-2">
        <ArrowUpCircle className="h-4 w-4 shrink-0" />
        <span>
          Gnosis <strong>v{update.version}</strong> is available
        </span>
        <button
          onClick={() => handleDownload(update.releaseUrl)}
          className="ml-1 rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors updateBanner-btn"
        >
          Download
        </button>
      </div>
      <button onClick={() => handleDismiss(update.version)} className="shrink-0 transition-opacity hover:opacity-80">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
