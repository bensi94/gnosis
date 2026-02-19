import { createHighlighter, type Highlighter, type ShikiTransformer } from 'shiki';

let highlighterInstance: Highlighter | null = null;

async function getHighlighter(): Promise<Highlighter> {
  if (!highlighterInstance) {
    highlighterInstance = await createHighlighter({
      themes: ['github-dark'],
      langs: [
        'typescript', 'javascript', 'tsx', 'jsx',
        'python', 'go', 'rust', 'java', 'kotlin',
        'csharp', 'cpp', 'c',
        'css', 'scss', 'html',
        'json', 'yaml', 'toml',
        'bash', 'shell', 'sql',
        'markdown', 'diff',
        'swift', 'ruby', 'php',
      ],
    });
  }
  return highlighterInstance;
}

const SUPPORTED_LANGUAGES = new Set([
  'typescript', 'javascript', 'tsx', 'jsx',
  'python', 'go', 'rust', 'java', 'kotlin',
  'csharp', 'cpp', 'c',
  'css', 'scss', 'html', 'json', 'yaml', 'toml',
  'bash', 'shell', 'sql', 'markdown',
  'swift', 'ruby', 'php',
]);

/**
 * Render a diff hunk using Shiki with a position-based diff transformer.
 *
 * Instead of appending text annotations (// [!code ++]) which break when the
 * code line contains multi-span comment syntax (e.g. C# XML doc comments),
 * we track the diff type for each line by position and apply classes directly
 * via a custom ShikiTransformer. This works for every language.
 */
export async function renderDiffHunk(content: string, language: string): Promise<string> {
  const highlighter = await getHighlighter();
  const lang = SUPPORTED_LANGUAGES.has(language) ? language : 'text';

  type DiffType = 'add' | 'remove' | 'context';
  const diffTypes: DiffType[] = [];
  const codeLines: string[] = [];

  for (const line of content.split('\n')) {
    if (line === '') continue;
    const prefix = line[0];
    diffTypes.push(prefix === '+' ? 'add' : prefix === '-' ? 'remove' : 'context');
    codeLines.push(line.slice(1));
  }

  const hasDiff = diffTypes.some((t) => t !== 'context');

  const diffTransformer: ShikiTransformer = {
    name: 'pr-review-diff',
    pre(node) {
      if (hasDiff) this.addClassToHast(node, 'has-diff');
    },
    line(node, lineNumber) {
      // lineNumber is 1-indexed
      const type = diffTypes[lineNumber - 1];
      if (type === 'add') this.addClassToHast(node, ['diff', 'add']);
      else if (type === 'remove') this.addClassToHast(node, ['diff', 'remove']);
    },
  };

  return highlighter.codeToHtml(codeLines.join('\n'), {
    lang,
    theme: 'github-dark',
    transformers: [diffTransformer],
  });
}

export function inferLanguage(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    ts: 'typescript', tsx: 'tsx',
    js: 'javascript', jsx: 'jsx',
    py: 'python', go: 'go',
    rs: 'rust', java: 'java', kt: 'kotlin',
    cs: 'csharp', cpp: 'cpp', cc: 'cpp', cxx: 'cpp', c: 'c', h: 'c',
    css: 'css', scss: 'scss', html: 'html', htm: 'html',
    json: 'json', yaml: 'yaml', yml: 'yaml',
    toml: 'toml', sh: 'bash', bash: 'bash', sql: 'sql', md: 'markdown',
    swift: 'swift', rb: 'ruby', php: 'php',
  };
  return map[ext ?? ''] ?? 'text';
}
