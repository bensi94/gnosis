import type { PrMetadata, ChangedFile } from './types';

const CHARS_PER_TOKEN = 4;
const MAX_TOKENS = 180_000;
const MAX_CHARS = MAX_TOKENS * CHARS_PER_TOKEN;
const MAX_FILE_LINES = 200;
const DIFF_CONTEXT_LINES = 10;

function truncateFileContent(content: string, maxLines: number): string {
  const lines = content.split('\n');
  if (lines.length <= maxLines) return content;
  return lines.slice(0, maxLines).join('\n') + `\n... [truncated after ${maxLines} lines]`;
}

/**
 * Expands the context lines around each hunk in a unified diff from the
 * GitHub default (3 lines) up to `targetContext` lines, using the base-ref
 * file contents that we already have in memory.
 */
function expandDiffContext(
  diff: string,
  fileContents: Record<string, string>,
  targetContext = DIFF_CONTEXT_LINES,
): string {
  const result: string[] = [];
  let currentBasePath: string | null = null;
  const lines = diff.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith('--- a/')) {
      currentBasePath = line.slice('--- a/'.length);
      result.push(line);
      i++;
      continue;
    }

    if (line.startsWith('--- /dev/null')) {
      currentBasePath = null; // new file — no base content to expand from
      result.push(line);
      i++;
      continue;
    }

    if (!line.startsWith('@@ ')) {
      result.push(line);
      i++;
      continue;
    }

    // Hunk header: @@ -baseStart[,baseCount] +headStart[,headCount] @@ [suffix]
    const match = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)/);
    const fileLines = currentBasePath ? fileContents[currentBasePath]?.split('\n') : undefined;

    if (!match || !fileLines) {
      result.push(line);
      i++;
      continue;
    }

    const baseStart  = parseInt(match[1]);
    const baseCount  = match[2] !== undefined ? parseInt(match[2]) : 1;
    const headStart  = parseInt(match[3]);
    const headCount  = match[4] !== undefined ? parseInt(match[4]) : 1;
    const suffix     = match[5]; // e.g. " function foo() {"

    // Collect hunk body
    i++;
    const body: string[] = [];
    while (i < lines.length && !lines[i].startsWith('@@ ') && !lines[i].startsWith('diff ')) {
      body.push(lines[i]);
      i++;
    }
    // Drop trailing empty line artifact from split
    while (body.length > 0 && body[body.length - 1] === '') body.pop();

    // Count existing leading/trailing context lines
    let leadCtx = 0;
    for (const bl of body) { if (bl.startsWith(' ')) leadCtx++; else break; }
    let trailCtx = 0;
    for (let j = body.length - 1; j >= 0; j--) { if (body[j].startsWith(' ')) trailCtx++; else break; }

    // --- Prepend extra leading context ---
    const extraLead   = Math.max(0, targetContext - leadCtx);
    const hunkStart0  = baseStart - 1;          // 0-indexed first line of existing hunk
    const prependFrom = Math.max(0, hunkStart0 - extraLead);
    const prepend     = fileLines.slice(prependFrom, hunkStart0).map(l => ' ' + l);

    // --- Append extra trailing context ---
    const extraTrail  = Math.max(0, targetContext - trailCtx);
    const hunkEnd0    = hunkStart0 + baseCount;  // exclusive, 0-indexed
    const appendTo    = Math.min(fileLines.length, hunkEnd0 + extraTrail);
    const append      = fileLines.slice(hunkEnd0, appendTo).map(l => ' ' + l);

    // --- Rebuild hunk header ---
    const newBaseStart = prependFrom + 1;
    const newBaseCount = prepend.length + baseCount + append.length;
    const newHeadStart = Math.max(1, headStart - prepend.length);
    const newHeadCount = prepend.length + headCount + append.length;

    result.push(`@@ -${newBaseStart},${newBaseCount} +${newHeadStart},${newHeadCount} @@${suffix}`);
    result.push(...prepend, ...body, ...append);
  }

  return result.join('\n');
}

export function buildContextPackage(
  prData: PrMetadata,
  diff: string,
  changedFiles: ChangedFile[],
  fileContents: Record<string, string>,
  headFileContents: Record<string, string>,
  neighborFiles: Record<string, string>
): string {
  const totalAdditions = changedFiles.reduce((s, f) => s + f.additions, 0);
  const totalDeletions = changedFiles.reduce((s, f) => s + f.deletions, 0);

  const metaSection = `<pr_metadata>
Title: ${prData.title}
Author: ${prData.author}
Description: ${prData.description || '(no description)'}
Base branch: ${prData.baseBranch}
Files changed: ${changedFiles.length} | Lines added: ${totalAdditions} | Lines deleted: ${totalDeletions}
</pr_metadata>`;

  const expandedDiff = expandDiffContext(diff, fileContents);
  const diffSection = `<full_diff>
${expandedDiff}
</full_diff>`;

  // Build file_contents (before) section
  let fileContentsSection = '<file_contents_before>\n';
  for (const [path, content] of Object.entries(fileContents)) {
    fileContentsSection += `  <file path="${path}">\n${content}\n  </file>\n`;
  }
  fileContentsSection += '</file_contents_before>';

  // Build file_contents_after (head) section
  let headContentsSection = '<file_contents_after>\n';
  for (const [path, content] of Object.entries(headFileContents)) {
    headContentsSection += `  <file path="${path}">\n${content}\n  </file>\n`;
  }
  headContentsSection += '</file_contents_after>';

  // Build neighbor_files section
  let neighborSection = '<neighbor_files>\n';
  for (const [path, content] of Object.entries(neighborFiles)) {
    neighborSection += `  <file path="${path}" relationship="imported by changed files">\n${content}\n  </file>\n`;
  }
  neighborSection += '</neighbor_files>';

  const baseContent = metaSection + '\n\n' + diffSection + '\n\n';
  const baseChars = baseContent.length;
  let remaining = MAX_CHARS - baseChars;

  let fileContentsStr = fileContentsSection;
  let headContentsStr = headContentsSection;
  let neighborStr = neighborSection;

  const totalWithAll = baseChars + fileContentsStr.length + headContentsStr.length + neighborStr.length;

  if (totalWithAll > MAX_CHARS) {
    // Drop neighbor files first
    const neighborBudget = Math.max(0, remaining - fileContentsStr.length - headContentsStr.length);
    let neighborChars = 0;
    const truncatedNeighbor: Record<string, string> = {};
    for (const [path, content] of Object.entries(neighborFiles)) {
      const entry = `  <file path="${path}" relationship="imported by changed files">\n${content}\n  </file>\n`;
      if (neighborChars + entry.length > neighborBudget) break;
      truncatedNeighbor[path] = content;
      neighborChars += entry.length;
    }
    neighborStr = '<neighbor_files>\n';
    for (const [path, content] of Object.entries(truncatedNeighbor)) {
      neighborStr += `  <file path="${path}" relationship="imported by changed files">\n${content}\n  </file>\n`;
    }
    neighborStr += '</neighbor_files>';

    remaining = MAX_CHARS - baseChars - neighborStr.length;

    if (baseChars + fileContentsStr.length + headContentsStr.length + neighborStr.length > MAX_CHARS) {
      console.warn('[context-builder] Context too large — truncating file contents to 200 lines each');
      fileContentsStr = '<file_contents_before>\n';
      for (const [path, content] of Object.entries(fileContents)) {
        fileContentsStr += `  <file path="${path}">\n${truncateFileContent(content, MAX_FILE_LINES)}\n  </file>\n`;
      }
      fileContentsStr += '</file_contents_before>';

      headContentsStr = '<file_contents_after>\n';
      for (const [path, content] of Object.entries(headFileContents)) {
        headContentsStr += `  <file path="${path}">\n${truncateFileContent(content, MAX_FILE_LINES)}\n  </file>\n`;
      }
      headContentsStr += '</file_contents_after>';

      if (baseChars + fileContentsStr.length + headContentsStr.length + neighborStr.length > MAX_CHARS) {
        console.warn('[context-builder] Still too large — dropping neighbor files');
        neighborStr = '<neighbor_files>\n<!-- omitted: context budget exceeded -->\n</neighbor_files>';
      }
    }
  }

  return baseContent + fileContentsStr + '\n\n' + headContentsStr + '\n\n' + neighborStr;
}
