import { useEffect, useRef, useState } from 'react';
import { Brain, GitPullRequest, FileCode, Loader, Globe } from 'lucide-react';

interface Props {
  message: string;
  streamingText?: string;
  activeToolCall?: string | null;
}

const phases = [
  { icon: GitPullRequest, text: 'Fetching PR data…' },
  { icon: FileCode, text: 'Building context…' },
  { icon: Brain, text: 'Analyzing code…' },
  { icon: Loader, text: 'Generating review…' },
];

export function LoadingScreen({ message, streamingText, activeToolCall }: Props) {
  const preRef = useRef<HTMLPreElement>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);

  useEffect(() => {
    if (preRef.current) {
      preRef.current.scrollTop = preRef.current.scrollHeight;
    }
  }, [streamingText]);

  useEffect(() => {
    const interval = setInterval(() => {
      setPhaseIndex((i) => (i < phases.length - 1 ? i + 1 : i));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Once we have streaming text, jump to last phase
  useEffect(() => {
    if (streamingText) setPhaseIndex(phases.length - 1);
  }, [streamingText]);

  const phase = phases[phaseIndex];
  const PhaseIcon = phase.icon;

  return (
    <div className="flex min-h-screen items-center justify-center p-8 relative">
      {/* Radial gradient background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, var(--accent-glow) 0%, transparent 60%)',
        }}
      />

      <div className="flex flex-col items-center gap-6 text-center w-full max-w-2xl relative z-10">
        {/* Concentric rings with brain icon */}
        <div className="relative flex items-center justify-center w-28 h-28">
          {/* Rings */}
          <div className="loading-ring absolute inset-0 rounded-full border-2 border-primary/40" />
          <div className="loading-ring-delayed absolute inset-2 rounded-full border-2 border-primary/30" />
          <div className="loading-ring-delayed-2 absolute inset-4 rounded-full border-2 border-primary/20" />
          {/* Center icon */}
          <Brain className="h-10 w-10 text-primary" />
        </div>

        {/* Phase indicator */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <PhaseIcon className="h-4 w-4 animate-pulse" />
          <span className="text-sm">{phase.text}</span>
        </div>

        {/* Phase dots */}
        <div className="flex gap-2">
          {phases.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-500 ${
                i <= phaseIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {activeToolCall && (
          <div className="flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs text-primary animate-pulse">
            <Globe className="h-3 w-3" />
            <span>{activeToolCall}</span>
          </div>
        )}

        <p className="text-xs text-muted-foreground/60">{message}</p>

        {streamingText && (
          <pre
            ref={preRef}
            className="w-full text-left text-xs text-muted-foreground/70 font-mono rounded-lg p-4 overflow-y-auto max-h-48 whitespace-pre-wrap break-all border border-primary/20 bg-primary/5"
            style={{ boxShadow: '0 0 20px var(--accent-glow)' }}
          >
            {streamingText}
          </pre>
        )}
      </div>
    </div>
  );
}
