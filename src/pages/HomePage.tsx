import { useState, useEffect } from 'react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Badge } from '../../components/ui/badge';
import { LoadingScreen } from '../../components/LoadingScreen';
import type { ReviewGuide, ReviewHistoryEntry } from '../../lib/types';

interface Props {
  onReviewReady: (review: ReviewGuide) => void;
}

const riskConfig = {
  low:    { label: 'Low',    className: 'bg-zinc-700 text-zinc-200 border-zinc-600' },
  medium: { label: 'Medium', className: 'bg-blue-900 text-blue-200 border-blue-700' },
  high:   { label: 'High',   className: 'bg-red-900 text-red-200 border-red-700' },
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function HomePage({ onReviewReady }: Props) {
  const [prUrl, setPrUrl] = useState('');
  const [model, setModel] = useState<'opus' | 'sonnet'>('opus');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubToken, setGithubToken] = useState('');
  const [tokenSaved, setTokenSaved] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [history, setHistory] = useState<ReviewHistoryEntry[]>([]);

  useEffect(() => {
    window.electronAPI.getConfig().then((cfg) => {
      if (cfg.githubToken) {
        setGithubToken(cfg.githubToken);
        setTokenSaved(true);
      } else {
        setShowSettings(true);
      }
    });
    window.electronAPI.listReviews().then(setHistory);
  }, []);

  async function handleSaveToken(e: React.FormEvent) {
    e.preventDefault();
    await window.electronAPI.saveConfig({ githubToken: githubToken.trim() || null });
    setTokenSaved(true);
    setShowSettings(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const review = await window.electronAPI.generateReview({
        prUrl: prUrl.trim(),
        model,
        instructions: instructions.trim() || undefined,
      });
      // Refresh history in the background
      window.electronAPI.listReviews().then(setHistory);
      onReviewReady(review);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setLoading(false);
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

  if (loading) {
    return <LoadingScreen message="Analyzing your PR with Claude... This takes 30–60 seconds for large PRs." />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">Gnosis</h1>
          <p className="mt-2 text-muted-foreground">
            AI-guided code review. Understand the story before you read the diff.
          </p>
        </div>

        {/* GitHub token settings */}
        {showSettings ? (
          <Card>
            <CardContent className="pt-6">
              <form onSubmit={handleSaveToken} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="github-token" className="text-sm font-medium">
                    GitHub Token
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Create a token at github.com/settings/tokens with{' '}
                    <code className="font-mono bg-muted/70 rounded px-1">repo</code> read access.
                  </p>
                  <input
                    id="github-token"
                    type="password"
                    placeholder="ghp_..."
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  />
                </div>
                <Button type="submit">Save Token</Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setShowSettings(true)}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              {tokenSaved ? '✓ GitHub token saved · change' : 'Set GitHub token'}
            </button>
          </div>
        )}

        {!showSettings && (
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
                  <label className="text-sm font-medium">Model</label>
                  <div className="flex gap-2">
                    {(['opus', 'sonnet'] as const).map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setModel(m)}
                        className={`flex-1 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                          model === m
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input bg-transparent text-muted-foreground hover:text-foreground hover:border-foreground/30'
                        }`}
                      >
                        {m === 'opus' ? 'Opus 4.6' : 'Sonnet 4.6'}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {model === 'opus' ? 'Best quality · slower' : 'Faster · lower cost'}
                  </p>
                </div>

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
                              {entry.author} · {timeAgo(entry.savedAt)}
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
