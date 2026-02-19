import type { GenerateReviewRequest, ReviewGuide, ReviewHistoryEntry } from '../lib/types';

declare global {
  interface Window {
    electronAPI: {
      generateReview: (req: GenerateReviewRequest) => Promise<ReviewGuide>;
      getConfig: () => Promise<{ githubToken: string | null }>;
      saveConfig: (cfg: { githubToken: string | null }) => Promise<void>;
      listReviews: () => Promise<ReviewHistoryEntry[]>;
      loadReview: (id: string) => Promise<ReviewGuide>;
      deleteReview: (id: string) => Promise<void>;
    };
  }
}

export {};
