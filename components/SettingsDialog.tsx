import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CODE_THEMES, CODE_FONTS } from '@/lib/constants';
import type { CodeTheme, CodeFont } from '@/lib/constants';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onThemeChange?: (theme: string) => void;
}

export function applyCodeFont(fontId: string) {
  const font = CODE_FONTS.find((f) => f.id === fontId);
  if (font) {
    document.documentElement.style.setProperty('--font-mono', `${font.family}, ui-monospace, monospace`);
  }
}

export function SettingsDialog({ open, onOpenChange, onThemeChange }: Props) {
  const [codeTheme, setCodeTheme] = useState<CodeTheme>('aurora-x');
  const [codeFont, setCodeFont] = useState<CodeFont>('jetbrains-mono');
  const [claudePath, setClaudePath] = useState('');
  const [geminiPath, setGeminiPath] = useState('');
  const [claudeDetected, setClaudeDetected] = useState('');
  const [geminiDetected, setGeminiDetected] = useState('');

  useEffect(() => {
    if (!open) return;
    void window.electronAPI.loadPreferences().then((prefs) => {
      if (prefs.codeTheme) setCodeTheme(prefs.codeTheme as CodeTheme);
      if (prefs.codeFont) setCodeFont(prefs.codeFont as CodeFont);
      setClaudePath(prefs.claudePath || '');
      setGeminiPath(prefs.geminiPath || '');
    });
    void window.electronAPI.detectBinaryPath('claude').then(setClaudeDetected);
    void window.electronAPI.detectBinaryPath('gemini').then(setGeminiDetected);
  }, [open]);

  function saveField(overrides: Record<string, string>) {
    void window.electronAPI.loadPreferences().then((prefs) => {
      void window.electronAPI.savePreferences({ ...prefs, ...overrides });
    });
  }

  function handleSelectTheme(theme: CodeTheme) {
    setCodeTheme(theme);
    saveField({ codeTheme: theme });
    onThemeChange?.(theme);
  }

  function handleSelectFont(font: CodeFont) {
    setCodeFont(font);
    saveField({ codeFont: font });
    applyCodeFont(font);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure your preferences</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Code font</label>
            <div className="flex flex-wrap gap-2">
              {CODE_FONTS.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => handleSelectFont(f.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    codeFont === f.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  }`}
                  style={{ fontFamily: `${f.family}, monospace` }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Code theme</label>
            <div className="flex flex-wrap gap-2">
              {CODE_THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTheme(t.id)}
                  className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    codeTheme === t.id
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Claude CLI path</label>
            <input
              type="text"
              value={claudePath}
              placeholder={claudeDetected || 'auto-detect'}
              onChange={(e) => setClaudePath(e.target.value)}
              onBlur={() => saveField({ claudePath })}
              className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Leave empty to auto-detect</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Gemini CLI path</label>
            <input
              type="text"
              value={geminiPath}
              placeholder={geminiDetected || 'auto-detect'}
              onChange={(e) => setGeminiPath(e.target.value)}
              onBlur={() => saveField({ geminiPath })}
              className="rounded-md border border-input bg-transparent px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            <p className="text-xs text-muted-foreground">Leave empty to auto-detect</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
