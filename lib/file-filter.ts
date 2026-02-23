import type { ChangedFile } from './types';

/**
 * Built-in patterns for generated / low-value files.
 * Supports: exact basename match, *.ext suffix, *.mid.* middle wildcard.
 */
const DEFAULT_GENERATED_PATTERNS: string[] = [
  // Lock files
  'poetry.lock',
  'Pipfile.lock',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'Gemfile.lock',
  'Cargo.lock',
  'go.sum',
  'composer.lock',
  'flake.lock',
  'pdm.lock',
  'uv.lock',
  'bun.lockb',
  'packages.lock.json',
  'Podfile.lock',
  'pubspec.lock',

  // Minified assets
  '*.min.js',
  '*.min.css',

  // Generated code
  '*.generated.*',
  '*.g.dart',
  '*.freezed.dart',
  '*.pb.go',
  '*.pb.ts',

  // Snapshots
  '*.snap',
];

/**
 * Files exceeding this many changed lines (additions + deletions) are
 * auto-classified as generated, unless they have a recognized source extension.
 */
const LARGE_FILE_THRESHOLD = 2000;

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.py',
  '.rb',
  '.rs',
  '.go',
  '.java',
  '.kt',
  '.swift',
  '.c',
  '.cpp',
  '.h',
  '.hpp',
  '.cs',
  '.dart',
  '.vue',
  '.svelte',
  '.astro',
  '.php',
  '.scala',
  '.ex',
  '.exs',
  '.clj',
  '.hs',
  '.ml',
  '.fs',
  '.lua',
  '.zig',
  '.nim',
  '.md',
  '.mdx',
  '.txt',
  '.yml',
  '.yaml',
  '.toml',
  '.json',
  '.xml',
  '.html',
  '.css',
  '.scss',
  '.less',
  '.sql',
]);

export interface FileClassification {
  filename: string;
  classification: 'generated' | 'normal';
  reason?: string;
}

export interface FilterResult {
  normalFiles: ChangedFile[];
  generatedFiles: FileClassification[];
}

function matchesPattern(filename: string, pattern: string): boolean {
  const basename = filename.split('/').pop() ?? filename;

  // *.mid.* (middle wildcard like *.generated.*)
  if (pattern.startsWith('*.') && pattern.lastIndexOf('*') > 0) {
    const inner = pattern.slice(1, pattern.lastIndexOf('*'));
    return basename.includes(inner);
  }

  // *.ext (suffix match)
  if (pattern.startsWith('*')) {
    return basename.endsWith(pattern.slice(1));
  }

  // Exact basename match
  return basename === pattern;
}

export function classifyFiles(changedFiles: ChangedFile[], extraPatterns: string[] = []): FilterResult {
  const patterns = [...DEFAULT_GENERATED_PATTERNS, ...extraPatterns];
  const normalFiles: ChangedFile[] = [];
  const generatedFiles: FileClassification[] = [];

  for (const file of changedFiles) {
    const matchedPattern = patterns.find((p) => matchesPattern(file.filename, p));
    if (matchedPattern) {
      generatedFiles.push({
        filename: file.filename,
        classification: 'generated',
        reason: `matches pattern: ${matchedPattern}`,
      });
      continue;
    }

    // Size threshold for non-source files
    const ext = '.' + (file.filename.split('.').pop() ?? '');
    const totalChanged = file.additions + file.deletions;
    if (totalChanged > LARGE_FILE_THRESHOLD && !SOURCE_EXTENSIONS.has(ext)) {
      generatedFiles.push({
        filename: file.filename,
        classification: 'generated',
        reason: `exceeds ${LARGE_FILE_THRESHOLD} changed lines (${totalChanged})`,
      });
      continue;
    }

    normalFiles.push(file);
  }

  return { normalFiles, generatedFiles };
}

export function filterDiff(rawDiff: string, generatedFilenames: Set<string>): string {
  if (generatedFilenames.size === 0) return rawDiff;

  const lines = rawDiff.split('\n');
  const result: string[] = [];
  let skipping = false;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/diff --git a\/(.*) b\/(.*)/);
      const filePath = match?.[2] ?? match?.[1];
      skipping = filePath ? generatedFilenames.has(filePath) : false;
    }

    if (!skipping) {
      result.push(line);
    }
  }

  return result.join('\n');
}

export function buildExcludedFilesSummary(generatedFiles: FileClassification[]): string {
  if (generatedFiles.length === 0) return '';

  const lines = generatedFiles.map((f) => `  - ${f.filename} (${f.reason})`);

  return `<excluded_files count="${generatedFiles.length}">
The following files were changed in this PR but excluded from the diff and file contents because they are generated or low-value for review purposes:
${lines.join('\n')}
</excluded_files>`;
}
