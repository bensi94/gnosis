'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { MessageSquarePlus, X, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DiffHunkGroup } from '@/components/DiffHunk';
import { parseDiffLines, type DiffLineInfo } from '@/lib/diff-lines';
import type { DiffHunk, PendingReviewComment, DiffSide } from '@/lib/types';

interface CommentCallbacks {
  onAddComment: (params: {
    filePath: string;
    line: number;
    side: DiffSide;
    body: string;
    hunkHeader: string;
    codeSnippet: string;
    slideIndex: number;
  }) => void;
  onRemoveComment: (id: string) => void;
  onEditComment: (id: string, body: string) => void;
}

interface InteractiveDiffHunkGroupProps extends CommentCallbacks {
  filePath: string;
  hunks: DiffHunk[];
  pendingComments: PendingReviewComment[];
  slideIndex: number;
}

interface ParsedLine {
  info: DiffLineInfo;
  html: string;
}

/**
 * Parse the Shiki-rendered HTML to extract individual line elements.
 * Shiki wraps each line in <span class="line">...</span> inside <code> inside <pre>.
 */
function parseShikiLines(renderedHtml: string): string[] | null {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(renderedHtml, 'text/html');
    const lines = doc.querySelectorAll('span.line');
    if (lines.length === 0) return null;
    return Array.from(lines).map((el) => el.innerHTML);
  } catch {
    return null;
  }
}

/**
 * Extract the Shiki theme styles from the rendered <pre> element so we can
 * re-apply them when rendering individual lines outside the original tree.
 */
function extractShikiStyles(
  renderedHtml: string,
): { preStyle: Record<string, string>; preClass: string } {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(renderedHtml, 'text/html');
    const pre = doc.querySelector('pre');
    const styleStr = pre?.getAttribute('style') ?? '';
    // Parse "color: #fff; background-color: #000" into { color: '#fff', backgroundColor: '#000' }
    const preStyle: Record<string, string> = {};
    for (const decl of styleStr.split(';')) {
      const [prop, ...rest] = decl.split(':');
      if (!prop?.trim() || rest.length === 0) continue;
      const camel = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      preStyle[camel] = rest.join(':').trim();
    }
    return {
      preStyle,
      preClass: pre?.getAttribute('class') ?? '',
    };
  } catch {
    return { preStyle: {}, preClass: '' };
  }
}

function InlineCommentForm({
  onSubmit,
  onCancel,
  initialBody,
}: {
  onSubmit: (body: string) => void;
  onCancel: () => void;
  initialBody?: string;
}) {
  const [body, setBody] = useState(initialBody ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (body.trim()) onSubmit(body.trim());
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div className="mx-2 my-1.5 border rounded-md bg-muted/30 p-2">
      <textarea
        ref={textareaRef}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Leave a comment... (Cmd+Enter to add, Esc to cancel)"
        className="w-full min-h-[60px] bg-transparent text-sm font-mono resize-y border rounded p-2 focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <div className="flex justify-end gap-1.5 mt-1.5">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={() => body.trim() && onSubmit(body.trim())}
          disabled={!body.trim()}
        >
          Add comment
        </Button>
      </div>
    </div>
  );
}

function CommentBubble({
  comment,
  onRemove,
  onEdit,
}: {
  comment: PendingReviewComment;
  onRemove: (id: string) => void;
  onEdit: (id: string, body: string) => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <InlineCommentForm
        initialBody={comment.body}
        onSubmit={(body) => {
          onEdit(comment.id, body);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="mx-2 my-1 border rounded-md bg-blue-950/30 border-blue-800/30 p-2 flex gap-2 group">
      <pre className="flex-1 text-xs font-mono whitespace-pre-wrap break-words text-blue-200">
        {comment.body}
      </pre>
      <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => setEditing(true)}
          className="p-0.5 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground"
          title="Edit"
        >
          <Pencil className="h-3 w-3" />
        </button>
        <button
          onClick={() => onRemove(comment.id)}
          className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive"
          title="Delete"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
    </div>
  );
}

function InteractiveHunk({
  hunk,
  filePath,
  pendingComments,
  slideIndex,
  onAddComment,
  onRemoveComment,
  onEditComment,
}: {
  hunk: DiffHunk;
  filePath: string;
  pendingComments: PendingReviewComment[];
  slideIndex: number;
} & CommentCallbacks) {
  const [activeFormLine, setActiveFormLine] = useState<number | null>(null);

  const lineInfos = useMemo(
    () => parseDiffLines(hunk.hunkHeader, hunk.content),
    [hunk.hunkHeader, hunk.content],
  );

  const lineHtmls = useMemo(() => parseShikiLines(hunk.renderedHtml), [hunk.renderedHtml]);
  const shikiStyles = useMemo(() => extractShikiStyles(hunk.renderedHtml), [hunk.renderedHtml]);

  // If we can't parse the HTML, fall back to non-interactive rendering
  if (!lineHtmls || lineHtmls.length !== lineInfos.length) {
    return <div dangerouslySetInnerHTML={{ __html: hunk.renderedHtml }} />;
  }

  const lines: ParsedLine[] = lineInfos.map((info, i) => ({
    info,
    html: lineHtmls[i],
  }));

  function handleAddComment(lineInfo: DiffLineInfo) {
    setActiveFormLine(lineInfo.lineNumber);
  }

  function handleSubmitComment(body: string, lineInfo: DiffLineInfo) {
    onAddComment({
      filePath,
      line: lineInfo.lineNumber,
      side: lineInfo.side,
      body,
      hunkHeader: hunk.hunkHeader,
      codeSnippet: lineInfo.text,
      slideIndex,
    });
    setActiveFormLine(null);
  }

  const hasDiff = lineInfos.some((l) => l.type !== 'context');

  return (
    <pre className={shikiStyles.preClass} style={shikiStyles.preStyle}>
      <code style={{ display: 'block', fontSize: 0, minWidth: '100%', width: 'max-content' }}>
        {lines.map((line, idx) => {
          const lineComments = pendingComments.filter(
            (c) => c.line === line.info.lineNumber && c.filePath === filePath,
          );
          const isFormActive = activeFormLine === line.info.lineNumber;

          const diffClass =
            line.info.type === 'add'
              ? 'diff add'
              : line.info.type === 'remove'
                ? 'diff remove'
                : '';

          return (
            <span key={idx}>
              <span
                className={`line ${diffClass} interactive-line`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: '0.8125rem',
                  lineHeight: '1.5',
                  paddingRight: '1.25rem',
                }}
              >
                {/* Line number gutter */}
                <span
                  className="line-number-gutter"
                  style={{
                    display: 'inline-block',
                    width: '3.5ch',
                    textAlign: 'right',
                    paddingRight: '0.5ch',
                    color: 'rgba(255,255,255,0.3)',
                    userSelect: 'none',
                    flexShrink: 0,
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                  }}
                  onClick={() => handleAddComment(line.info)}
                  title={`Comment on line ${line.info.lineNumber}`}
                >
                  {line.info.lineNumber}
                </span>

                {/* Add comment icon (visible on hover via CSS) */}
                <span
                  className="add-comment-icon"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    width: '1.25rem',
                    flexShrink: 0,
                    opacity: 0,
                    cursor: 'pointer',
                  }}
                  onClick={() => handleAddComment(line.info)}
                >
                  <MessageSquarePlus
                    style={{ width: '0.75rem', height: '0.75rem', color: '#58a6ff' }}
                  />
                </span>

                {/* Diff gutter character */}
                {hasDiff && (
                  <span
                    style={{
                      display: 'inline-block',
                      width: '1ch',
                      marginRight: '1ch',
                      userSelect: 'none',
                      flexShrink: 0,
                      color:
                        line.info.type === 'add'
                          ? '#3fb950'
                          : line.info.type === 'remove'
                            ? '#f85149'
                            : 'transparent',
                    }}
                  >
                    {line.info.type === 'add' ? '+' : line.info.type === 'remove' ? '-' : ' '}
                  </span>
                )}

                {/* Code content */}
                <span
                  dangerouslySetInnerHTML={{ __html: line.html }}
                  style={{ flex: 1, minWidth: 0 }}
                />
              </span>

              {/* Comment form */}
              {isFormActive && (
                <InlineCommentForm
                  onSubmit={(body) => handleSubmitComment(body, line.info)}
                  onCancel={() => setActiveFormLine(null)}
                />
              )}

              {/* Pending comments for this line */}
              {lineComments.map((c) => (
                <CommentBubble
                  key={c.id}
                  comment={c}
                  onRemove={onRemoveComment}
                  onEdit={onEditComment}
                />
              ))}
            </span>
          );
        })}
      </code>
    </pre>
  );
}

export function InteractiveDiffHunkGroup({
  filePath,
  hunks,
  pendingComments,
  slideIndex,
  onAddComment,
  onRemoveComment,
  onEditComment,
}: InteractiveDiffHunkGroupProps) {
  // Count comments for this file
  const fileCommentCount = pendingComments.filter((c) => c.filePath === filePath).length;

  return (
    <div className="rounded-md border overflow-x-auto">
      <div className="bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground border-b truncate flex items-center justify-between">
        <span>{filePath}</span>
        {fileCommentCount > 0 && (
          <span className="ml-2 inline-flex items-center gap-1 text-blue-400">
            <MessageSquarePlus className="h-3 w-3" />
            {fileCommentCount}
          </span>
        )}
      </div>
      {hunks.map((hunk, i) => (
        <div key={i}>
          {i > 0 && <div className="border-t border-dashed border-muted" />}
          {hunk.hunkHeader && (
            <div className="bg-muted/30 px-3 py-1 font-mono text-xs text-muted-foreground border-b">
              {hunk.hunkHeader}
            </div>
          )}
          <InteractiveHunk
            hunk={hunk}
            filePath={filePath}
            pendingComments={pendingComments}
            slideIndex={slideIndex}
            onAddComment={onAddComment}
            onRemoveComment={onRemoveComment}
            onEditComment={onEditComment}
          />
        </div>
      ))}
    </div>
  );
}
