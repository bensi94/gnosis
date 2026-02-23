import { useState } from 'react';
import {
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  FileText,
  CheckCircle2,
  XCircle,
  Loader2,
  CircleDot,
  GitMerge,
  GitPullRequestDraft,
  AlertTriangle,
  Tag,
  GitBranch,
  Hash,
  Users,
  Zap,
  Milestone,
  Globe,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Markdown } from '@/components/Markdown';
import { slideTypeConfig, riskConfig } from '@/lib/constants';
import type { PrStatus, ReviewGuide } from '@/lib/types';

interface Props {
  review: ReviewGuide;
  prStatus: PrStatus | null;
  onNavigate: (slideNumber: number) => void;
}

function SkeletonPill({ width }: { width: string }) {
  return <div className="statusPill-skeleton animate-pulse rounded-full" style={{ width, height: 22 }} />;
}

function StatusBarSkeleton() {
  return (
    <div className="max-w-6xl mx-auto w-full mb-4 flex flex-wrap items-center gap-2">
      <SkeletonPill width="5.5rem" />
      <SkeletonPill width="6rem" />
      <SkeletonPill width="6.5rem" />
      <SkeletonPill width="5rem" />
      <SkeletonPill width="4rem" />
    </div>
  );
}

function StatusBar({ status }: { status: PrStatus | null }) {
  if (!status) return <StatusBarSkeleton />;
  const {
    ciConclusion,
    ciChecks,
    reviewSummary,
    isDraft,
    labels,
    baseBranch,
    commitCount,
    requestedReviewers,
    requestedTeams,
    mergeableState,
    autoMerge,
    milestone,
  } = status;

  const failCount = ciChecks.filter(
    (c) => c.conclusion === 'failure' || c.conclusion === 'timed_out' || c.conclusion === 'cancelled'
  ).length;

  return (
    <div className="animate-fade-in-up max-w-6xl mx-auto w-full mb-4 flex flex-wrap items-center gap-2">
      {/* Draft indicator */}
      {isDraft && (
        <span className="statusPill-neutral flex items-center gap-1.5">
          <GitPullRequestDraft className="h-3 w-3" />
          Draft
        </span>
      )}

      {/* CI status */}
      {ciConclusion === 'success' && (
        <span className="statusPill-green flex items-center gap-1.5">
          <CheckCircle2 className="h-3 w-3" />
          CI passing
        </span>
      )}
      {ciConclusion === 'failure' && (
        <span className="statusPill-red flex items-center gap-1.5">
          <XCircle className="h-3 w-3" />
          CI failing{failCount > 0 ? ` (${failCount})` : ''}
        </span>
      )}
      {ciConclusion === 'pending' && (
        <span className="statusPill-amber flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          CI pending
        </span>
      )}
      {ciConclusion === 'neutral' && ciChecks.length === 0 && (
        <span className="statusPill-neutral flex items-center gap-1.5">
          <CircleDot className="h-3 w-3" />
          No CI checks
        </span>
      )}

      {/* Review status */}
      {(reviewSummary.approved > 0 || reviewSummary.changesRequested > 0) && (
        <>
          {reviewSummary.approved > 0 && (
            <span className="statusPill-green flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3" />
              {reviewSummary.approved} approved
            </span>
          )}
          {reviewSummary.changesRequested > 0 && (
            <span className="statusPill-red flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3" />
              {reviewSummary.changesRequested} changes requested
            </span>
          )}
        </>
      )}
      {reviewSummary.approved === 0 && reviewSummary.changesRequested === 0 && (
        <span className="statusPill-neutral flex items-center gap-1.5">
          <CircleDot className="h-3 w-3" />
          No reviews
        </span>
      )}

      {/* Commit count */}
      <span className="statusPill-neutral flex items-center gap-1.5">
        <Hash className="h-3 w-3" />
        {commitCount} {commitCount === 1 ? 'commit' : 'commits'}
      </span>

      {/* Requested reviewers */}
      {requestedReviewers.length + requestedTeams.length > 0 && (
        <span className="statusPill-amber flex items-center gap-1.5">
          <Users className="h-3 w-3" />
          Awaiting: {[...requestedReviewers, ...requestedTeams].join(', ')}
        </span>
      )}

      {/* Mergeable state */}
      {mergeableState === 'clean' && (
        <span className="statusPill-green flex items-center gap-1.5">
          <GitMerge className="h-3 w-3" />
          Merge-ready
        </span>
      )}
      {mergeableState === 'behind' && (
        <span className="statusPill-amber flex items-center gap-1.5">
          <GitMerge className="h-3 w-3" />
          Behind base
        </span>
      )}
      {mergeableState === 'dirty' && (
        <span className="statusPill-red flex items-center gap-1.5">
          <GitMerge className="h-3 w-3" />
          Has conflicts
        </span>
      )}
      {mergeableState === 'blocked' && (
        <span className="statusPill-red flex items-center gap-1.5">
          <GitMerge className="h-3 w-3" />
          Merge blocked
        </span>
      )}
      {mergeableState === 'unstable' && (
        <span className="statusPill-amber flex items-center gap-1.5">
          <GitMerge className="h-3 w-3" />
          Unstable
        </span>
      )}

      {/* Auto-merge */}
      {autoMerge && (
        <span className="statusPill-green flex items-center gap-1.5">
          <Zap className="h-3 w-3" />
          Auto-merge ({autoMerge.method})
        </span>
      )}

      {/* Milestone */}
      {milestone && (
        <span
          className="statusPill-neutral flex items-center gap-1.5"
          title={milestone.dueOn ? `Due: ${new Date(milestone.dueOn).toLocaleDateString()}` : undefined}
        >
          <Milestone className="h-3 w-3" />
          {milestone.title}
        </span>
      )}

      {/* Labels */}
      {labels.length > 0 && (
        <>
          {labels.map((label) => (
            <span key={label} className="statusPill-label flex items-center gap-1.5">
              <Tag className="h-3 w-3" />
              {label}
            </span>
          ))}
        </>
      )}

      {/* Base branch */}
      <span className="statusPill-neutral flex items-center gap-1.5">
        <GitBranch className="h-3 w-3" />
        {baseBranch}
      </span>
    </div>
  );
}

export function OverviewSlide({ review, prStatus, onNavigate }: Props) {
  const risk = riskConfig[review.riskLevel];
  const [descOpen, setDescOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-8">
      <StatusBar status={prStatus} />
      <div className="max-w-6xl mx-auto w-full grid grid-cols-[2fr_3fr] gap-6 items-start">
        {/* Left column — context */}
        <div className="flex flex-col gap-5 sticky top-0">
          {/* Summary */}
          <section className="animate-fade-in-up flex flex-col gap-2">
            <p className="text-xs uppercase tracking-wider text-muted-foreground">Summary</p>
            <Markdown className="text-[15px] leading-7">{review.summary}</Markdown>
            {(review.neighborFileCount ?? 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                {review.neighborFileCount} additional {review.neighborFileCount === 1 ? 'file' : 'files'} included for
                context
              </p>
            )}
          </section>

          {/* Risk — inline */}
          <section className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: '60ms' }}>
            <p className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" />
              Risk Assessment
            </p>
            <div className="rounded-md border bg-muted/20 px-4 py-3 flex gap-3 items-start">
              <Badge variant={risk.variant} className="shrink-0 mt-0.5">
                {risk.label}
              </Badge>
              <Markdown className="text-sm text-muted-foreground leading-relaxed">{review.riskRationale}</Markdown>
            </div>
          </section>

          {/* PR Description — collapsible */}
          {review.prDescription && (
            <section className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: '120ms' }}>
              <button
                onClick={() => setDescOpen((v) => !v)}
                className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <FileText className="h-3 w-3" />
                PR Description
                {descOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
              {descOpen && (
                <div className="text-sm text-muted-foreground leading-relaxed max-h-48 overflow-y-auto rounded-md border bg-muted/20 px-4 py-3">
                  <Markdown>{review.prDescription}</Markdown>
                </div>
              )}
            </section>
          )}

          {/* Web Sources — collapsible */}
          {review.webSources && review.webSources.length > 0 && (
            <section className="animate-fade-in-up flex flex-col gap-2" style={{ animationDelay: '180ms' }}>
              <button
                onClick={() => setSourcesOpen((v) => !v)}
                className="text-xs uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 hover:text-foreground transition-colors"
              >
                <Globe className="h-3 w-3" />
                Web Sources ({review.webSources.length})
                {sourcesOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </button>
              {sourcesOpen && (
                <ul className="flex flex-col gap-1.5 rounded-md border bg-muted/20 px-4 py-3">
                  {review.webSources.map((source, i) => (
                    <li key={i}>
                      <button
                        onClick={() => window.electronAPI.openExternal(source.url)}
                        className="text-sm text-primary hover:underline truncate max-w-full text-left"
                        title={source.url}
                      >
                        {source.title || source.url}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* Right column — slides navigation */}
        <section className="flex flex-col gap-3">
          <p
            className="animate-fade-in-up text-xs uppercase tracking-wider text-muted-foreground"
            style={{ animationDelay: '80ms' }}
          >
            Slides
          </p>
          <Card>
            <CardContent className="p-0">
              <ol className="divide-y">
                {review.slides.map((slide, index) => {
                  const typeConfig = slideTypeConfig[slide.slideType];
                  const Icon = typeConfig.icon;
                  return (
                    <li key={slide.id}>
                      <button
                        onClick={() => onNavigate(slide.slideNumber)}
                        className="animate-fade-in-up w-full flex items-center gap-4 px-4 py-3.5 text-left hover:bg-muted/50 transition-colors"
                        style={{ animationDelay: `${120 + index * 50}ms` }}
                      >
                        <span className="text-sm text-muted-foreground w-6 shrink-0 text-right">
                          {slide.slideNumber}
                        </span>
                        <Badge variant="outline" className={`shrink-0 text-xs gap-1 ${typeConfig.className}`}>
                          <Icon className="h-3 w-3" />
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
        </section>
      </div>
    </div>
  );
}
