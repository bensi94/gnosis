import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  themeVariables: {
    fontSize: '10px',
    fontFamily: 'ui-sans-serif, system-ui, -apple-system, sans-serif',
  },
});

let idCounter = 0;

interface Props {
  chart: string;
}

export function MermaidDiagram({ chart }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [svgHtml, setSvgHtml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!ref.current) return;

    const id = `mermaid-${++idCounter}`;
    setError(null);

    mermaid
      .render(id, chart)
      .then(({ svg }) => {
        setSvgHtml(svg);
        if (ref.current) {
          ref.current.innerHTML = svg;
          const svgEl = ref.current.querySelector('svg');
          if (svgEl) {
            svgEl.style.width = '100%';
            svgEl.style.maxWidth = '800px';
            svgEl.style.height = 'auto';
          }
        }
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
      });
  }, [chart]);

  if (error) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group relative w-full rounded-md bg-muted/30 p-3 cursor-pointer transition-colors hover:bg-muted/50 text-left max-h-[600px] overflow-y-auto"
      >
        <div ref={ref} />
        <span className="absolute top-2 right-2 rounded-md bg-background/60 p-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Maximize2 className="h-3.5 w-3.5 text-muted-foreground" />
        </span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[90vw] max-h-[90vh] flex flex-col">
          <DialogTitle className="sr-only">Diagram</DialogTitle>
          <div
            className="flex-1 overflow-auto flex items-center justify-center p-4 mermaid-fullscreen"
            dangerouslySetInnerHTML={svgHtml ? { __html: svgHtml } : undefined}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
