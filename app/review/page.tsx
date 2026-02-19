'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PRSummaryBanner } from '@/components/PRSummaryBanner';
import { OverviewSlide } from '@/components/OverviewSlide';
import { SlideView } from '@/components/SlideView';
import { SlideNav } from '@/components/SlideNav';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { ReviewGuide } from '@/lib/types';

export default function ReviewPage() {
  const router = useRouter();
  const [review, setReview] = useState<ReviewGuide | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('pr-review-data');
      if (!raw) {
        setError('No review data found. Please generate a review from the home page.');
        return;
      }
      const parsed: ReviewGuide = JSON.parse(raw);
      setReview(parsed);
    } catch {
      setError('Failed to load review data. Please try again.');
    }
  }, []);

  const handlePrev = useCallback(() => {
    setCurrentSlide((n) => Math.max(0, n - 1));
  }, []);

  const handleNext = useCallback(() => {
    if (!review) return;
    setCurrentSlide((n) => Math.min(review.slides.length, n + 1));
  }, [review]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') handlePrev();
      if (e.key === 'ArrowRight') handleNext();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handlePrev, handleNext]);

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <div className="w-full max-w-md flex flex-col gap-4">
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            ← Back to home
          </button>
        </div>
      </main>
    );
  }

  if (!review) {
    return <LoadingScreen message="Loading review..." />;
  }

  if (review.slides.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center p-8">
        <p className="text-muted-foreground">No slides were generated for this PR.</p>
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
    </div>
  );
}
