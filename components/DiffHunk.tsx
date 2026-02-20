'use client';

import type { DiffHunk as DiffHunkType } from '@/lib/types';

interface Props {
  hunk: DiffHunkType;
  showFileHeader?: boolean;
}

export function DiffHunk({ hunk, showFileHeader = true }: Props) {
  return (
    <div className="rounded-md border overflow-x-auto">
      {showFileHeader && (
        <div className="bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground border-b truncate">
          {hunk.filePath}
        </div>
      )}
      {hunk.hunkHeader && (
        <div className="bg-muted/30 px-3 py-1 font-mono text-xs text-muted-foreground border-b">{hunk.hunkHeader}</div>
      )}
      <div dangerouslySetInnerHTML={{ __html: hunk.renderedHtml }} />
    </div>
  );
}

interface GroupedProps {
  filePath: string;
  hunks: DiffHunkType[];
}

export function DiffHunkGroup({ filePath, hunks }: GroupedProps) {
  return (
    <div className="rounded-md border overflow-x-auto">
      <div className="bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground border-b truncate">{filePath}</div>
      {hunks.map((hunk, i) => (
        <div key={i}>
          {i > 0 && <div className="border-t border-dashed border-muted" />}
          {hunk.hunkHeader && (
            <div className="bg-muted/30 px-3 py-1 font-mono text-xs text-muted-foreground border-b">
              {hunk.hunkHeader}
            </div>
          )}
          <div dangerouslySetInnerHTML={{ __html: hunk.renderedHtml }} />
        </div>
      ))}
    </div>
  );
}
