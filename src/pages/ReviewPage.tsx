import { useState, useCallback, useEffect } from 'react';
import { PRSummaryBanner } from '../../components/PRSummaryBanner';
import { OverviewSlide } from '../../components/OverviewSlide';
import { SlideView } from '../../components/SlideView';
import { SlideNav } from '../../components/SlideNav';
import type { ReviewGuide } from '../../lib/types';

interface Props {
  review: ReviewGuide;
  onBack: () => void;
}

export function ReviewPage({ review, onBack }: Props) {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handlePrev = useCallback(() => {
    setCurrentSlide((n) => Math.max(0, n - 1));
  }, []);

  const handleNext = useCallback(() => {
    setCurrentSlide((n) => Math.min(review.slides.length, n + 1));
  }, [review.slides.length]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  if (review.slides.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">No slides were generated for this PR.</p>
          <button
            onClick={onBack}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            ← Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <PRSummaryBanner review={review} />

      {currentSlide === 0 ? (
        <OverviewSlide review={review} onNavigate={(n) => setCurrentSlide(n)} />
      ) : (
        <SlideView
          slide={review.slides[currentSlide - 1]}
          slideNumber={currentSlide}
          totalSlides={review.slides.length}
        />
      )}

      <SlideNav
        current={currentSlide}
        total={review.slides.length}
        onPrev={handlePrev}
        onNext={handleNext}
      />

      <div className="absolute top-4 left-4">
        <button
          onClick={onBack}
          className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
        >
          ← New review
        </button>
      </div>
    </div>
  );
}
