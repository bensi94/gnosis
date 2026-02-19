import { contextBridge, ipcRenderer } from 'electron';
import type { GenerateReviewRequest, ReviewGuide, ReviewHistoryEntry } from '../lib/types';

contextBridge.exposeInMainWorld('electronAPI', {
  generateReview: (req: GenerateReviewRequest): Promise<ReviewGuide> =>
    ipcRenderer.invoke('generate-review', req),
  getConfig: (): Promise<{ githubToken: string | null }> =>
    ipcRenderer.invoke('get-config'),
  startOAuth: (): Promise<void> =>
    ipcRenderer.invoke('start-oauth'),
  getAuthState: (): Promise<{ authenticated: boolean; login: string | null }> =>
    ipcRenderer.invoke('get-auth-state'),
  signOut: (): Promise<void> =>
    ipcRenderer.invoke('sign-out'),
  listReviews: (): Promise<ReviewHistoryEntry[]> =>
    ipcRenderer.invoke('list-reviews'),
  loadReview: (id: string): Promise<ReviewGuide> =>
    ipcRenderer.invoke('load-review', id),
  deleteReview: (id: string): Promise<void> =>
    ipcRenderer.invoke('delete-review', id),
});
