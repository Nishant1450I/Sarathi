import { spawn } from 'node:child_process';
import process from 'node:process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('\x1b[36m%s\x1b[0m', '=====================================================');
console.log('\x1b[36m%s\x1b[0m', '   SARATHI Full Platform Launcher (Dev Environment)  ');
console.log('\x1b[36m%s\x1b[0m', '   Backend:  http://localhost:4000                  ');
console.log('\x1b[36m%s\x1b[0m', '   Frontend: http://localhost:5173                  ');
console.log('\x1b[36m%s\x1b[0m', '=====================================================');

// Launch Backend
const backend = spawn('node', ['server/src/index.js'], {
  cwd: rootDir,
  stdio: 'inherit',
});

backend.on('error', (err) => {
  console.error('\x1b[31m[Backend Error]\x1b[0m', err);
});

// Launch Frontend using Vite directly via node (bypasses any PowerShell script execution policies)
const viteEntry = path.resolve(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const frontend = spawn('node', [viteEntry], {
  cwd: rootDir,
  stdio: 'inherit',
});

frontend.on('error', (err) => {
  console.error('\x1b[31m[Frontend Error]\x1b[0m', err);
});

function cleanup() {
  console.log('\n\x1b[33m%s\x1b[0m', 'Shutting down SARATHI services...');
  try { backend.kill(); } catch {}
  try { frontend.kill(); } catch {}
  process.exit();
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
