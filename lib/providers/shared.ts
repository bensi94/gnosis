import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';

const cache = new Map<string, string>();

export function resolveBinaryPath(name: string, extraCandidates: string[] = []): string {
  const cached = cache.get(name);
  if (cached) return cached;

  if (process.platform === 'win32') {
    try {
      const result = execFileSync('where.exe', [name], { encoding: 'utf-8', timeout: 5000 }).trim().split('\n')[0].trim();
      if (result) { cache.set(name, result); return result; }
    } catch { /* fall through */ }
  } else {
    for (const shell of ['/bin/zsh', '/bin/bash']) {
      if (!fs.existsSync(shell)) continue;
      try {
        const result = execFileSync(shell, ['-lc', `which ${name}`], { encoding: 'utf-8', timeout: 5000 }).trim();
        if (result) { cache.set(name, result); return result; }
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
    if (fs.existsSync(p)) { cache.set(name, p); return p; }
  }

  cache.set(name, name);
  return name;
}
