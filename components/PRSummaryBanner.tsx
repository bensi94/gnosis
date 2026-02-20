'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Markdown } from '@/components/Markdown';
import type { ReviewGuide } from '@/lib/types';

interface Props {
  review: ReviewGuide;
}

const riskConfig = {
  low: { label: 'Low Risk', variant: 'secondary' as const },
  medium: { label: 'Medium Risk', variant: 'default' as const },
  high: { label: 'High Risk', variant: 'destructive' as const },
};

export function PRSummaryBanner({ review }: Props) {
  const risk = riskConfig[review.riskLevel];

  return (
    <Card className="rounded-none border-x-0 border-t-0 border-b">
      <CardContent className="py-4">
        <div className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-base font-semibold truncate">{review.prTitle}</h1>
                <Badge variant={risk.variant}>{risk.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                by <span className="font-medium">{review.author}</span>
                {' · '}
                {review.totalFilesChanged} file{review.totalFilesChanged !== 1 ? 's' : ''} changed
                {' · '}
                {review.totalLinesChanged} lines
              </p>
            </div>
            <a
              href={review.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-muted-foreground hover:text-foreground shrink-0 underline underline-offset-2"
            >
              View on GitHub ↗
            </a>
          </div>

          <Markdown className="text-sm text-muted-foreground">{review.summary}</Markdown>

          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Risk rationale:</span>{' '}
            <Markdown className="inline-block text-xs text-muted-foreground [&_p]:inline">
              {review.riskRationale}
            </Markdown>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
