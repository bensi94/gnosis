'use client';

import { MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface Props {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  commentCount?: number;
  onSubmitReview?: () => void;
}

export function SlideNav({ current, total, onPrev, onNext, commentCount = 0, onSubmitReview }: Props) {
  const isOverview = current === 0;
  const progress = isOverview ? 0 : total > 1 ? ((current - 1) / (total - 1)) * 100 : 100;

  return (
    <div className="border-t">
      <Progress value={progress} className="h-0.5 rounded-none" />
      <div className="flex items-center justify-between px-6 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="outline" onClick={onPrev} disabled={isOverview} size="sm">
              ← Prev
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous slide (←)</TooltipContent>
        </Tooltip>

        <span className="text-sm text-muted-foreground">
          {isOverview ? 'Overview' : `Slide ${current} of ${total}`}
        </span>

        <div className="flex items-center gap-2">
          {onSubmitReview && (
            <Button variant="outline" size="sm" onClick={onSubmitReview} className="gap-1.5">
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Submit review
              {commentCount > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 min-w-[20px] px-1.5 text-xs">
                  {commentCount}
                </Badge>
              )}
            </Button>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" onClick={onNext} disabled={current >= total} size="sm">
                Next →
              </Button>
            </TooltipTrigger>
            <TooltipContent>Next slide (→)</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </div>
  );
}
