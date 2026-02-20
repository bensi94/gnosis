import type { DiffSide } from './types';

export interface DiffLineInfo {
  lineNumber: number;
  side: DiffSide;
  type: 'add' | 'remove' | 'context';
  text: string;
}

/**
 * Parse a hunk header and its content lines into per-line metadata.
 *
 * The hunk header format is: @@ -oldStart,oldCount +newStart,newCount @@
 * Content lines are prefixed with '+' (add), '-' (remove), or ' ' (context).
 *
 * This mirrors the same line-splitting logic used by renderDiffHunk in
 * lib/highlight.ts so that indices stay aligned with the rendered Shiki HTML.
 */
export function parseDiffLines(hunkHeader: string, content: string): DiffLineInfo[] {
  const match = hunkHeader.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
  if (!match) return [];

  let oldLine = parseInt(match[1], 10);
  let newLine = parseInt(match[2], 10);

  const result: DiffLineInfo[] = [];

  for (const line of content.split('\n')) {
    if (line === '') continue;

    const prefix = line[0];
    const text = line.slice(1);

    if (prefix === '+') {
      result.push({ lineNumber: newLine, side: 'RIGHT', type: 'add', text });
      newLine++;
    } else if (prefix === '-') {
      result.push({ lineNumber: oldLine, side: 'LEFT', type: 'remove', text });
      oldLine++;
    } else {
      // Context lines exist on both sides; use RIGHT (new file) for commenting
      result.push({ lineNumber: newLine, side: 'RIGHT', type: 'context', text });
      oldLine++;
      newLine++;
    }
  }

  return result;
}

/**
 * Parse a GitHub file patch (from pulls.listFiles) into a set of valid
 * "line:side" keys. These represent lines that GitHub's API will accept
 * for line-level review comments.
 *
 * This is needed because Gnosis expands diff context from 3 to 10 lines
 * before sending to the AI, so the AI-generated hunks may include lines
 * that aren't in the original GitHub diff.
 */
export function parsePatchValidLines(patch: string): Set<string> {
  const valid = new Set<string>();
  let oldLine = 0;
  let newLine = 0;

  for (const rawLine of patch.split('\n')) {
    const hunkMatch = rawLine.match(/^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      oldLine = parseInt(hunkMatch[1], 10);
      newLine = parseInt(hunkMatch[2], 10);
      continue;
    }

    // Skip non-diff metadata lines
    if (
      rawLine.startsWith('\\') ||
      rawLine.startsWith('diff ') ||
      rawLine.startsWith('index ') ||
      rawLine.startsWith('--- ') ||
      rawLine.startsWith('+++ ')
    ) {
      continue;
    }

    const prefix = rawLine[0];
    if (prefix === '+') {
      valid.add(`${newLine}:RIGHT`);
      newLine++;
    } else if (prefix === '-') {
      valid.add(`${oldLine}:LEFT`);
      oldLine++;
    } else if (prefix === ' ') {
      valid.add(`${newLine}:RIGHT`);
      valid.add(`${oldLine}:LEFT`);
      oldLine++;
      newLine++;
    }
  }

  return valid;
}
