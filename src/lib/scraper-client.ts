/**
 * Scraper Client — subprocess approach
 * ========================================
 * Spawns a Python worker subprocess for each scrape request.
 * Uses spawn() for proper stdin handling.
 */

import { spawn } from 'child_process';

const PYTHON_BIN = process.env.PYTHON_BIN || 'python3';
const WORKER_SCRIPT = '/home/z/my-project/NovelReaderAi/scraper-service/worker.py';

export interface ScraperResponse {
  success: boolean;
  status: number;
  url: string;
  html: string;
  search_results?: ScraperSearchResult[];
  time_ms: number;
  error?: string;
}

export interface ScraperSearchResult {
  title: string;
  url: string;
  cover: string;
  source_id: string;
}

interface WorkerRequest {
  url: string;
  timeout: number;
  mode: string;
  max_retries: number;
}

/**
 * Run a Scrapling worker subprocess to fetch a URL.
 */
export async function scraperFetch(
  url: string,
  options?: {
    timeout?: number;
    mode?: 'scrape' | 'search';
    maxRetries?: number;
  }
): Promise<ScraperResponse> {
  const payload: WorkerRequest = {
    url,
    timeout: options?.timeout || 45,
    mode: options?.mode || 'scrape',
    max_retries: options?.maxRetries ?? 2,
  };

  return new Promise((resolve) => {
    const child = spawn(PYTHON_BIN, [WORKER_SCRIPT]);
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
    child.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

    child.stdin.write(JSON.stringify(payload));
    child.stdin.end();

    const timeoutMs = (payload.timeout * payload.max_retries + 60) * 1000;
    const timer = setTimeout(() => {
      child.kill();
      resolve({
        success: false,
        status: 0,
        url,
        html: '',
        time_ms: 0,
        error: 'Worker timeout',
      });
    }, timeoutMs);

    child.on('close', (code) => {
      clearTimeout(timer);

      if (stderr) {
        // Log non-error stderr (Scrapling INFO messages)
        const lines = stderr.trim().split('\n');
        const errors = lines.filter(l => l.includes('ERROR') || l.includes('Traceback'));
        if (errors.length > 0) {
          console.log(`[Scraper] Worker stderr: ${errors.slice(-3).join('; ')}`);
        }
      }

      try {
        const data = JSON.parse(stdout);
        resolve(data as ScraperResponse);
      } catch {
        resolve({
          success: false,
          status: 0,
          url,
          html: '',
          time_ms: 0,
          error: `Worker parse error (exit ${code})`,
        });
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({
        success: false,
        status: 0,
        url,
        html: '',
        time_ms: 0,
        error: err.message,
      });
    });
  });
}

/**
 * Check if the Python Scrapling worker can be executed.
 */
export async function isScraperAvailable(): Promise<boolean> {
  try {
    const result = await scraperFetch('https://example.com', {
      timeout: 10,
      mode: 'scrape',
      maxRetries: 1,
    });
    return result.success === true || result.status > 0;
  } catch {
    return false;
  }
}
