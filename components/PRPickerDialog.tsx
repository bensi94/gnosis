import { useState, useEffect, useMemo } from 'react';
import { Search } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { timeAgo } from '@/lib/utils';
import type { PrSearchResult } from '@/lib/types';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
}

export function PRPickerDialog({ open, onOpenChange, onSelect }: Props) {
  const [prs, setPrs] = useState<PrSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [repoFilter, setRepoFilter] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<'author' | 'review-requested' | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    setFilter('');
    setRepoFilter(null);
    setRoleFilter(null);
    window.electronAPI
      .searchPullRequests()
      .then(setPrs)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load pull requests');
      })
      .finally(() => setLoading(false));
  }, [open]);

  const repos = useMemo(() => {
    const set = new Set<string>();
    for (const pr of prs) set.add(`${pr.repoOwner}/${pr.repoName}`);
    return Array.from(set).sort();
  }, [prs]);

  const filtered = useMemo(() => {
    let list = prs;
    if (roleFilter) {
      list = list.filter((pr) => pr.role === roleFilter);
    }
    if (repoFilter) {
      list = list.filter((pr) => `${pr.repoOwner}/${pr.repoName}` === repoFilter);
    }
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(
        (pr) =>
          pr.title.toLowerCase().includes(q) ||
          pr.repoName.toLowerCase().includes(q) ||
          pr.repoOwner.toLowerCase().includes(q) ||
          `${pr.repoOwner}/${pr.repoName}`.toLowerCase().includes(q)
      );
    }
    return list;
  }, [prs, filter, repoFilter, roleFilter]);

  function handleSelect(url: string) {
    onSelect(url);
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card sm:max-w-2xl max-h-[80vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>Select a Pull Request</DialogTitle>
          <DialogDescription>Your open PRs and review requests</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Filter by title..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-background/50 pl-9 pr-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { value: null, label: 'All' },
                { value: 'review-requested', label: 'Assigned to me' },
                { value: 'author', label: 'By me' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={label}
                type="button"
                onClick={() => setRoleFilter(roleFilter === value ? null : value)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  roleFilter === value
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {repos.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setRepoFilter(null)}
                className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                  repoFilter === null
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input text-muted-foreground hover:text-foreground hover:border-foreground/30'
                }`}
              >
                All
              </button>
              {repos.map((repo) => (
                <button
                  key={repo}
                  type="button"
                  onClick={() => setRepoFilter(repoFilter === repo ? null : repo)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    repoFilter === repo
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-input text-muted-foreground hover:text-foreground hover:border-foreground/30'
                  }`}
                >
                  {repo}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="overflow-y-auto -mx-6 min-h-0 max-h-[50vh]">
          {loading && (
            <div className="flex flex-col gap-3 px-6 py-2">
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-16 w-full rounded-md" />
            </div>
          )}

          {error && <p className="text-sm text-destructive py-4 text-center">{error}</p>}

          {!loading && !error && filtered.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              {prs.length === 0 ? 'No open pull requests found' : 'No results match your filter'}
            </p>
          )}

          {!loading && !error && filtered.length > 0 && (
            <ul className="divide-y divide-border">
              {filtered.map((pr) => (
                <li key={pr.url}>
                  <button
                    type="button"
                    onClick={() => handleSelect(pr.url)}
                    className="w-full flex flex-col gap-1 px-6 py-3 text-left hover:bg-muted/60 transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs text-muted-foreground shrink-0">
                        {pr.repoOwner}/{pr.repoName}#{pr.number}
                      </span>
                      {pr.isDraft && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-600 text-zinc-400">
                          Draft
                        </Badge>
                      )}
                      {pr.role === 'review-requested' && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-blue-700 text-blue-400">
                          Review requested
                        </Badge>
                      )}
                    </div>
                    <span className="text-sm font-medium truncate">{pr.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {pr.author} &middot; {timeAgo(pr.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
