import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { LLMProvider } from '../provider';
import { resolveBinaryPath } from './shared';

function resolveGeminiPath(): string {
  return resolveBinaryPath('gemini');
}

export const geminiProvider: LLMProvider = {
  name: 'gemini',
  models: [
    { id: 'gemini-3.1-pro-preview', label: 'Gemini 3.1 Pro' },
    { id: 'gemini-3-pro-preview', label: 'Gemini 3 Pro' },
    { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', quick: true },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro' },
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash' },
  ],

  generate({ content, systemPrompt, model, onChunk }) {
    return new Promise((resolve, reject) => {
      const geminiPath = resolveGeminiPath();
      // Pipe system prompt + content via stdin to avoid ARG_MAX limits.
      // Gemini prepends stdin to -p text, so we use a minimal -p marker.
      const args = [
        '-p', 'Respond according to the instructions provided via stdin.',
        '-m', model,
        '--output-format', 'stream-json',
        '--sandbox',
      ];
      const proc = spawn(geminiPath, args);

      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          reject(new Error(
            `Gemini CLI not found at "${geminiPath}". ` +
            'Install it from https://github.com/google-gemini/gemini-cli and authenticate.',
          ));
        } else {
          reject(err);
        }
      });

      const debugPath = path.join(os.tmpdir(), 'gnosis-gemini-last-response.txt');
      const debugStream = fs.createWriteStream(debugPath, { flags: 'w' });
      const startMs = Date.now();

      let lineBuffer = '';
      let fullText = '';
      let stderr = '';

      function processLine(line: string) {
        const trimmed = line.trim();
        if (!trimmed) return;
        try {
          const obj = JSON.parse(trimmed) as Record<string, unknown>;
          if (obj.type === 'message' && obj.role === 'assistant' && obj.delta === true) {
            const chunk = obj.content as string;
            if (typeof chunk === 'string') {
              fullText += chunk;
              onChunk?.(chunk, false);
            }
          }
          // 'result' event has only stats — fullText is accumulated from deltas
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
        console.log(`[gemini] +${elapsed}s fullText=${fullText.length} bytes`);
      });
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      // Pipe system prompt + content via stdin (avoids CLI arg length limits)
      proc.stdin.write(systemPrompt + '\n\n' + content);
      proc.stdin.end();

      proc.on('close', (code: number | null) => {
        debugStream.end();
        if (lineBuffer.trim()) processLine(lineBuffer);
        if (code === 0) {
          const elapsed = ((Date.now() - startMs) / 1000).toFixed(1);
          console.log(`[gemini] CLI finished in ${elapsed}s, ${fullText.length} chars → ${debugPath}`);
          resolve(fullText.trim());
        } else {
          const msg = stderr.slice(0, 300);
          if (msg.includes('ModelNotFoundError') || msg.includes('not found')) {
            reject(new Error(
              `Model "${model}" is not available on your account. Try a different model.`,
            ));
          } else {
            reject(new Error(`Gemini CLI exited with code ${code}: ${msg}`));
          }
        }
      });
    });
  },

  quick({ content, systemPrompt, model }) {
    return new Promise((resolve, reject) => {
      const geminiPath = resolveGeminiPath();
      const args = [
        '-p', 'Respond according to the instructions provided via stdin.',
        '-m', model,
        '--output-format', 'text',
        '--sandbox',
      ];
      const proc = spawn(geminiPath, args);

      proc.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'ENOENT') {
          reject(new Error(
            `Gemini CLI not found at "${geminiPath}". ` +
            'Install it from https://github.com/google-gemini/gemini-cli and authenticate.',
          ));
        } else {
          reject(err);
        }
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (chunk: Buffer) => { stdout += chunk.toString(); });
      proc.stderr.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });

      // Pipe system prompt + content via stdin
      proc.stdin.write(systemPrompt + '\n\n' + content);
      proc.stdin.end();

      proc.on('close', (code: number | null) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          const msg = stderr.slice(0, 300);
          if (msg.includes('ModelNotFoundError') || msg.includes('not found')) {
            reject(new Error(
              `Model "${model}" is not available on your account. Try a different model.`,
            ));
          } else {
            reject(new Error(`Gemini CLI exited with code ${code}: ${msg}`));
          }
        }
      });
    });
  },
};
