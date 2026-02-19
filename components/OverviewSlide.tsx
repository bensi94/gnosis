'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { InlineCode } from '@/components/InlineCode';
import type { ReviewGuide, SlideType } from '@/lib/types';

interface Props {
  review: ReviewGuide;
  onNavigate: (slideNumber: number) => void;
}

const slideTypeConfig: Record<SlideType, { label: string; className: string }> = {
  foundation: { label: 'Foundation', className: 'bg-purple-900 text-purple-200 border-purple-700' },
  feature:    { label: 'Feature',    className: 'bg-blue-900 text-blue-200 border-blue-700' },
  refactor:   { label: 'Refactor',   className: 'bg-orange-900 text-orange-200 border-orange-700' },
  bugfix:     { label: 'Bug Fix',    className: 'bg-red-900 text-red-200 border-red-700' },
  test:       { label: 'Test',       className: 'bg-green-900 text-green-200 border-green-700' },
  config:     { label: 'Config',     className: 'bg-zinc-700 text-zinc-200 border-zinc-600' },
  docs:       { label: 'Docs',       className: 'bg-zinc-700 text-zinc-200 border-zinc-600' },
};

export function OverviewSlide({ review, onNavigate }: Props) {
  return (
    <div className="flex-1 overflow-y-auto p-8 max-w-3xl mx-auto w-full flex flex-col gap-8">
      {/* AI Summary */}
      <div className="flex flex-col gap-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">AI Summary</p>
        <p className="text-base leading-relaxed"><InlineCode text={review.summary} /></p>
      </div>

      {/* PR Description */}
      {review.prDescription && (
        <div className="flex flex-col gap-2">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">PR Description</p>
          <pre className="text-sm text-muted-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-48 overflow-y-auto rounded-md border bg-muted/30 p-4">
            {review.prDescription}
          </pre>
        </div>
      )}

      {/* Table of contents */}
      <div className="flex flex-col gap-3">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">Table of Contents</p>
        <Card>
          <CardContent className="p-0">
            <ol className="divide-y">
              {review.slides.map((slide) => {
                const typeConfig = slideTypeConfig[slide.slideType] ?? slideTypeConfig.feature;
                return (
                  <li key={slide.id}>
                    <button
                      onClick={() => onNavigate(slide.slideNumber)}
                      className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm text-muted-foreground w-6 shrink-0 text-right">
                        {slide.slideNumber}
                      </span>
                      <Badge variant="outline" className={`shrink-0 text-xs ${typeConfig.className}`}>
                        {typeConfig.label}
                      </Badge>
                      <span className="flex-1 text-sm font-medium truncate">{slide.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {slide.affectedFiles.length} {slide.affectedFiles.length === 1 ? 'file' : 'files'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
