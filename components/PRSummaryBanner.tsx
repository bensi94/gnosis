'use client';

import { ExternalLink, Files, GitCommitHorizontal, Clock, ArrowLeft, Settings } from 'lucide-react';
import { GitHubIcon } from '@/lib/constants';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { riskConfig } from '@/lib/constants';
import type { ReviewGuide } from '@/lib/types';
import { formatDuration } from '@/lib/utils';

interface Props {
  review: ReviewGuide;
  onBack?: () => void;
  onOpenSettings?: () => void;
}

export function PRSummaryBanner({ review, onBack, onOpenSettings }: Props) {
  const risk = riskConfig[review.riskLevel];

  return (
    <Card className="rounded-none border-x-0 border-t-0 border-b">
      <CardContent className="py-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {onBack && (
              <Button variant="ghost" size="sm" onClick={onBack} className="gap-1 shrink-0 -ml-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <h1 className="text-base font-semibold truncate font-display">{review.prTitle}</h1>
            <Badge variant={risk.variant} className="shrink-0">
              {risk.label}
            </Badge>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
            <span>{review.author}</span>
            <span className="flex items-center gap-1">
              <Files className="h-3 w-3" />
              {review.totalFilesChanged}
            </span>
            <span className="flex items-center gap-1">
              <GitCommitHorizontal className="h-3 w-3" />
              {review.totalLinesChanged} lines
            </span>
            {review.generationDurationMs != null && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(review.generationDurationMs)}
              </span>
            )}
            {onOpenSettings && (
              <button
                onClick={onOpenSettings}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Settings"
              >
                <Settings className="h-3.5 w-3.5" />
              </button>
            )}
            <a
              href={review.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <GitHubIcon className="h-3.5 w-3.5" />
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
