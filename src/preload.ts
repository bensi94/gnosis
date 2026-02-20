import { contextBridge, ipcRenderer } from 'electron';
import type {
  GenerateReviewRequest,
  Preferences,
  PrSearchResult,
  ReviewGuide,
  ReviewHistoryEntry,
  SubmitReviewRequest,
  FreshnessResult,
} from '../lib/types';

contextBridge.exposeInMainWorld('electronAPI', {
  generateReview: (req: GenerateReviewRequest): Promise<ReviewGuide> => ipcRenderer.invoke('generate-review', req),
  getConfig: (): Promise<{ githubToken: string | null }> => ipcRenderer.invoke('get-config'),
  startOAuth: (): Promise<void> => ipcRenderer.invoke('start-oauth'),
  getAuthState: (): Promise<{ authenticated: boolean; login: string | null }> => ipcRenderer.invoke('get-auth-state'),
  signOut: (): Promise<void> => ipcRenderer.invoke('sign-out'),
  listReviews: (): Promise<ReviewHistoryEntry[]> => ipcRenderer.invoke('list-reviews'),
  loadReview: (id: string): Promise<ReviewGuide> => ipcRenderer.invoke('load-review', id),
  deleteReview: (id: string): Promise<void> => ipcRenderer.invoke('delete-review', id),
  onReviewProgress: (callback: (chunk: string, isThinking: boolean) => void): void => {
    ipcRenderer.on('review-progress', (_event, { chunk, isThinking }: { chunk: string; isThinking: boolean }) =>
      callback(chunk, isThinking)
    );
  },
  offReviewProgress: (): void => {
    ipcRenderer.removeAllListeners('review-progress');
  },
  submitReview: (req: SubmitReviewRequest): Promise<{ reviewUrl: string; droppedCommentCount: number }> =>
    ipcRenderer.invoke('submit-review', req),
  checkPrFreshness: (prUrl: string, headSha: string | undefined): Promise<FreshnessResult> =>
    ipcRenderer.invoke('check-pr-freshness', prUrl, headSha),
  loadPreferences: (): Promise<Preferences> => ipcRenderer.invoke('load-preferences'),
  savePreferences: (prefs: Preferences): Promise<void> => ipcRenderer.invoke('save-preferences', prefs),
  searchPullRequests: (): Promise<PrSearchResult[]> => ipcRenderer.invoke('search-pull-requests'),
});
