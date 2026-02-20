import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { LoadingScreen } from '../../components/LoadingScreen';
import type { ModelId, Provider, ReviewGuide, ReviewHistoryEntry } from '../../lib/types';
import { timeAgo } from '../../lib/utils';

interface Props {
  onReviewReady: (review: ReviewGuide) => void;
  prefillPrUrl?: string;
}

type AuthStatus = 'checking' | 'unauthenticated' | 'signing-in' | { login: string };

const riskConfig = {
  low:    { label: 'Low',    className: 'bg-zinc-700 text-zinc-200 border-zinc-600' },
  medium: { label: 'Medium', className: 'bg-blue-900 text-blue-200 border-blue-700' },
  high:   { label: 'High',   className: 'bg-red-900 text-red-200 border-red-700' },
};

const PROVIDERS = {
  claude: {
    label: 'Claude',
    models: [
      { id: 'claude-opus-4-6', label: 'Opus 4.6' },
      { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
      { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5' },
    ],
  },
  gemini: {
    label: 'Gemini',
    models: [
      { id: 'gemini-3.1-pro-preview', label: '3.1 Pro' },
      { id: 'gemini-3-pro-preview', label: '3 Pro' },
      { id: 'gemini-3-flash-preview', label: '3 Flash' },
      { id: 'gemini-2.5-pro', label: '2.5 Pro' },
      { id: 'gemini-2.5-flash', label: '2.5 Flash' },
    ],
  },
} as const;

const MODEL_LABELS: Record<string, string> = Object.fromEntries(
  Object.values(PROVIDERS).flatMap((p) =>
    p.models.map((m) => [m.id, `${p.label} ${m.label}`]),
  ),
);

// ── Reusable toggle switch ──────────────────────────────────────

interface ToggleSwitchProps {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  badge?: string;
}

function ToggleSwitch({ id, label, description, checked, onToggle, badge }: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium">
          {label}
          {badge && (
            <>
              {' '}
              <span className="ml-1 inline-block rounded bg-amber-900/60 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 leading-none align-middle">
                {badge}
              </span>
            </>
          )}
        </label>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          checked ? 'bg-primary' : 'bg-input'
        }`}
      >
        <span
          className={`pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform ${
            checked ? 'translate-x-4' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

// ── Main page ───────────────────────────────────────────────────

export function HomePage({ onReviewReady, prefillPrUrl }: Props) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>('checking');
  const [prUrl, setPrUrl] = useState(prefillPrUrl ?? '');
  const [provider, setProvider] = useState<Provider>('claude');
  const [model, setModel] = useState<ModelId>('claude-opus-4-6');
  const [thinking, setThinking] = useState(false);
  const [signalBoost, setSignalBoost] = useState(false);
  const [smartImports, setSmartImports] = useState(false);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isThinkingPhase, setIsThinkingPhase] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [history, setHistory] = useState<ReviewHistoryEntry[]>([]);

  useEffect(() => {
    window.electronAPI.getAuthState().then(({ authenticated, login }) => {
      setAuthStatus(authenticated && login ? { login } : 'unauthenticated');
    });
    window.electronAPI.listReviews().then(setHistory);
  }, []);

  async function handleSignIn() {
    setAuthError(null);
    setAuthStatus('signing-in');
    try {
      await window.electronAPI.startOAuth();
      const { login } = await window.electronAPI.getAuthState();
      setAuthStatus(login ? { login } : 'unauthenticated');
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Sign-in failed.');
      setAuthStatus('unauthenticated');
    }
  }

  async function handleSignOut() {
    await window.electronAPI.signOut();
    setAuthStatus('unauthenticated');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prUrl.trim()) return;

    setStreamingText('');
    setIsThinkingPhase(false);
    setLoading(true);
    setError(null);

    window.electronAPI.onReviewProgress((chunk, isThinking) => {
      if (isThinking) {
        setIsThinkingPhase(true);
      } else {
        setIsThinkingPhase(false);
        setStreamingText((prev) => prev + chunk);
      }
    });

    try {
      const review = await window.electronAPI.generateReview({
        prUrl: prUrl.trim(),
        provider,
        model,
        instructions: instructions.trim() || undefined,
        thinking,
        signalBoost,
        smartImports,
      });
      window.electronAPI.listReviews().then(setHistory);
      onReviewReady(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setLoading(false);
    } finally {
      window.electronAPI.offReviewProgress();
    }
  }

  async function handleLoadFromHistory(id: string) {
    setLoading(true);
    try {
      const review = await window.electronAPI.loadReview(id);
      onReviewReady(review);
    } catch {
      setError('Failed to load saved review.');
      setLoading(false);
    }
  }

  async function handleDeleteFromHistory(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    await window.electronAPI.deleteReview(id);
    setHistory((prev) => prev.filter((h) => h.id !== id));
  }

  function handleProviderChange(p: Provider) {
    setProvider(p);
    setModel(PROVIDERS[p].models[0].id);
    if (p === 'gemini') setThinking(false);
  }

  if (loading) {
    return (
      <LoadingScreen
        message={isThinkingPhase ? 'Thinking...' : 'Generating review guide...'}
        streamingText={streamingText}
      />
    );
  }

  const isAuthenticated = typeof authStatus === 'object';

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Gnosis</h1>
          <p className="mt-2 text-muted-foreground">
            AI-guided code review. Understand the story before you read the diff.
          </p>
        </div>

        {/* Auth section */}
        {authStatus === 'checking' && (
          <div className="flex justify-center">
            <span className="text-sm text-muted-foreground animate-pulse">Loading…</span>
          </div>
        )}

        {authStatus === 'unauthenticated' && (
          <>
            {authError && (
              <Alert variant="destructive">
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            <Card>
              <CardContent className="pt-6 flex flex-col gap-3 items-center text-center">
                <p className="text-sm text-muted-foreground">
                  Sign in with GitHub to generate PR reviews.
                </p>
                <Button onClick={handleSignIn} className="w-full">
                  Sign in with GitHub
                </Button>
              </CardContent>
            </Card>
          </>
        )}

        {authStatus === 'signing-in' && (
          <div className="flex flex-col items-center gap-2 text-center">
            <span className="text-sm text-muted-foreground animate-pulse">
              Waiting for GitHub… complete sign-in in your browser.
            </span>
          </div>
        )}

        {isAuthenticated && (
          <div className="flex justify-end items-center gap-2">
            <span className="text-xs text-muted-foreground">
              ✓ Signed in as @{(authStatus as { login: string }).login}
            </span>
            <button
              onClick={handleSignOut}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Sign out
            </button>
          </div>
        )}

        {/* PR form -- only shown when authenticated */}
        {isAuthenticated && (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="pr-url" className="text-sm font-medium">
                    GitHub PR URL
                  </label>
                  <input
                    id="pr-url"
                    type="url"
                    placeholder="https://github.com/owner/repo/pull/123"
                    value={prUrl}
                    onChange={(e) => setPrUrl(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor="instructions" className="text-sm font-medium">
                    Instructions{' '}
                    <span className="text-muted-foreground font-normal">(optional)</span>
                  </label>
                  <textarea
                    id="instructions"
                    rows={2}
                    placeholder="e.g. focus on performance, flag any security concerns, explain the auth flow"
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Provider</label>
                  <div className="flex gap-2">
                    {(['claude', 'gemini'] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handleProviderChange(p)}
                        className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          provider === p
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30'
                        }`}
                      >
                        {PROVIDERS[p].label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium">Model</label>
                  <div className="flex flex-wrap gap-2">
                    {PROVIDERS[provider].models.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setModel(m.id)}
                        className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          model === m.id
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {provider === 'claude' && (
                  <ToggleSwitch
                    id="thinking"
                    label="Extended thinking"
                    description={thinking ? 'Deeper reasoning · slower' : 'Standard speed'}
                    checked={thinking}
                    onToggle={() => setThinking((t) => !t)}
                  />
                )}

                <ToggleSwitch
                  id="signal-boost"
                  label="Signal boost"
                  description="Skip trivial changes, focus on design and complexity"
                  checked={signalBoost}
                  onToggle={() => setSignalBoost((s) => !s)}
                  badge="Experimental"
                />

                <ToggleSwitch
                  id="smart-imports"
                  label="Smart imports"
                  description="Use AI to find related files across all languages"
                  checked={smartImports}
                  onToggle={() => setSmartImports((s) => !s)}
                  badge="Experimental"
                />

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button type="submit" className="w-full">
                  Generate Review
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* History */}
        {history.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Recent reviews</p>
            <Card>
              <CardContent className="p-0">
                <ul className="divide-y">
                  {history.map((entry) => {
                    const risk = riskConfig[entry.riskLevel];
                    return (
                      <li key={entry.id}>
                        <button
                          onClick={() => handleLoadFromHistory(entry.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors group"
                        >
                          <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                            <span className="text-sm font-medium truncate">{entry.prTitle}</span>
                            <span className="text-xs text-muted-foreground truncate">
                              {entry.author} · {entry.model ? MODEL_LABELS[entry.model] ?? entry.model : 'Unknown'} · {timeAgo(entry.savedAt)}
                            </span>
                          </div>
                          <Badge variant="outline" className={`shrink-0 text-xs ${risk.className}`}>
                            {risk.label}
                          </Badge>
                          <button
                            onClick={(e) => handleDeleteFromHistory(e, entry.id)}
                            className="shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity text-xs px-1"
                            aria-label="Delete"
                          >
                            ✕
                          </button>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
