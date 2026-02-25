import { useState, useEffect } from 'react';
import { ArrowUpCircle, X, Download } from 'lucide-react';
import type { UpdateInfo } from '../lib/types';

const supportsAutoUpdate = window.electronAPI.platform !== 'linux' && window.electronAPI.isPackaged;

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    window.electronAPI.onUpdateAvailable((info) => setUpdate(info));
    return () => window.electronAPI.offUpdateAvailable();
  }, []);

  // Banner is only for Linux — macOS/Windows use native Squirrel auto-update.
  if (!update || supportsAutoUpdate) return null;

  const { version, releaseUrl } = update;

  function handleDismiss() {
    void window.electronAPI.dismissUpdate(version);
    setUpdate(null);
  }

  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2 text-sm updateBanner">
      <div className="flex items-center gap-2">
        <ArrowUpCircle className="h-4 w-4 shrink-0" />
        <span>
          Gnosis <strong>v{version}</strong> is available
        </span>
        <button
          onClick={() => void window.electronAPI.openExternal(releaseUrl)}
          className="ml-1 inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 text-xs font-medium transition-colors updateBanner-btn"
        >
          <Download className="h-3 w-3" />
          Download
        </button>
      </div>
      <button onClick={handleDismiss} className="shrink-0 transition-opacity hover:opacity-80">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
