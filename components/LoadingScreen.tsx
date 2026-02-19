'use client';

interface Props {
  message: string;
}

export function LoadingScreen({ message }: Props) {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-muted border-t-foreground" />
        <p className="text-muted-foreground max-w-sm">{message}</p>
      </div>
    </div>
  );
}
