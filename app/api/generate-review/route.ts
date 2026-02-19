import { NextRequest, NextResponse } from 'next/server';
import { Octokit } from '@octokit/rest';
import { parsePrUrl, getPrMetadata, getPrDiff, getChangedFiles, getFileContent, getNeighborFiles } from '@/lib/github';
import { buildContextPackage } from '@/lib/context-builder';
import { generateReviewGuide } from '@/lib/agent';
import { renderDiffHunk, inferLanguage } from '@/lib/highlight';
import type { GenerateReviewRequest } from '@/lib/types';

export const maxDuration = 300; // 5 minutes

function isValidGithubPrUrl(url: string): boolean {
  return /^https?:\/\/github\.com\/[^/]+\/[^/]+\/pulls?\/\d+/.test(url);
}

export async function POST(req: NextRequest) {
  let body: GenerateReviewRequest;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { prUrl, model = 'opus', instructions } = body;

  if (!prUrl || !isValidGithubPrUrl(prUrl)) {
    return NextResponse.json(
      { error: 'Invalid or missing GitHub PR URL. Expected format: https://github.com/owner/repo/pull/N' },
      { status: 400 }
    );
  }

  const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

  let owner: string, repo: string, pullNumber: number;
  try {
    ({ owner, repo, pullNumber } = parsePrUrl(prUrl));
  } catch {
    return NextResponse.json({ error: 'Could not parse GitHub PR URL' }, { status: 400 });
  }

  try {
    // Fetch PR metadata, diff, and changed files in parallel
    const [prData, diff, changedFiles] = await Promise.all([
      getPrMetadata(octokit, owner, repo, pullNumber),
      getPrDiff(octokit, owner, repo, pullNumber),
      getChangedFiles(octokit, owner, repo, pullNumber),
    ]);

    if (changedFiles.length === 0) {
      return NextResponse.json({ error: 'PR has no changed files' }, { status: 422 });
    }

    const baseRef = prData.baseBranch;
    const headRef = prData.headSha;

    // Fetch file contents at base and head refs in parallel
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

    // Fetch neighbor files
    const neighborFiles = await getNeighborFiles(
      octokit, owner, repo,
      changedFiles.map((f) => f.filename),
      fileContents,
      baseRef
    );

    // Build context package
    const contextPackage = buildContextPackage(prData, diff, changedFiles, fileContents, headFileContents, neighborFiles);

    // Generate review with AI
    console.log('[api] Generating review guide...');
    const reviewGuide = await generateReviewGuide(contextPackage, prUrl, model, instructions);

    // Fill in metadata that the agent might not have accurate values for
    reviewGuide.prTitle = reviewGuide.prTitle || prData.title;
    reviewGuide.prDescription = reviewGuide.prDescription || prData.description;
    reviewGuide.author = reviewGuide.author || prData.author;
    reviewGuide.prUrl = prUrl;
    reviewGuide.totalFilesChanged = changedFiles.length;
    reviewGuide.totalLinesChanged = changedFiles.reduce(
      (sum, f) => sum + f.additions + f.deletions, 0
    );

    // Populate renderedHtml for every diff hunk
    for (const slide of reviewGuide.slides) {
      for (const hunk of slide.diffHunks) {
        if (!hunk.language) {
          hunk.language = inferLanguage(hunk.filePath);
        }
        try {
          hunk.renderedHtml = await renderDiffHunk(hunk.content, hunk.language);
        } catch (err) {
          console.warn(`[api] Failed to render hunk for ${hunk.filePath}:`, err);
          hunk.renderedHtml = `<pre class="diff-block">${hunk.content}</pre>`;
        }
      }
    }

    return NextResponse.json({ review: reviewGuide });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status =
      message.includes('Not Found') || message.includes('404') ? 404 :
      message.includes('Bad credentials') || message.includes('401') ? 401 :
      500;

    console.error('[api] Error:', message);
    return NextResponse.json({ error: message }, { status });
  }
}
