import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import fs from 'fs';
import { Octokit } from '@octokit/rest';
import {
  parsePrUrl,
  getPrMetadata,
  getPrDiff,
  getChangedFiles,
  getFileContent,
  getNeighborFiles,
} from '../lib/github';
import { buildContextPackage } from '../lib/context-builder';
import { generateReviewGuide } from '../lib/agent';
import { renderDiffHunk, inferLanguage } from '../lib/highlight';
import type { GenerateReviewRequest, ReviewGuide, ReviewHistoryEntry } from '../lib/types';

// Injected by Electron Forge Vite plugin
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.webContents.on('did-fail-load', (_event, errorCode, errorDescription) => {
    console.error('[main] Renderer failed to load:', errorCode, errorDescription);
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── Config helpers ──────────────────────────────────────────────

function getConfigPath() {
  return path.join(app.getPath('userData'), 'config.json');
}

function readConfig(): { githubToken: string | null } {
  if (process.env.GITHUB_TOKEN) {
    return { githubToken: process.env.GITHUB_TOKEN };
  }
  try {
    const raw = fs.readFileSync(getConfigPath(), 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { githubToken: null };
  }
}

function writeConfig(config: { githubToken: string | null }) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(config, null, 2), 'utf-8');
}

// ── Review history helpers ───────────────────────────────────────

function getReviewsDir() {
  return path.join(app.getPath('userData'), 'reviews');
}

function getReviewsIndexPath() {
  return path.join(app.getPath('userData'), 'reviews-index.json');
}

function ensureReviewsDir() {
  const dir = getReviewsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readReviewsIndex(): ReviewHistoryEntry[] {
  try {
    return JSON.parse(fs.readFileSync(getReviewsIndexPath(), 'utf-8'));
  } catch {
    return [];
  }
}

function saveReviewToHistory(review: ReviewGuide): void {
  ensureReviewsDir();
  const id = Date.now().toString();
  const savedAt = new Date().toISOString();

  fs.writeFileSync(
    path.join(getReviewsDir(), `${id}.json`),
    JSON.stringify(review),
  );

  const entry: ReviewHistoryEntry = {
    id,
    prTitle: review.prTitle,
    prUrl: review.prUrl,
    author: review.author,
    riskLevel: review.riskLevel,
    savedAt,
  };

  const index = readReviewsIndex();
  index.unshift(entry); // newest first
  fs.writeFileSync(getReviewsIndexPath(), JSON.stringify(index, null, 2));
}

// ── IPC handlers ────────────────────────────────────────────────

ipcMain.handle('get-config', async () => {
  return readConfig();
});

ipcMain.handle('save-config', async (_event, config: { githubToken: string | null }) => {
  writeConfig(config);
});

ipcMain.handle('list-reviews', async () => {
  return readReviewsIndex();
});

ipcMain.handle('load-review', async (_event, id: string) => {
  const filePath = path.join(getReviewsDir(), `${id}.json`);
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as ReviewGuide;
});

ipcMain.handle('delete-review', async (_event, id: string) => {
  const filePath = path.join(getReviewsDir(), `${id}.json`);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  const index = readReviewsIndex().filter((e) => e.id !== id);
  fs.writeFileSync(getReviewsIndexPath(), JSON.stringify(index, null, 2));
});

ipcMain.handle('generate-review', async (_event, { prUrl, model, instructions }: GenerateReviewRequest) => {
  const config = readConfig();
  const octokit = new Octokit({ auth: config.githubToken ?? undefined });

  const { owner, repo, pullNumber } = parsePrUrl(prUrl);

  const [prData, diff, changedFiles] = await Promise.all([
    getPrMetadata(octokit, owner, repo, pullNumber),
    getPrDiff(octokit, owner, repo, pullNumber),
    getChangedFiles(octokit, owner, repo, pullNumber),
  ]);

  if (changedFiles.length === 0) {
    throw new Error('PR has no changed files');
  }

  const baseRef = prData.baseBranch;
  const headRef = prData.headSha;

  const fileContents: Record<string, string> = {};
  const headFileContents: Record<string, string> = {};
  const concurrency = 5;
  const filesToFetch = changedFiles.filter((f) => f.status !== 'deleted');
  const filesToFetchBase = changedFiles.filter((f) => f.status !== 'added');

  for (let i = 0; i < Math.max(filesToFetch.length, filesToFetchBase.length); i += concurrency) {
    const headBatch = filesToFetch.slice(i, i + concurrency);
    const baseBatch = filesToFetchBase.slice(i, i + concurrency);
    await Promise.all([
      ...headBatch.map(async (f) => {
        const content = await getFileContent(octokit, owner, repo, f.filename, headRef);
        if (content !== null) headFileContents[f.filename] = content;
      }),
      ...baseBatch.map(async (f) => {
        const content = await getFileContent(octokit, owner, repo, f.filename, baseRef);
        if (content !== null) fileContents[f.filename] = content;
      }),
    ]);
  }

  const neighborFiles = await getNeighborFiles(
    octokit,
    owner,
    repo,
    changedFiles.map((f) => f.filename),
    fileContents,
    baseRef,
  );

  const contextPackage = buildContextPackage(
    prData,
    diff,
    changedFiles,
    fileContents,
    headFileContents,
    neighborFiles,
  );

  console.log('[main] Generating review guide...');
  const reviewGuide = await generateReviewGuide(contextPackage, prUrl, model, instructions);

  reviewGuide.prTitle = reviewGuide.prTitle || prData.title;
  reviewGuide.prDescription = reviewGuide.prDescription || prData.description;
  reviewGuide.author = reviewGuide.author || prData.author;
  reviewGuide.prUrl = prUrl;
  reviewGuide.totalFilesChanged = changedFiles.length;
  reviewGuide.totalLinesChanged = changedFiles.reduce(
    (sum, f) => sum + f.additions + f.deletions,
    0,
  );

  for (const slide of reviewGuide.slides) {
    for (const hunk of slide.diffHunks) {
      if (!hunk.language) {
        hunk.language = inferLanguage(hunk.filePath);
      }
      try {
        hunk.renderedHtml = await renderDiffHunk(hunk.content, hunk.language);
      } catch (err) {
        console.warn(`[main] Failed to render hunk for ${hunk.filePath}:`, err);
        hunk.renderedHtml = `<pre class="diff-block">${hunk.content}</pre>`;
      }
    }
  }

  saveReviewToHistory(reviewGuide);
  return reviewGuide;
});
