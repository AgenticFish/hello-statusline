/**
 * hello-statusline — A minimal Claude Code statusLine plugin.
 *
 * This is the companion project for the "Dissecting Claude HUD" article series.
 * It demonstrates the core concepts of building a statusLine plugin:
 *
 *   1. Read JSON from stdin (what Claude Code sends every ~300ms)
 *   2. Extract useful information (model, context usage, cost)
 *   3. Render colored text to stdout (using ANSI escape sequences)
 *
 * The entire plugin is ~100 lines. Zero external dependencies.
 */

// ─── ANSI Color Helpers ──────────────────────────────────────────────

const RESET = '\x1b[0m';
const DIM = '\x1b[2m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';

// ─── stdin JSON Type ─────────────────────────────────────────────────

interface StdinData {
  model?: { display_name?: string };
  context_window?: {
    context_window_size?: number;
    current_usage?: {
      input_tokens?: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    used_percentage?: number;
  };
  cost?: { total_cost_usd?: number };
}

// ─── Read stdin ──────────────────────────────────────────────────────

function readStdin(): Promise<StdinData | null> {
  return new Promise((resolve) => {
    // If stdin is a terminal (no pipe), there's no data to read.
    if (process.stdin.isTTY) {
      resolve(null);
      return;
    }

    let raw = '';

    // Give up if no data arrives within 250ms.
    const timer = setTimeout(() => resolve(null), 250);

    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      raw += chunk;
      try {
        const parsed = JSON.parse(raw);
        clearTimeout(timer);
        resolve(parsed);
      } catch {
        // Incomplete JSON — wait for more data.
      }
    });
    process.stdin.on('end', () => {
      clearTimeout(timer);
      try { resolve(JSON.parse(raw)); } catch { resolve(null); }
    });
  });
}

// ─── Calculate context percentage ────────────────────────────────────

function getContextPercent(data: StdinData): number {
  // Prefer native percentage (Claude Code v2.1.6+)
  if (data.context_window?.used_percentage != null) {
    return Math.round(data.context_window.used_percentage);
  }

  // Fallback: calculate from token counts
  const usage = data.context_window?.current_usage;
  const size = data.context_window?.context_window_size;
  if (!usage || !size || size <= 0) return 0;

  const total = (usage.input_tokens ?? 0)
    + (usage.cache_creation_input_tokens ?? 0)
    + (usage.cache_read_input_tokens ?? 0);
  return Math.min(100, Math.round((total / size) * 100));
}

// ─── Render a progress bar ───────────────────────────────────────────

function progressBar(percent: number, width: number = 10): string {
  const color = percent >= 85 ? RED : percent >= 70 ? YELLOW : GREEN;
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  return `${color}${'█'.repeat(filled)}${DIM}${'░'.repeat(empty)}${RESET}`;
}

// ─── Main ────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const data = await readStdin();
  if (!data) return;

  // 1. Model name
  const model = data.model?.display_name ?? 'Unknown';

  // 2. Context usage
  const percent = getContextPercent(data);
  const percentColor = percent >= 85 ? RED : percent >= 70 ? YELLOW : GREEN;

  // 3. Cost (optional)
  const cost = data.cost?.total_cost_usd;
  const costStr = cost != null ? ` │ ${DIM}$${cost.toFixed(2)}${RESET}` : '';

  // Render two lines:
  // Line 1: [Model]
  // Line 2: Context bar + percentage + cost
  console.log(`${RESET}${CYAN}[${model}]${RESET}`);
  console.log(`${RESET}${DIM}Context${RESET} ${progressBar(percent)} ${percentColor}${percent}%${RESET}${costStr}`);
}

main().catch(() => {
  // Silent degradation: never crash the terminal.
});
