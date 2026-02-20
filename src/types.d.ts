import type {
  GenerateReviewRequest,
  Preferences,
  PrSearchResult,
  PrStatus,
  ReviewGuide,
  ReviewHistoryEntry,
  SubmitReviewRequest,
  FreshnessResult,
} from '../lib/types';

declare global {
  interface Window {
    electronAPI: {
      generateReview: (req: GenerateReviewRequest) => Promise<ReviewGuide>;
      getConfig: () => Promise<{ githubToken: string | null }>;
      startOAuth: () => Promise<void>;
      getAuthState: () => Promise<{ authenticated: boolean; login: string | null }>;
      signOut: () => Promise<void>;
      listReviews: () => Promise<ReviewHistoryEntry[]>;
      loadReview: (id: string) => Promise<ReviewGuide>;
      deleteReview: (id: string) => Promise<void>;
      onReviewProgress: (callback: (chunk: string, isThinking: boolean) => void) => void;
      offReviewProgress: () => void;
      submitReview: (req: SubmitReviewRequest) => Promise<{ reviewUrl: string; droppedCommentCount: number }>;
      checkPrFreshness: (prUrl: string, headSha: string | undefined) => Promise<FreshnessResult>;
      loadPreferences: () => Promise<Preferences>;
      savePreferences: (prefs: Preferences) => Promise<void>;
      searchPullRequests: () => Promise<PrSearchResult[]>;
      reRenderHunks: (review: ReviewGuide) => Promise<ReviewGuide>;
      getPrStatus: (prUrl: string) => Promise<PrStatus>;
    };
  }
}

export {};
