import { contextBridge, ipcRenderer } from 'electron';
import type { GenerateReviewRequest, ReviewGuide, ReviewHistoryEntry } from '../lib/types';

contextBridge.exposeInMainWorld('electronAPI', {
  generateReview: (req: GenerateReviewRequest): Promise<ReviewGuide> =>
    ipcRenderer.invoke('generate-review', req),
  getConfig: (): Promise<{ githubToken: string | null }> =>
    ipcRenderer.invoke('get-config'),
  saveConfig: (cfg: { githubToken: string | null }): Promise<void> =>
    ipcRenderer.invoke('save-config', cfg),
  listReviews: (): Promise<ReviewHistoryEntry[]> =>
    ipcRenderer.invoke('list-reviews'),
  loadReview: (id: string): Promise<ReviewGuide> =>
    ipcRenderer.invoke('load-review', id),
  deleteReview: (id: string): Promise<void> =>
    ipcRenderer.invoke('delete-review', id),
});
