'use client';

import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

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
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    const id = `mermaid-${++idCounter}`;
    setError(null);

    mermaid.render(id, chart).then(({ svg }) => {
      if (ref.current) {
        ref.current.innerHTML = svg;
        // Mermaid sets an inline max-width — remove it so the SVG fills the container
        const svgEl = ref.current.querySelector('svg');
        if (svgEl) {
          svgEl.style.width = '100%';
          svgEl.style.maxWidth = '800px';
          svgEl.style.height = 'auto';
        }
      }
    }).catch((err) => {
      setError(err instanceof Error ? err.message : String(err));
    });
  }, [chart]);

  if (error) return null;

  return (
    <div className="rounded-md bg-muted/30 p-3">
      <div ref={ref} />
    </div>
  );
}
