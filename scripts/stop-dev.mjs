#!/usr/bin/env node
import { execSync } from 'child_process';

function killPattern(pattern) {
  try {
    const pids = execSync(`pgrep -f "${pattern}"`, { encoding: 'utf8' })
      .trim()
      .split('\n')
      .filter(Boolean);
    for (const pid of pids) {
      try {
        process.kill(parseInt(pid, 10), 'SIGTERM');
        console.log(`Killed ${pattern} (PID ${pid})`);
      } catch {
        // ignore
      }
    }
  } catch {
    // no processes found
  }
}

killPattern('bun run --watch src/index.ts');
killPattern('next dev');
console.log('Done.');
