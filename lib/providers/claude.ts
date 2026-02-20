import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { LLMProvider } from '../provider';
import { resolveBinaryPath } from './shared';

function resolveClaudePath(): string {
  return resolveBinaryPath('claude', [`${os.homedir()}/.volta/bin/claude`]);
}

export const claudeProvider: LLMProvider = {
  name: 'claude',
  models: [
    { id: 'claude-opus-4-6', label: 'Opus 4.6' },
    { id: 'claude-sonnet-4-6', label: 'Sonnet 4.6' },
    { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5', quick: true },
  ],

  generate({ content, systemPrompt, model, thinking, onChunk }) {
    return new Promise((resolve, reject) => {
      const env = { ...process.env };
      delete env.CLAUDECODE;
      if (!thinking) env.MAX_THINKING_TOKENS = '0';

      const claudePath = resolveClaudePath();
      const args = [
        '-p',
        '--model', model,
        '--system-prompt', systemPrompt,
        '--tools', '',
        '--output-format', 'stream-json',
        '--include-partial-messages',
        '--no-session-persistence',
        ...(thinking ? ['--effort', 'high'] : []),
      ];
      const proc = spawn(claudePath, args, { env });

      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          reject(new Error(
            `Claude Code CLI not found at "${claudePath}". ` +
            'Install it from claude.ai/code and authenticate with `claude auth`.',
          ));
        } else {
          reject(err);
        }
      });

      const debugPath = path.join(os.tmpdir(), 'gnosis-last-response.txt');
      const debugStream = fs.createWriteStream(debugPath, { flags: 'w' });
      const startMs = Date.now();

      let lineBuffer = '';
      let fullText = '';
      let stderr = '';

      function processLine(line: string) {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
          const outer = JSON.parse(trimmed) as Record<string, unknown>;
          if (outer.type === 'result' && typeof outer.result === 'string') {
            fullText = outer.result;
            return;
          }
          if (outer.type !== 'stream_event') return;
          const inner = outer.event as Record<string, unknown> | undefined;
          if (!inner || inner.type !== 'content_block_delta') return;
          const delta = inner.delta as Record<string, unknown> | undefined;
          if (!delta) return;
          if (delta.type === 'thinking_delta' && typeof delta.thinking === 'string') {
            onChunk?.(delta.thinking, true);
          } else if (delta.type === 'text_delta' && typeof delta.text === 'string') {
            fullText += delta.text;
            onChunk?.(delta.text, false);
          }
        } catch {
          // not a JSON event — ignore
        }
      }

      proc.stdout.on('data', (chunk: Buffer) => {
        const str = chunk.toString();
        debugStream.write(str);
        lineBuffer += str;
        const newlineIdx = lineBuffer.lastIndexOf('\n');
        if (newlineIdx === -1) return;
        const completeLines = lineBuffer.slice(0, newlineIdx);
        lineBuffer = lineBuffer.slice(newlineIdx + 1);
        for (const line of completeLines.split('\n')) processLine(line);
        const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
        console.log(`[claude] +${elapsed}s fullText=${fullText.length} bytes`);
      });
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      proc.stdin.write(content);
      proc.stdin.end();

      proc.on('close', (code: number | null) => {
        debugStream.end();
        if (lineBuffer.trim()) processLine(lineBuffer);
        if (code === 0) {
          const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
          console.log(`[claude] CLI finished in ${elapsed}s, ${fullText.length} chars → ${debugPath}`);
          resolve(fullText.trim());
        } else {
          reject(new Error(`Claude CLI exited with code ${code}: ${stderr.slice(0, 300)}`));
        }
      });
    });
  },

  quick({ content, systemPrompt, model }) {
    return new Promise((resolve, reject) => {
      const env = { ...process.env };
      delete env.CLAUDECODE;
      env.MAX_THINKING_TOKENS = '0';

      const claudePath = resolveClaudePath();
      const args = [
        '-p',
        '--model', model,
        '--system-prompt', systemPrompt,
        '--tools', '',
        '--output-format', 'text',
        '--no-session-persistence',
      ];
      const proc = spawn(claudePath, args, { env });

      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          reject(new Error(
            `Claude Code CLI not found at "${claudePath}". ` +
            'Install it from claude.ai/code and authenticate with `claude auth`.',
          ));
        } else {
          reject(err);
        }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      proc.stdin.write(content);
      proc.stdin.end();

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Claude CLI exited with code ${code}: ${stderr.slice(0, 300)}`));
        }
      });
    });
  },
};
