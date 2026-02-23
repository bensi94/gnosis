import { useState, useMemo } from 'react';
import { MessageSquarePlus } from 'lucide-react';
import { parseDiffLines, buildSplitRows, type DiffLineInfo, type SplitRow } from '@/lib/diff-lines';
import type { DiffHunk, PendingReviewComment } from '@/lib/types';
import {
  type CommentCallbacks,
  parseShikiLines,
  extractShikiStyles,
  InlineCommentForm,
  CommentBubble,
} from '@/components/shared-diff-utils';

interface SplitDiffHunkGroupProps {
  filePath: string;
  hunks: DiffHunk[];
  pendingComments?: PendingReviewComment[];
  slideIndex?: number;
  commentCallbacks?: CommentCallbacks;
}

function SplitHunk({
  hunk,
  filePath,
  pendingComments,
  slideIndex,
  commentCallbacks,
}: {
  hunk: DiffHunk;
  filePath: string;
  pendingComments: PendingReviewComment[];
  slideIndex: number;
  commentCallbacks?: CommentCallbacks;
}) {
  const [activeFormKey, setActiveFormKey] = useState<string | null>(null);

  const lineInfos = useMemo(() => parseDiffLines(hunk.hunkHeader, hunk.content), [hunk.hunkHeader, hunk.content]);
  const lineHtmls = useMemo(() => parseShikiLines(hunk.renderedHtml), [hunk.renderedHtml]);
  const shikiStyles = useMemo(() => extractShikiStyles(hunk.renderedHtml), [hunk.renderedHtml]);

  const splitRows = useMemo(() => {
    if (!lineHtmls || lineInfos.length === 0 || lineHtmls.length < lineInfos.length) return null;
    return buildSplitRows(lineInfos, lineHtmls);
  }, [lineInfos, lineHtmls]);

  // Fall back to static rendering if we can't parse
  if (!splitRows) {
    return <div dangerouslySetInnerHTML={{ __html: hunk.renderedHtml }} />;
  }

  const isInteractive = !!commentCallbacks;

  function handleAddComment(info: DiffLineInfo) {
    setActiveFormKey(`${info.lineNumber}:${info.side}`);
  }

  function handleSubmitComment(body: string, info: DiffLineInfo) {
    commentCallbacks?.onAddComment({
      filePath,
      line: info.lineNumber,
      side: info.side,
      body,
      hunkHeader: hunk.hunkHeader,
      codeSnippet: info.text,
      slideIndex,
    });
    setActiveFormKey(null);
  }

  // Build grid template columns based on interactive mode
  const gridTemplateColumns = isInteractive ? '1.25rem 3.5ch 1fr 1px 1.25rem 3.5ch 1fr' : '3.5ch 1fr 1px 3.5ch 1fr';

  return (
    <div
      className={shikiStyles.preClass}
      style={{
        ...shikiStyles.preStyle,
        overflow: 'auto',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.8125rem',
        lineHeight: '1.5',
      }}
    >
      <div
        className="split-diff-grid"
        style={{ display: 'grid', gridTemplateColumns, minWidth: '100%', width: 'max-content' }}
      >
        {splitRows.map((row, rowIdx) => (
          <SplitDiffRow
            key={rowIdx}
            row={row}
            filePath={filePath}
            pendingComments={pendingComments}
            activeFormKey={activeFormKey}
            isInteractive={isInteractive}
            onClickLine={handleAddComment}
            onSubmitComment={handleSubmitComment}
            onCancelForm={() => setActiveFormKey(null)}
            commentCallbacks={commentCallbacks}
            gridColumnCount={isInteractive ? 7 : 5}
          />
        ))}
      </div>
    </div>
  );
}

function SplitDiffRow({
  row,
  filePath,
  pendingComments,
  activeFormKey,
  isInteractive,
  onClickLine,
  onSubmitComment,
  onCancelForm,
  commentCallbacks,
  gridColumnCount,
}: {
  row: SplitRow;
  filePath: string;
  pendingComments: PendingReviewComment[];
  activeFormKey: string | null;
  isInteractive: boolean;
  onClickLine: (info: DiffLineInfo) => void;
  onSubmitComment: (body: string, info: DiffLineInfo) => void;
  onCancelForm: () => void;
  commentCallbacks?: CommentCallbacks;
  gridColumnCount: number;
}) {
  const leftInfo = row.left?.info ?? null;
  const rightInfo = row.right?.info ?? null;

  const leftLineNum = leftInfo?.baseLineNumber ?? leftInfo?.lineNumber ?? null;
  const rightLineNum = rightInfo?.headLineNumber ?? rightInfo?.lineNumber ?? null;

  const leftCellClass =
    leftInfo?.type === 'remove' ? 'split-diff-cell-remove' : !row.left ? 'split-diff-cell-empty' : '';
  const rightCellClass = rightInfo?.type === 'add' ? 'split-diff-cell-add' : !row.right ? 'split-diff-cell-empty' : '';

  // Check for active comment forms and pending comments
  const leftFormKey = leftInfo ? `${leftInfo.lineNumber}:${leftInfo.side}` : null;
  const rightFormKey = rightInfo ? `${rightInfo.lineNumber}:${rightInfo.side}` : null;
  const showLeftForm = isInteractive && leftFormKey && activeFormKey === leftFormKey;
  const showRightForm = isInteractive && rightFormKey && activeFormKey === rightFormKey;

  const leftComments =
    isInteractive && leftInfo
      ? pendingComments.filter((c) => c.line === leftInfo.lineNumber && c.side === 'LEFT' && c.filePath === filePath)
      : [];
  const rightComments =
    isInteractive && rightInfo
      ? pendingComments.filter((c) => c.line === rightInfo.lineNumber && c.side === 'RIGHT' && c.filePath === filePath)
      : [];

  return (
    <>
      {/* ── Left side ── */}
      {isInteractive && (
        <span
          className={`split-diff-comment-icon ${leftCellClass}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: leftInfo ? 'pointer' : 'default',
          }}
          onClick={() => leftInfo && onClickLine(leftInfo)}
        >
          {leftInfo && (
            <MessageSquarePlus
              style={{ width: '0.75rem', height: '0.75rem', color: '#58a6ff', opacity: 0 }}
              className="split-icon-hover"
            />
          )}
        </span>
      )}
      <span
        className={`split-diff-line-num ${leftCellClass}`}
        style={{
          textAlign: 'right',
          paddingRight: '0.5ch',
          color: 'rgba(255,255,255,0.3)',
          userSelect: 'none',
          fontSize: '0.75rem',
          cursor: isInteractive && leftInfo ? 'pointer' : 'default',
        }}
        onClick={() => isInteractive && leftInfo && onClickLine(leftInfo)}
      >
        {leftLineNum ?? ''}
      </span>
      <span
        className={`split-diff-code ${leftCellClass}`}
        style={{ paddingLeft: '0.5ch', paddingRight: '1ch', whiteSpace: 'pre' }}
      >
        {row.left ? <span dangerouslySetInnerHTML={{ __html: row.left.html }} /> : null}
      </span>

      {/* ── Separator ── */}
      <span style={{ background: 'oklch(0.35 0 0)' }} />

      {/* ── Right side ── */}
      {isInteractive && (
        <span
          className={`split-diff-comment-icon ${rightCellClass}`}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: rightInfo ? 'pointer' : 'default',
          }}
          onClick={() => rightInfo && onClickLine(rightInfo)}
        >
          {rightInfo && (
            <MessageSquarePlus
              style={{ width: '0.75rem', height: '0.75rem', color: '#58a6ff', opacity: 0 }}
              className="split-icon-hover"
            />
          )}
        </span>
      )}
      <span
        className={`split-diff-line-num ${rightCellClass}`}
        style={{
          textAlign: 'right',
          paddingRight: '0.5ch',
          color: 'rgba(255,255,255,0.3)',
          userSelect: 'none',
          fontSize: '0.75rem',
          cursor: isInteractive && rightInfo ? 'pointer' : 'default',
        }}
        onClick={() => isInteractive && rightInfo && onClickLine(rightInfo)}
      >
        {rightLineNum ?? ''}
      </span>
      <span
        className={`split-diff-code ${rightCellClass}`}
        style={{ paddingLeft: '0.5ch', paddingRight: '1ch', whiteSpace: 'pre' }}
      >
        {row.right ? <span dangerouslySetInnerHTML={{ __html: row.right.html }} /> : null}
      </span>

      {/* ── Comment forms / bubbles (span full width) ── */}
      {showLeftForm && leftInfo && (
        <div style={{ gridColumn: `1 / ${gridColumnCount + 1}` }}>
          <InlineCommentForm onSubmit={(body) => onSubmitComment(body, leftInfo)} onCancel={onCancelForm} />
        </div>
      )}
      {commentCallbacks &&
        leftComments.map((c) => (
          <div key={c.id} style={{ gridColumn: `1 / ${gridColumnCount + 1}` }}>
            <CommentBubble
              comment={c}
              onRemove={commentCallbacks.onRemoveComment}
              onEdit={commentCallbacks.onEditComment}
            />
          </div>
        ))}
      {showRightForm && rightInfo && (
        <div style={{ gridColumn: `1 / ${gridColumnCount + 1}` }}>
          <InlineCommentForm onSubmit={(body) => onSubmitComment(body, rightInfo)} onCancel={onCancelForm} />
        </div>
      )}
      {commentCallbacks &&
        rightComments.map((c) => (
          <div key={c.id} style={{ gridColumn: `1 / ${gridColumnCount + 1}` }}>
            <CommentBubble
              comment={c}
              onRemove={commentCallbacks.onRemoveComment}
              onEdit={commentCallbacks.onEditComment}
            />
          </div>
        ))}
    </>
  );
}

export function SplitDiffHunkGroup({
  filePath,
  hunks,
  pendingComments = [],
  slideIndex = 0,
  commentCallbacks,
}: SplitDiffHunkGroupProps) {
  const fileCommentCount = pendingComments.filter((c) => c.filePath === filePath).length;

  return (
    <div className="rounded-md border overflow-x-auto">
      <div className="bg-muted/50 px-3 py-2 font-mono text-xs text-muted-foreground border-b truncate flex items-center justify-between">
        <span>{filePath}</span>
        {commentCallbacks && fileCommentCount > 0 && (
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
          <SplitHunk
            hunk={hunk}
            filePath={filePath}
            pendingComments={pendingComments}
            slideIndex={slideIndex}
            commentCallbacks={commentCallbacks}
          />
        </div>
      ))}
    </div>
  );
}
