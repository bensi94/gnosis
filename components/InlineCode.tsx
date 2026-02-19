/**
 * Renders plain text with backtick-delimited spans as inline <code> elements.
 * e.g. "check the `expires_at` field" → check the <code>expires_at</code> field
 */
export function InlineCode({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <code
            key={i}
            className="font-mono text-[0.85em] bg-muted/70 rounded px-1 py-0.5 text-foreground"
          >
            {part}
          </code>
        ) : (
          part
        )
      )}
    </>
  );
}
