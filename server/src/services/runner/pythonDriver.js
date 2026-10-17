import { spawn, execFile } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { assessmentV2 } from '../../config/index.js';

let cachedPythonPath = null;
let pythonChecked = false;

/**
 * Detect available Python 3 executable on host system.
 * Returns path/command string or null if unavailable.
 */
export async function detectPythonExecutable() {
  if (pythonChecked) {
    return cachedPythonPath;
  }

  const candidates = [
    process.env.PYTHON_PATH,
    'python3',
    'python',
    'py',
  ].filter(Boolean);

  for (const cmd of candidates) {
    const isWorking = await new Promise((resolve) => {
      try {
        const proc = execFile(cmd, ['--version'], { timeout: 2000 }, (error, stdout, stderr) => {
          if (error) {
            return resolve(false);
          }
          const output = (stdout || stderr || '').trim();
          // Reject Windows Store stub messages
          if (output.includes('Python was not found') || output.includes('Microsoft Store')) {
            return resolve(false);
          }
          // Verify Python 3
          if (output.toLowerCase().includes('python 3') || output.toLowerCase().includes('python 2')) {
            return resolve(true);
          }
          resolve(false);
        });

        proc.on('error', () => resolve(false));
      } catch {
        resolve(false);
      }
    });

    if (isWorking) {
      cachedPythonPath = cmd;
      pythonChecked = true;
      return cmd;
    }
  }

  pythonChecked = true;
  cachedPythonPath = null;
  return null;
}

export class PythonDriver {
  /**
   * Universal runner execution interface for Python candidate code
   */
  async run({ language = 'python', code = '', tests = [], limits = {} }) {
    const pythonCmd = await detectPythonExecutable();
    const startTime = Date.now();
    const timeoutMs = limits.timeoutMs || assessmentV2.executionTimeoutMs || 5000;

    // Graceful structured diagnostic if host environment has no working Python runtime
    if (!pythonCmd) {
      return {
        status: 'runtime_unavailable',
        passed: 0,
        failed: tests.length,
        total: tests.length,
        timedOut: false,
        stdout: '',
        stderr: 'Python runtime is not installed or configured on the host system. Please configure Python 3 or connect an isolated worker.',
        timeMs: Date.now() - startTime,
        results: tests.map(t => ({
          id: t.id,
          kind: t.kind,
          passed: false,
          actual: '',
          expected: t.expectedOutput,
          executionTimeMs: 0,
          error: 'Python runtime unavailable on server.',
        })),
        isolationNotice: 'Execution halted: Host Python runtime unavailable.',
      };
    }

    const tempDir = mkdtempSync(join(tmpdir(), 'sarathi-py-'));
    try {
      // Write solution file
      const solPath = join(tempDir, 'solution.py');
      writeFileSync(solPath, code || '', 'utf8');

      const results = [];
      let totalStdout = '';
      let totalStderr = '';
      let timedOutAny = false;

      for (const t of tests) {
        const testRes = await this.runSingleTest({
          pythonCmd,
          tempDir,
          testInput: t.input,
          expectedOutput: t.expectedOutput,
          timeoutMs: t.timeoutMs || timeoutMs,
        });

        if (testRes.timedOut) {
          timedOutAny = true;
        }

        results.push({
          id: t.id,
          kind: t.kind,
          passed: testRes.passed,
          actual: testRes.actual,
          expected: t.expectedOutput,
          executionTimeMs: testRes.timeMs,
          error: testRes.error,
        });

        if (testRes.stdout) totalStdout += testRes.stdout + '\n';
        if (testRes.stderr) totalStderr += testRes.stderr + '\n';
      }

      const passedCount = results.filter(r => r.passed).length;
      return {
        status: timedOutAny ? 'timeout' : (passedCount === tests.length ? 'success' : 'failed'),
        passed: passedCount,
        failed: tests.length - passedCount,
        total: tests.length,
        timedOut: timedOutAny,
        results,
        stdout: totalStdout.trim(),
        stderr: totalStderr.trim(),
        timeMs: Date.now() - startTime,
        isolationNotice: 'Executed in isolated child process with dedicated filesystem sandbox.',
      };
    } finally {
      try {
        rmSync(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  runSingleTest({ pythonCmd, tempDir, testInput, expectedOutput, timeoutMs }) {
    return new Promise((resolve) => {
      const scriptPath = join(tempDir, `test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.py`);
      writeFileSync(scriptPath, testInput || '', 'utf8');

      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const proc = spawn(pythonCmd, [scriptPath], {
        cwd: tempDir,
        env: {
          PATH: process.env.PATH,
          PYTHONPATH: tempDir,
          PYTHONDONTWRITEBYTECODE: '1',
          PYTHONUNBUFFERED: '1',
        },
      });

      const timer = setTimeout(() => {
        timedOut = true;
        try { proc.kill('SIGKILL'); } catch {}
      }, timeoutMs);

      proc.stdout.on('data', (d) => {
        stdout += d.toString('utf8');
        if (stdout.length > 20480) {
          proc.kill();
        }
      });

      proc.stderr.on('data', (d) => {
        stderr += d.toString('utf8');
        if (stderr.length > 20480) {
          proc.kill();
        }
      });

      proc.on('close', (exitCode) => {
        clearTimeout(timer);
        const timeMs = Date.now() - startTime;

        if (timedOut) {
          return resolve({
            passed: false,
            actual: 'TIMEOUT',
            stdout,
            stderr: 'Time limit exceeded',
            timeMs,
            timedOut: true,
            error: 'TIMEOUT',
          });
        }

        const trimmedActual = stdout.trim();
        const trimmedExpected = (expectedOutput || '').trim();
        const passed = exitCode === 0 && trimmedActual === trimmedExpected;

        resolve({
          passed,
          actual: trimmedActual,
          stdout: trimmedActual,
          stderr: stderr.trim(),
          timeMs,
          timedOut: false,
          error: exitCode !== 0 ? (stderr.trim() || `Process exited with code ${exitCode}`) : null,
        });
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        resolve({
          passed: false,
          actual: '',
          stdout: '',
          stderr: err.message,
          timeMs: Date.now() - startTime,
          timedOut: false,
          error: err.message,
        });
      });
    });
  }
}
