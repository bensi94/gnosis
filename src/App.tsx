import { useState } from 'react';
import { TooltipProvider } from '../components/ui/tooltip';
import { HomePage } from './pages/HomePage';
import { ReviewPage } from './pages/ReviewPage';
import type { ReviewGuide } from '../lib/types';

type Page = 'home' | 'review';

export function App() {
  const [page, setPage] = useState<Page>('home');
  const [review, setReview] = useState<ReviewGuide | null>(null);

  function handleReviewReady(r: ReviewGuide) {
    setReview(r);
    setPage('review');
  }

  function handleBack() {
    setReview(null);
    setPage('home');
  }

  return (
    <TooltipProvider>
      {page === 'home' && <HomePage onReviewReady={handleReviewReady} />}
      {page === 'review' && review && <ReviewPage review={review} onBack={handleBack} />}
    </TooltipProvider>
  );
}
