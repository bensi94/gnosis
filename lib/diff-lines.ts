import type { DiffSide } from './types';

export interface DiffLineInfo {
  lineNumber: number;
  baseLineNumber: number | null;
  headLineNumber: number | null;
  side: DiffSide;
  type: 'add' | 'remove' | 'context';
  text: string;
}

export interface SplitRow {
  left: { info: DiffLineInfo; html: string } | null;
  right: { info: DiffLineInfo; html: string } | null;
}

/**
 * Detect whether the content string has unified diff prefix markers on every
 * non-empty line (`+`, `-`, or ` `). Returns false on the first line that
 * doesn't start with one of these characters.
 */
export function contentHasDiffMarkers(content: string): boolean {
  const lines = content.split('\n');
  let nonEmptyCount = 0;
  for (const line of lines) {
    if (line === '') continue;
    nonEmptyCount++;
    const ch = line[0];
    if (ch !== '+' && ch !== '-' && ch !== ' ') return false;
  }
  return nonEmptyCount > 0;
}

/**
 * Parse a hunk header and its content lines into per-line metadata.
 *
 * The hunk header format is: @@ -oldStart,oldCount +newStart,newCount @@
 * Content lines are prefixed with '+' (add), '-' (remove), or ' ' (context).
 *
 * When the AI omits diff prefix markers, the function detects this and treats
 * every line as full text. For new-file hunks (oldCount === 0) lines are
 * treated as additions; otherwise they are treated as context.
 *
 * This mirrors the same line-splitting logic used by renderDiffHunk in
 * lib/highlight.ts so that indices stay aligned with the rendered Shiki HTML.
 */
export function parseDiffLines(hunkHeader: string, content: string): DiffLineInfo[] {
  const match = hunkHeader.match(/@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/);
  if (!match) return [];

  let oldLine = parseInt(match[1], 10);
  let newLine = parseInt(match[3], 10);

  const hasMarkers = contentHasDiffMarkers(content);
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- regex optional group can be undefined at runtime
  const oldCount = match[2] !== undefined ? parseInt(match[2], 10) : 1;
  const isNewFile = oldLine === 0 && oldCount === 0;

  const result: DiffLineInfo[] = [];

  for (const line of content.split('\n')) {
    if (line === '') continue;

    if (hasMarkers) {
      const prefix = line[0];
      const text = line.slice(1);

      if (prefix === '+') {
        result.push({
          lineNumber: newLine,
          baseLineNumber: null,
          headLineNumber: newLine,
          side: 'RIGHT',
          type: 'add',
          text,
        });
        newLine++;
      } else if (prefix === '-') {
        result.push({
          lineNumber: oldLine,
          baseLineNumber: oldLine,
          headLineNumber: null,
          side: 'LEFT',
          type: 'remove',
          text,
        });
        oldLine++;
      } else {
        result.push({
          lineNumber: newLine,
          baseLineNumber: oldLine,
          headLineNumber: newLine,
          side: 'RIGHT',
          type: 'context',
          text,
        });
        oldLine++;
        newLine++;
      }
    } else {
      // No diff markers — use full line text
      if (isNewFile) {
        result.push({
          lineNumber: newLine,
          baseLineNumber: null,
          headLineNumber: newLine,
          side: 'RIGHT',
          type: 'add',
          text: line,
        });
        newLine++;
      } else {
        result.push({
          lineNumber: newLine,
          baseLineNumber: oldLine,
          headLineNumber: newLine,
          side: 'RIGHT',
          type: 'context',
          text: line,
        });
        oldLine++;
        newLine++;
      }
    }
  }

  return result;
}

/**
 * Build side-by-side split rows from parsed diff lines and their corresponding
 * Shiki HTML. Context lines appear on both sides. Change chunks (contiguous
 * removes followed by adds) are zipped into paired rows, with the shorter
 * side padded with null.
 */
export function buildSplitRows(lineInfos: DiffLineInfo[], lineHtmls: string[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let i = 0;

  while (i < lineInfos.length) {
    const info = lineInfos[i];

    if (info.type === 'context') {
      rows.push({
        left: { info, html: lineHtmls[i] },
        right: { info, html: lineHtmls[i] },
      });
      i++;
      continue;
    }

    // Collect a contiguous change chunk: removes then adds
    const removes: { info: DiffLineInfo; html: string }[] = [];
    const adds: { info: DiffLineInfo; html: string }[] = [];

    while (i < lineInfos.length && lineInfos[i].type === 'remove') {
      removes.push({ info: lineInfos[i], html: lineHtmls[i] });
      i++;
    }
    while (i < lineInfos.length && lineInfos[i].type === 'add') {
      adds.push({ info: lineInfos[i], html: lineHtmls[i] });
      i++;
    }

    const maxLen = Math.max(removes.length, adds.length);
    for (let j = 0; j < maxLen; j++) {
      rows.push({
        left: j < removes.length ? removes[j] : null,
        right: j < adds.length ? adds[j] : null,
      });
    }
  }

  return rows;
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
