#!/usr/bin/env node
// tests/test-runner.js
// Directly invokes transform functions via ts-node — no codemod CLI required.
// This approach is more reliable, faster, and gives exact output for diffing.

const { execSync } = require('child_process');
const fs   = require('fs');
const path = require('path');

// ─── ANSI Color Helpers ──────────────────────────────────────────────────────
const GREEN  = (s) => `\x1b[32m${s}\x1b[0m`;
const RED    = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const BOLD   = (s) => `\x1b[1m${s}\x1b[0m`;
const DIM    = (s) => `\x1b[2m${s}\x1b[0m`;

// ─── Config ──────────────────────────────────────────────────────────────────
const ROOT         = path.resolve(__dirname, '..');
const INPUT_DIR    = path.join(ROOT, 'tests', 'fixtures', 'input');
const EXPECTED_DIR = path.join(ROOT, 'tests', 'fixtures', 'expected');

const TRANSFORMS = [
  { name: 'update-imports',    file: path.join(ROOT, 'jssg', 'update-imports.ts')    },
  { name: 'add-future-flags',  file: path.join(ROOT, 'jssg', 'add-future-flags.ts')  },
  { name: 'remove-json-defer', file: path.join(ROOT, 'jssg', 'remove-json-defer.ts') },
];

// ─── Runner ───────────────────────────────────────────────────────────────────

/**
 * Runs a TypeScript transform on an input file using ts-node via a child process.
 * Creates an inline runner script and pipes the result back to us.
 * This completely avoids the codemod CLI and its argument parsing restrictions.
 */
function runTransform(transformFile, inputFile) {
  const normalizedTransform = transformFile.replace(/\\/g, '\\\\');
  const normalizedInput     = inputFile.replace(/\\/g, '\\\\');

  // Write a tiny TypeScript runner to a temp file and execute with ts-node.
  // This is the most reliable approach on Windows — avoids ESM/CJS stdin pipe issues.
  const tmpFile = path.join(ROOT, '__runner_tmp.ts');

  const script = `
import transform from '${normalizedTransform.replace(/\\/g, '/')}';
import * as fs from 'fs';

const source   = fs.readFileSync('${normalizedInput.replace(/\\/g, '/')}', 'utf8');
const fileInfo = { path: '${normalizedInput.replace(/\\/g, '/')}', source };

(async () => {
  const result = await Promise.resolve(transform(fileInfo));
  process.stdout.write(typeof result === 'string' ? result : source);
})();
`;

  fs.writeFileSync(tmpFile, script, 'utf8');

  try {
    const output = execSync(
      `npx ts-node --project "${path.join(ROOT, 'tsconfig.json')}" --transpile-only "${tmpFile}"`,
      { cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
    fs.unlinkSync(tmpFile);
    return { success: true, output: output.trim() };
  } catch (err) {
    try { fs.unlinkSync(tmpFile); } catch (_) { /* ignore */ }
    return {
      success: false,
      output:  (err.stdout || '').trim(),
      error:   (err.stderr || err.message || '').trim().split('\n').slice(0, 4).join(' | '),
    };
  }
}

/**
 * Minimal line-level diff for human-readable FAIL output.
 */
function diffSummary(actual, expected) {
  const aLines = actual.split('\n');
  const eLines = expected.split('\n');
  const maxLen = Math.max(aLines.length, eLines.length);

  for (let i = 0; i < maxLen; i++) {
    const a = aLines[i] ?? '(missing)';
    const e = eLines[i] ?? '(missing)';
    if (a !== e) {
      return [
        `  ${DIM(`Line ${i + 1}:`)}`,
        `  ${RED('-')} ${a}`,
        `  ${GREEN('+')} ${e}`,
      ].join('\n');
    }
  }
  return '  (outputs match character-for-character — possible trailing whitespace diff)';
}

// ─── Main ─────────────────────────────────────────────────────────────────────
console.log(BOLD('\n━━━ React Router v6→v7 Codemod Test Runner ━━━\n'));

let passed = 0;
let failed = 0;

for (const transform of TRANSFORMS) {
  // Find fixture with matching basename (e.g. add-future-flags.tsx or .ts)
  const allInputs = fs.readdirSync(INPUT_DIR).filter(f => /\.(tsx?|jsx?)$/.test(f));
  const matchingInputs = allInputs
    .filter(f => path.basename(f, path.extname(f)) === transform.name)
    .map(f => path.join(INPUT_DIR, f));

  if (matchingInputs.length === 0) {
    console.log(YELLOW(`⚠  ${transform.name}: SKIPPED — no matching fixture in tests/fixtures/input/`));
    continue;
  }

  for (const inputFile of matchingInputs) {
    const label        = `${transform.name} [${path.basename(inputFile)}]`;
    const expectedFile = path.join(EXPECTED_DIR, path.basename(inputFile));

    if (!fs.existsSync(expectedFile)) {
      console.log(YELLOW(`⚠  ${label}: SKIPPED — no matching file in tests/fixtures/expected/`));
      continue;
    }

    const { success, output, error } = runTransform(transform.file, inputFile);

    if (!success && !output) {
      console.log(RED(`❌ ${label}: ERROR — transform threw an exception`));
      console.log(DIM(`   ${error}`));
      failed++;
      continue;
    }

    const expected = fs.readFileSync(expectedFile, 'utf8').trim();
    const actual   = output.trim();

    if (actual === expected) {
      console.log(GREEN(`✅ ${label}: PASS`));
      passed++;
    } else {
      console.log(RED(`❌ ${label}: FAIL`));
      console.log(diffSummary(actual, expected));
      failed++;
    }
  }
}

// ─── Summary ─────────────────────────────────────────────────────────────────
const total = passed + failed;
console.log(BOLD(`\n━━━ Summary: ${passed}/${total} tests passing ━━━\n`));

if (failed > 0) {
  console.log(RED(`${failed} test(s) failed. Review diffs above.\n`));
  process.exit(1);
} else {
  console.log(GREEN(`All tests passed. Zero false positives confirmed.\n`));
  process.exit(0);
}
