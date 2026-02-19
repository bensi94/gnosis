import { Octokit } from '@octokit/rest';
import type { ChangedFile, PrMetadata } from './types';

export function parsePrUrl(url: string): { owner: string; repo: string; pullNumber: number } {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)\/pulls?\/(\d+)/);
  if (!match) {
    throw new Error(`Invalid GitHub PR URL: ${url}`);
  }
  return {
    owner: match[1],
    repo: match[2],
    pullNumber: parseInt(match[3], 10),
  };
}

export async function getPrMetadata(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<PrMetadata> {
  const { data } = await octokit.pulls.get({ owner, repo, pull_number: pullNumber });
  return {
    title: data.title,
    description: data.body ?? '',
    author: data.user?.login ?? 'unknown',
    baseBranch: data.base.ref,
    headBranch: data.head.ref,
    headSha: data.head.sha,
    merged: data.merged ?? false,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    url: data.html_url,
  };
}

export async function getPrDiff(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<string> {
  const response = await octokit.request('GET /repos/{owner}/{repo}/pulls/{pull_number}', {
    owner,
    repo,
    pull_number: pullNumber,
    headers: {
      accept: 'application/vnd.github.v3.diff',
    },
  });
  return response.data as unknown as string;
}

export async function getChangedFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  pullNumber: number
): Promise<ChangedFile[]> {
  const files: ChangedFile[] = [];
  let page = 1;
  while (true) {
    const { data } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number: pullNumber,
      per_page: 100,
      page,
    });
    for (const f of data) {
      files.push({
        filename: f.filename,
        status: f.status as ChangedFile['status'],
        additions: f.additions,
        deletions: f.deletions,
        previous_filename: f.previous_filename,
      });
    }
    if (data.length < 100) break;
    page++;
  }
  return files;
}

export async function getFileContent(
  octokit: Octokit,
  owner: string,
  repo: string,
  path: string,
  ref: string
): Promise<string | null> {
  try {
    const { data } = await octokit.repos.getContent({ owner, repo, path, ref });
    if (Array.isArray(data) || data.type !== 'file') return null;
    if ('content' in data && data.content) {
      return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    return null;
  } catch {
    return null;
  }
}

function extractImports(content: string, filePath: string): string[] {
  const imports: string[] = [];
  const dir = filePath.split('/').slice(0, -1).join('/');

  // Match ES import statements
  const importRegex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    if (importPath.startsWith('.')) {
      // Relative import — resolve to a file path
      const resolved = resolveRelativePath(dir, importPath);
      if (resolved) imports.push(resolved);
    }
  }

  return imports;
}

function resolveRelativePath(dir: string, importPath: string): string | null {
  const parts = (dir ? dir + '/' + importPath : importPath).split('/');
  const normalized: string[] = [];
  for (const part of parts) {
    if (part === '..') normalized.pop();
    else if (part !== '.') normalized.push(part);
  }
  const base = normalized.join('/');
  // Return without extension — caller will try common extensions
  return base;
}

const TS_EXTENSIONS = ['', '.ts', '.tsx', '.js', '.jsx', '/index.ts', '/index.tsx', '/index.js'];

export async function getNeighborFiles(
  octokit: Octokit,
  owner: string,
  repo: string,
  changedFilePaths: string[],
  changedFileContents: Record<string, string>,
  ref: string
): Promise<Record<string, string>> {
  const neighborPaths = new Set<string>();

  for (const filePath of changedFilePaths) {
    const content = changedFileContents[filePath];
    if (!content) continue;

    const imports = extractImports(content, filePath);
    for (const imp of imports) {
      // Don't include files already in the changed set
      const alreadyChanged = changedFilePaths.some(
        (p) => p === imp || TS_EXTENSIONS.some((ext) => p === imp + ext)
      );
      if (!alreadyChanged) {
        neighborPaths.add(imp);
      }
    }
  }

  const results: Record<string, string> = {};
  const pathsToFetch = Array.from(neighborPaths).slice(0, 30);

  // Concurrency limit: 5 parallel requests
  const concurrency = 5;
  for (let i = 0; i < pathsToFetch.length; i += concurrency) {
    const batch = pathsToFetch.slice(i, i + concurrency);
    await Promise.all(
      batch.map(async (basePath) => {
        // Try each extension
        for (const ext of TS_EXTENSIONS) {
          const fullPath = basePath + ext;
          const content = await getFileContent(octokit, owner, repo, fullPath, ref);
          if (content !== null) {
            results[fullPath] = content;
            break;
          }
        }
      })
    );
  }

  return results;
}
