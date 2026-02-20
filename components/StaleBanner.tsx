import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, RefreshCw, AlertTriangle, HelpCircle } from 'lucide-react';
import type { FreshnessResult } from '../lib/types';
import { timeAgo } from '../lib/utils';

interface Props {
  freshness: FreshnessResult;
  onReReview: () => void;
}

const MAX_DISPLAYED_COMMITS = 20;

export function StaleBanner({ freshness, onReReview }: Props) {
  const [expanded, setExpanded] = useState(false);

  if (freshness.status === 'current') {
    return (
      <div className="mx-4 mt-2 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium staleBanner-current">
        <Check className="h-3.5 w-3.5" />
        <span>Up to date</span>
      </div>
    );
  }

  if (freshness.status === 'unknown') {
    return (
      <div className="mx-4 mt-2 flex items-center gap-2 rounded-md p-3 text-sm staleBanner-unknown">
        <HelpCircle className="h-4 w-4 shrink-0" />
        <span>Could not check freshness: {freshness.reason}</span>
      </div>
    );
  }

  if (freshness.status === 'force-pushed') {
    return (
      <div className="mx-4 mt-2 flex items-center justify-between gap-2 rounded-md p-3 text-sm staleBanner-warn">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>PR was force-pushed since this review was generated.</span>
        </div>
        <button
          onClick={onReReview}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors staleBanner-warn-btn"
        >
          <RefreshCw className="h-3 w-3" />
          Re-review
        </button>
      </div>
    );
  }

  // status === 'stale'
  const { aheadBy, commits } = freshness;
  const displayed = commits.slice(0, MAX_DISPLAYED_COMMITS);
  const overflow = aheadBy - displayed.length;

  return (
    <div className="mx-4 mt-2 rounded-md text-sm staleBanner-warn">
      <div className="flex items-center justify-between gap-2 p-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center gap-2 text-left transition-colors staleBanner-warn-toggle"
        >
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            {aheadBy} commit{aheadBy !== 1 ? 's' : ''} behind
          </span>
          {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={onReReview}
          className="flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium transition-colors staleBanner-warn-btn"
        >
          <RefreshCw className="h-3 w-3" />
          Re-review
        </button>
      </div>

      {expanded && (
        <ul className="px-3 py-2 space-y-1.5 staleBanner-warn-list">
          {displayed.map((c) => (
            <li key={c.sha} className="flex items-baseline gap-2 text-xs">
              <code className="shrink-0 font-mono staleBanner-warn-sha">{c.sha.slice(0, 7)}</code>
              <span className="truncate">{c.message}</span>
              <span className="shrink-0 staleBanner-warn-meta">
                {c.authorLogin} {c.authorDate ? `· ${timeAgo(c.authorDate)}` : ''}
              </span>
            </li>
          ))}
          {overflow > 0 && <li className="text-xs staleBanner-warn-meta">and {overflow} more...</li>}
        </ul>
      )}
    </div>
  );
}
