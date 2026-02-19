'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LoadingScreen } from '@/components/LoadingScreen';
import type { ReviewGuide } from '@/lib/types';

export default function HomePage() {
  const router = useRouter();
  const [prUrl, setPrUrl] = useState('');
  const [model, setModel] = useState<'opus' | 'sonnet'>('opus');
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prUrl.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/generate-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prUrl: prUrl.trim(), model, instructions: instructions.trim() || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'An unexpected error occurred.');
        setLoading(false);
        return;
      }

      const review: ReviewGuide = data.review;
      sessionStorage.setItem('pr-review-data', JSON.stringify(review));
      router.push('/review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error. Please try again.');
      setLoading(false);
    }
  }

  if (loading) {
    return <LoadingScreen message="Analyzing your PR with Claude... This takes 30–60 seconds for large PRs." />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-lg flex flex-col gap-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight">PR Review Guide</h1>
          <p className="mt-2 text-muted-foreground">
            AI-guided code review. Understand the story before you read the diff.
          </p>
        </div>

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
                  Instructions <span className="text-muted-foreground font-normal">(optional)</span>
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
      </div>
    </main>
  );
}
