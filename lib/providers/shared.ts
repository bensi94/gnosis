import { execFileSync, spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';

const cache = new Map<string, string>();

function cacheAndReturn(name: string, resolved: string): string {
  cache.set(name, resolved);
  return resolved;
}

/**
 * Resolve the absolute path to a CLI binary. On macOS/Linux the user's
 * login shell is invoked so that profile-managed paths (Homebrew, Volta,
 * nvm, etc.) are visible even when the app is launched from Finder/Dock.
 */
export function resolveBinaryPath(name: string, extraCandidates: string[] = []): string {
  const cached = cache.get(name);
  if (cached) return cached;

  if (process.platform === 'win32') {
    try {
      const raw = execFileSync('where.exe', [name], { encoding: 'utf-8', timeout: 5000 });
      const result = raw.trim().split('\n')[0].trim();
      if (result) return cacheAndReturn(name, result);
    } catch { /* fall through */ }
  } else {
    for (const shell of ['/bin/zsh', '/bin/bash']) {
      if (!fs.existsSync(shell)) continue;
      try {
        const result = execFileSync(shell, ['-lc', `which ${name}`], { encoding: 'utf-8', timeout: 5000 }).trim();
        if (result) return cacheAndReturn(name, result);
      } catch { /* try next */ }
    }
  }

  const home = os.homedir();
  const candidates = [
    `/usr/local/bin/${name}`,
    `/opt/homebrew/bin/${name}`,
    `${home}/.npm-global/bin/${name}`,
    `${home}/.nvm/current/bin/${name}`,
    ...extraCandidates,
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return cacheAndReturn(name, p);
  }

  return cacheAndReturn(name, name);
}

// ── Shared CLI spawn helpers ────────────────────────────────────

export interface StreamingCliOptions {
  /** Absolute path to the CLI binary */
  binPath: string;
  /** CLI name for log prefix and error messages (e.g. "claude", "gemini") */
  cliName: string;
  /** Arguments to pass to the CLI */
  args: string[];
  /** Content piped to stdin */
  stdinContent: string;
  /** Called for each streaming chunk */
  processLine: (line: string) => void;
  /** Environment overrides (merged with process.env) */
  env?: NodeJS.ProcessEnv;
  /** Install instructions shown when CLI is not found */
  installHint: string;
  /** Custom error handler for non-zero exit codes. Return an Error or undefined to use default. */
  handleExitError?: (stderr: string) => Error | undefined;
}

/**
 * Spawn a CLI process with streaming stdout line-buffering, debug logging,
 * and ENOENT handling. Used by both Claude and Gemini providers.
 */
export function spawnCliStreaming(opts: StreamingCliOptions): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(opts.binPath, opts.args, { env: opts.env });
    const tag = `[${opts.cliName}]`;

    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(new Error(
          `${opts.cliName} CLI not found at "${opts.binPath}". ${opts.installHint}`,
        ));
      } else {
        reject(err);
      }
    });

    const debugPath = path.join(os.tmpdir(), `gnosis-${opts.cliName}-last-response.txt`);
    const debugStream = fs.createWriteStream(debugPath, { flags: 'w' });
    const startMs = Date.now();

    let lineBuffer = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => {
      const str = chunk.toString();
      debugStream.write(str);
      lineBuffer += str;
      const newlineIdx = lineBuffer.lastIndexOf('\n');
      if (newlineIdx === -1) return;
      const completeLines = lineBuffer.slice(0, newlineIdx);
      lineBuffer = lineBuffer.slice(newlineIdx + 1);
      for (const line of completeLines.split('\n')) opts.processLine(line);
      const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
      console.log(`${tag} +${elapsed}s streaming...`);
    });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.stdin.write(opts.stdinContent);
    proc.stdin.end();

    proc.on('close', (code: number | null) => {
      debugStream.end();
      if (lineBuffer.trim()) opts.processLine(lineBuffer);
      if (code === 0) {
        const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
        console.log(`${tag} CLI finished in ${elapsed}s -> ${debugPath}`);
        resolve();
      } else {
        const custom = opts.handleExitError?.(stderr);
        reject(custom ?? new Error(`${opts.cliName} CLI exited with code ${code}: ${stderr.slice(0, 300)}`));
      }
    });
  });
}

export interface QuickCliOptions {
  binPath: string;
  cliName: string;
  args: string[];
  stdinContent: string;
  env?: NodeJS.ProcessEnv;
  installHint: string;
  handleExitError?: (stderr: string) => Error | undefined;
}

/**
 * Spawn a CLI process collecting all stdout as text. Used for non-streaming
 * calls like smart imports.
 */
export function spawnCliQuick(opts: QuickCliOptions): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(opts.binPath, opts.args, { env: opts.env });

    proc.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'ENOENT') {
        reject(new Error(
          `${opts.cliName} CLI not found at "${opts.binPath}". ${opts.installHint}`,
        ));
      } else {
        reject(err);
      }
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
    proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

    proc.stdin.write(opts.stdinContent);
    proc.stdin.end();

    proc.on('close', (code: number | null) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        const custom = opts.handleExitError?.(stderr);
        reject(custom ?? new Error(`${opts.cliName} CLI exited with code ${code}: ${stderr.slice(0, 300)}`));
      }
    });
  });
}
