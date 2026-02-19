'use client';

import { Group as PanelGroup, Panel, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DiffHunkGroup } from '@/components/DiffHunk';
import { InlineCode } from '@/components/InlineCode';
import { MermaidDiagram } from '@/components/MermaidDiagram';
import type { Slide, SlideType, DiffHunk } from '@/lib/types';

interface Props {
  slide: Slide;
  slideNumber: number;
  totalSlides: number;
}

const slideTypeConfig: Record<SlideType, { label: string; className: string }> = {
  foundation: { label: 'Foundation', className: 'bg-purple-900 text-purple-200 border-purple-700' },
  feature:    { label: 'Feature',    className: 'bg-blue-900 text-blue-200 border-blue-700' },
  refactor:   { label: 'Refactor',   className: 'bg-orange-900 text-orange-200 border-orange-700' },
  bugfix:     { label: 'Bug Fix',    className: 'bg-red-900 text-red-200 border-red-700' },
  test:       { label: 'Test',       className: 'bg-green-900 text-green-200 border-green-700' },
  config:     { label: 'Config',     className: 'bg-zinc-700 text-zinc-200 border-zinc-600' },
  docs:       { label: 'Docs',       className: 'bg-zinc-700 text-zinc-200 border-zinc-600' },
};

// Split "1) foo 2) bar 3) baz" into ["foo", "bar", "baz"]
function splitReviewFocus(text: string): string[] {
  const parts = text.split(/\s*\d+\)\s+/);
  // First element is empty string if text starts with "1) "
  return parts.filter(Boolean);
}

// Group hunks by filePath so we can render them under a single file header
function groupHunksByFile(hunks: DiffHunk[]): { filePath: string; hunks: DiffHunk[] }[] {
  const map = new Map<string, DiffHunk[]>();
  for (const hunk of hunks) {
    if (!map.has(hunk.filePath)) map.set(hunk.filePath, []);
    map.get(hunk.filePath)!.push(hunk);
  }
  return Array.from(map.entries()).map(([filePath, hunks]) => ({ filePath, hunks }));
}

export function SlideView({ slide }: Props) {
  const typeConfig = slideTypeConfig[slide.slideType] ?? slideTypeConfig.feature;
  const groupedHunks = groupHunksByFile(slide.diffHunks);

  return (
    <PanelGroup orientation="horizontal" className="flex flex-1 overflow-hidden">
      {/* Left panel — narrative */}
      <Panel defaultSize={40} minSize={25} className="overflow-y-auto min-h-0">
        <div className="p-6 flex flex-col gap-5">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            variant="outline"
            className={typeConfig.className}
          >
            {typeConfig.label}
          </Badge>
        </div>

        <h2 className="text-xl font-semibold leading-tight">{slide.title}</h2>

        <p className="text-sm text-muted-foreground leading-relaxed"><InlineCode text={slide.narrative} /></p>

        {/* Review focus */}
        <Card className="border-2">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-xs uppercase tracking-wider text-muted-foreground">
              What to check
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3 px-4">
            <ul className="space-y-1.5">
              {splitReviewFocus(slide.reviewFocus).map((point, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground shrink-0 mt-px">•</span>
                  <span><InlineCode text={point} /></span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Affected files */}
        {slide.affectedFiles.length > 0 && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">
              Affected files
            </p>
            <ul className="space-y-1">
              {slide.affectedFiles.map((f) => (
                <li key={f} className="font-mono text-xs text-muted-foreground truncate">
                  {f}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Context snippets */}
        {slide.contextSnippets.length > 0 && (
          <details className="group">
            <summary className="cursor-pointer text-xs uppercase tracking-wider text-muted-foreground hover:text-foreground select-none list-none flex items-center gap-1">
              <span className="group-open:rotate-90 inline-block transition-transform">▶</span>
              Codebase context
            </summary>
            <div className="mt-3 space-y-3">
              {slide.contextSnippets.map((snippet, i) => (
                <Card key={i} className="bg-muted/30">
                  <CardContent className="p-3">
                    <pre className="text-xs whitespace-pre-wrap break-all text-muted-foreground font-mono">
                      {snippet}
                    </pre>
                  </CardContent>
                </Card>
              ))}
            </div>
          </details>
        )}
        </div>
      </Panel>

      <PanelResizeHandle className="w-1 bg-border hover:bg-primary/50 transition-colors cursor-col-resize" />

      {/* Right panel — diagram + diffs */}
      <Panel defaultSize={60} minSize={30} className="overflow-y-auto min-h-0">
        <div className="p-6 flex flex-col gap-4">
        {slide.mermaidDiagram && (
          <div>
            <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Diagram</p>
            <MermaidDiagram chart={slide.mermaidDiagram} />
          </div>
        )}
        {groupedHunks.length === 0 && (
          <p className="text-sm text-muted-foreground italic">No diff hunks for this slide.</p>
        )}
        {groupedHunks.map(({ filePath, hunks }) => (
          <DiffHunkGroup key={filePath} filePath={filePath} hunks={hunks} />
        ))}
        </div>
      </Panel>
    </PanelGroup>
  );
}
