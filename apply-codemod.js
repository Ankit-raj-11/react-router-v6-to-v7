#!/usr/bin/env node
/**
 * React Router v6 to v7 Custom Codemod Runner
 * Bypasses the broken/undocumented YAML workflow CLI and applies our transforms directly to a target repository.
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const GREEN = (s) => `\x1b[32m${s}\x1b[0m`;
const RED = (s) => `\x1b[31m${s}\x1b[0m`;
const YELLOW = (s) => `\x1b[33m${s}\x1b[0m`;
const DIM = (s) => `\x1b[2m${s}\x1b[0m`;
const BOLD = (s) => `\x1b[1m${s}\x1b[0m`;

const ROOT = __dirname;
const args = process.argv.slice(2);

let targetArg = null;
let reportFile = null;
let jsonReportFile = null;
let rollback = false;
let force = false;
let keepBackup = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--report') {
    reportFile = args[i+1] && !args[i+1].startsWith('--') ? args[i+1] : 'migration-report.html';
    if (args[i+1] && !args[i+1].startsWith('--')) i++;
  } else if (args[i] === '--report-json') {
    jsonReportFile = args[i+1];
    i++;
  } else if (args[i] === '--rollback') {
    rollback = true;
  } else if (args[i] === '--force') {
    force = true;
  } else if (args[i] === '--keep-backup') {
    keepBackup = true;
  } else if (!args[i].startsWith('--')) {
    targetArg = args[i];
  }
}

if (!targetArg) {
  console.error(RED('Error: Please provide a target directory.'));
  console.log(`Usage: node apply-codemod.js <path> [--rollback] [--force] [--keep-backup] [--report [file.html]] [--report-json <file.json>]`);
  process.exit(1);
}

const targetDir = path.resolve(process.cwd(), targetArg);
if (!fs.existsSync(targetDir)) {
  console.error(RED(`Error: Target directory does not exist: ${targetDir}`));
  process.exit(1);
}

const { hasBackup, createBackup, restoreBackup } = require('./src/rollback-manager');

if (rollback) {
  restoreBackup(targetDir, keepBackup);
  process.exit(0);
}

const TRANSFORMS = [
  path.join(ROOT, 'jssg', 'update-imports.ts'),
  path.join(ROOT, 'jssg', 'add-future-flags.ts'),
  path.join(ROOT, 'jssg', 'remove-json-defer.ts'),
];

console.log(BOLD(`\n🚀 Starting React Router v6 → v7 Codemod Pipeline`));
console.log(DIM(`Target: ${targetDir}`));

// 1. Package.json updater (Node 1)
const packageJsonPath = path.join(targetDir, 'package.json');
if (fs.existsSync(packageJsonPath)) {
  console.log(`\n📦 [Step 1] Updating package.json dependencies...`);
  const pkgStr = fs.readFileSync(packageJsonPath, 'utf8');
  try {
    const pkg = JSON.parse(pkgStr);
    let modified = false;
    for (const field of ['dependencies', 'devDependencies']) {
      if (pkg[field] && pkg[field]['react-router-dom']) {
        const v = pkg[field]['react-router-dom'];
        delete pkg[field]['react-router-dom'];
        pkg[field]['react-router'] = "^7.14.2";
        modified = true;
      }
    }
    if (modified) {
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 4) + '\n', 'utf8');
      console.log(GREEN(`  ✔ Replaced react-router-dom with react-router@7`));
    } else {
      console.log(DIM(`  - No react-router-dom dependency found to update.`));
    }
  } catch (e) {
    console.log(RED(`  ❌ Failed to parse package.json: ` + e.message));
  }
} else {
  console.log(YELLOW(`⚠ No package.json found in target directory.`));
}

// 2. Find all TS/TSX files
function walkDir(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(function (file) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        results = results.concat(walkDir(filePath));
      }
    } else {
      if (/\.(tsx?|jsx?)$/.test(filePath)) {
        results.push(filePath);
      }
    }
  });
  return results;
}

console.log(`\n🔍 Finding source files...`);
const files = walkDir(targetDir);
console.log(DIM(`  Found ${files.length} source files.`));

if (files.length === 0) {
  console.log(YELLOW(`⚠ No source files to process.`));
  process.exit(0);
}

if (!hasBackup(targetDir) || force) {
  console.log();
  createBackup(targetDir, files);
} else {
  console.log(YELLOW(`\n⚠ Backup already exists. Use --force to overwrite. Proceeding with existing backup.`));
}

// 3. Create bulk runner script to execute via ts-node
console.log(`\n⚙️ [Step 2-4] Applying AST transforms...`);
const tmpRunner = path.join(ROOT, '__apply_tmp.ts');

let importsCode = TRANSFORMS.map((t, i) => `import t${i} from '${t.replace(/\\/g, '/')}';`).join('\n');
let transformsArrayCode = `[${TRANSFORMS.map((_, i) => `t${i}`).join(', ')}]`;
let filesArrayCode = JSON.stringify(files.map(f => f.replace(/\\/g, '/')));

const statsDir = path.join(ROOT, '.codemod-stats');
if (!fs.existsSync(statsDir)) fs.mkdirSync(statsDir);
const statsFile = path.join(statsDir, 'stats.json');

const script = `
${importsCode}
import * as fs from 'fs';
import * as path from 'path';

const transforms = ${transformsArrayCode};
const files = ${filesArrayCode};

let changedCount = 0;
let fileStats = [];

(async () => {
  for (const file of files) {
    try {
      const original = fs.readFileSync(file, 'utf8');
      let currentSource = original;
      
      for (const transform of transforms) {
        const runTransform = transform.default || transform;
        currentSource = await Promise.resolve(runTransform({ path: file, source: currentSource }));
      }

      if (currentSource !== original) {
        fs.writeFileSync(file, currentSource, 'utf8');
        console.log('  \x1b[32m✔\x1b[0m Modified: ' + file);
        
        const originalLines = original.split('\\n').length;
        const newLines = currentSource.split('\\n').length;
        fileStats.push({
          file,
          added: newLines > originalLines ? newLines - originalLines : 0,
          removed: originalLines > newLines ? originalLines - newLines : 0,
          originalLines,
          newLines
        });
        changedCount++;
      }
    } catch (e) {
      console.log('  \x1b[31m❌\x1b[0m Error processing ' + file + ': ' + e.message);
    }
  }
  
  fs.writeFileSync(${JSON.stringify(statsFile.replace(/\\/g, '/'))}, JSON.stringify(fileStats), 'utf8');
  
  if (changedCount === 0) {
    console.log('  \x1b[2mNo files needed modification.\x1b[0m');
  } else {
    console.log('\\n🎉 Successfully transformed ' + changedCount + ' files.');
  }
})();
`;

fs.writeFileSync(tmpRunner, script, 'utf8');

try {
  const output = execSync(
    `npx ts-node --project "${path.join(ROOT, 'tsconfig.json')}" --transpile-only "${tmpRunner}"`,
    { cwd: ROOT, encoding: 'utf8', stdio: 'inherit' }
  );
  fs.unlinkSync(tmpRunner);
} catch (err) {
  try { fs.unlinkSync(tmpRunner); } catch (_) { }
  console.error(RED(`\n❌ Failed to run AST transforms.`));
}

// Generate reports if needed
if (reportFile || jsonReportFile) {
  const { collectFinalStats } = require('./src/stats-collector');
  const { validateTypeScript } = require('./src/ts-validator');
  const { verifyFalsePositives } = require('./src/false-positive-check');
  const { generateReport } = require('./src/report-generator');

  let fileStats = [];
  if (fs.existsSync(statsFile)) {
    fileStats = JSON.parse(fs.readFileSync(statsFile, 'utf8'));
    fs.unlinkSync(statsFile);
  }

  const finalStats = collectFinalStats(fileStats, files.length);
  const tsValidation = validateTypeScript(targetDir);
  const falsePositiveCheck = verifyFalsePositives(fileStats, targetDir);

  const fullReport = {
    finalStats,
    tsValidation,
    falsePositiveCheck,
    modifiedFiles: fileStats
  };

  generateReport(fullReport, reportFile, jsonReportFile);
  
  console.log(BOLD(`\n✅ Migration complete!`));
  if (reportFile) console.log(GREEN(`📊 Report saved: ${reportFile} (open with: start ${reportFile})`));
  if (jsonReportFile) console.log(GREEN(`JSON report saved: ${jsonReportFile}`));
  console.log(`TypeScript: ${tsValidation.status === 'passing' ? '✅ Pass' : tsValidation.message}`);
  console.log(`False positives: ${falsePositiveCheck.falsePositives} verified`);
} else {
  console.log(BOLD(`\n✅ Migration pipeline complete!\n`));
}
