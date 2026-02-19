'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface Props {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function SlideNav({ current, total, onPrev, onNext }: Props) {
  const isOverview = current === 0;
  const progress = isOverview ? 0 : total > 1 ? ((current - 1) / (total - 1)) * 100 : 100;

  return (
    <div className="border-t">
      <Progress value={progress} className="h-0.5 rounded-none" />
      <div className="flex items-center justify-between px-6 py-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={onPrev}
              disabled={isOverview}
              size="sm"
            >
              ← Prev
            </Button>
          </TooltipTrigger>
          <TooltipContent>Previous slide (←)</TooltipContent>
        </Tooltip>

        <span className="text-sm text-muted-foreground">
          {isOverview ? 'Overview' : `Slide ${current} of ${total}`}
        </span>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={onNext}
              disabled={current >= total}
              size="sm"
            >
              Next →
            </Button>
          </TooltipTrigger>
          <TooltipContent>Next slide (→)</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
