#!/usr/bin/env node
/**
 * Free the Firebase emulator ports before a run.
 *
 * The Firestore emulator is a Java child process, and on Windows it regularly
 * survives the SIGINT that `firebase emulators:exec` sends on shutdown. The next
 * run then dies with "port taken". This clears any listener on the ports named
 * in firebase.json so a rerun is never blocked by the previous one.
 */

import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'app');
const config = JSON.parse(readFileSync(join(appDir, 'firebase.json'), 'utf8'));

const ports = Object.values(config.emulators ?? {})
  .map(entry => (entry && typeof entry === 'object' ? entry.port : null))
  .filter(port => typeof port === 'number');

/** Resolve once we know whether anything is listening on `port`. */
function isBusy(port) {
  return new Promise(resolve => {
    const socket = createConnection({ host: '127.0.0.1', port });
    const done = busy => {
      socket.destroy();
      resolve(busy);
    };
    socket.setTimeout(500);
    socket.once('connect', () => done(true));
    socket.once('timeout', () => done(false));
    socket.once('error', () => done(false));
  });
}

function pidsOnPort(port) {
  try {
    if (process.platform === 'win32') {
      const out = execFileSync('netstat', ['-ano', '-p', 'TCP'], { encoding: 'utf8' });
      return [
        ...new Set(
          out
            .split(/\r?\n/)
            .filter(line => line.includes(`:${port} `) && line.includes('LISTENING'))
            .map(line => line.trim().split(/\s+/).pop())
            .filter(pid => pid && pid !== '0'),
        ),
      ];
    }
    const out = execFileSync('lsof', ['-ti', `tcp:${port}`], { encoding: 'utf8' });
    return out.split(/\s+/).filter(Boolean);
  } catch {
    return [];
  }
}

function kill(pid) {
  try {
    if (process.platform === 'win32') {
      execFileSync('taskkill', ['/PID', pid, '/F', '/T'], { stdio: 'ignore' });
    } else {
      process.kill(Number(pid), 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

let freed = 0;
for (const port of ports) {
  if (!(await isBusy(port))) continue;
  for (const pid of pidsOnPort(port)) {
    if (kill(pid)) {
      console.log(`[emulators] freed port ${port} (pid ${pid})`);
      freed++;
    }
  }
}

if (freed > 0) {
  // Give the OS a moment to actually release the sockets.
  await new Promise(resolve => setTimeout(resolve, 1500));
}
