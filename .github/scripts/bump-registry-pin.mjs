#!/usr/bin/env node
/*
 * Bump the ClaudeRegistry commit pin for this plugin, and open or update the PR.
 *
 * Runs LOCALLY, on your machine, using the `gh` login you already have. It is
 * deliberately not a CI job: the GITHUB_TOKEN of a workflow is scoped to the
 * repository it runs in, so crossing over to another owner's repo would require
 * storing a personal access token in this repo's secrets. Trading a stored
 * write-credential for the convenience of not typing one command is a bad deal,
 * and opening a pull request on someone else's repository unattended is exactly
 * the step that benefits from a human being present.
 *
 * What it does, which is what was previously done by hand:
 *   1. refuses to run unless local HEAD is already pushed
 *   2. syncs your marketplace fork with upstream
 *   3. pins the commit in external-pins.json, inside the "plugins" object
 *   4. matches the version in marketplace.json to plugin.json
 *   5. regenerates verified.json with the registry's own verifier
 *   6. commits, pushes, and opens or updates the pull request
 *
 * Step 5 is not optional: the registry's CI runs verify-plugins.mjs --ci, which
 * fails on a stale verified.json. Its shape() compares
 * [status, version, commit, checks] and ignores dates, so timestamp churn on the
 * other entries is harmless.
 *
 * Usage: node .github/scripts/bump-registry-pin.mjs [--dry-run]
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const REGISTRY = 'ClaudeRegistry/marketplace';
const BRANCH = 'pin-search-visibility-kit';
const DRY_RUN = process.argv.includes('--dry-run');

const die = (msg) => {
  console.error(`\n${msg}`);
  process.exit(1);
};

const run = (cmd, args, opts = {}) =>
  execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();

const step = (n, msg) => console.log(`\n[${n}] ${msg}`);

// ------------------------------------------------------------------ preflight
try {
  run('gh', ['auth', 'status']);
} catch {
  die('gh is not authenticated. Run: gh auth login');
}

const plugin = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin/plugin.json'), 'utf8'));
const pluginId = plugin.name;
const version = plugin.version;

const originUrl = run('git', ['remote', 'get-url', 'origin'], { cwd: ROOT });
const originMatch = /github\.com[/:]([\w.-]+)\/([\w.-]+?)(?:\.git)?$/.exec(originUrl);
if (!originMatch) die(`Could not parse the origin remote: ${originUrl}`);
const [, owner, repoName] = originMatch;
const sourceRepo = `${owner}/${repoName}`;
const fork = `${owner}/${REGISTRY.split('/')[1]}`;

const localHead = run('git', ['rev-parse', 'HEAD'], { cwd: ROOT });
const remoteHead = run('git', ['ls-remote', originUrl, 'HEAD'], { cwd: ROOT }).split(/\s+/)[0];

if (localHead !== remoteHead) {
  die(
    `Local HEAD (${localHead.slice(0, 7)}) is not the pushed HEAD (${remoteHead.slice(0, 7)}).\n` +
      'Pinning a commit that does not exist on the remote would produce a pin the registry\n' +
      'cannot clone. Push first, then run this again.'
  );
}

console.log(`plugin   ${pluginId} ${version}`);
console.log(`repo     ${sourceRepo}`);
console.log(`commit   ${localHead}`);
console.log(`fork     ${fork}`);
if (DRY_RUN) console.log('\n-- dry run: nothing will be pushed --');

// ------------------------------------------------------------- sync and clone
step(1, `Syncing ${fork} with ${REGISTRY}`);
try {
  run('gh', ['repo', 'sync', fork, '--source', REGISTRY]);
} catch (err) {
  die(`Could not sync the fork. Does ${fork} exist?\n${String(err.stderr || err.message).trim()}`);
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'registry-pin-'));
step(2, `Cloning into ${work}`);
run('git', ['clone', '--depth', '1', `https://github.com/${fork}.git`, work]);
run('git', ['checkout', '-B', BRANCH], { cwd: work });

// ------------------------------------------------------------------- the edit
const pinsPath = path.join(work, '.claude-plugin', 'external-pins.json');
const marketPath = path.join(work, '.claude-plugin', 'marketplace.json');

step(3, 'Pinning the commit and matching the version');

const pins = JSON.parse(fs.readFileSync(pinsPath, 'utf8'));
pins.plugins = pins.plugins ?? {};
pins.plugins[pluginId] = { repo: sourceRepo, commit: localHead, path: '.' };
fs.writeFileSync(pinsPath, JSON.stringify(pins, null, 2) + '\n');

const market = JSON.parse(fs.readFileSync(marketPath, 'utf8'));
const entry = (market.plugins ?? []).find((p) => p.name === pluginId);
if (!entry) die(`${pluginId} is not listed in the registry's marketplace.json. Submit it first.`);
const previousVersion = entry.version;
entry.version = version;
fs.writeFileSync(marketPath, JSON.stringify(market, null, 2) + '\n');

console.log(`    commit  -> ${localHead.slice(0, 7)}`);
console.log(`    version ${previousVersion} -> ${version}`);

// --------------------------------------------------------- regenerate + verify
step(4, "Regenerating verified.json with the registry's own verifier");
let verifyOutput;
try {
  verifyOutput = run('node', ['scripts/verify-plugins.mjs'], { cwd: work });
} catch (err) {
  die(`The registry verifier failed:\n${String(err.stdout || err.stderr || err.message).trim()}`);
}
const ourLine = verifyOutput.split('\n').find((l) => l.includes(pluginId)) ?? '(not reported)';
console.log(`    ${ourLine.trim()}`);
if (!/^VERIFIED/.test(ourLine.trim())) {
  die('The plugin does not pass verification at this commit. Fix that before pinning it.');
}

step(5, 'Confirming the registry CI would be green');
try {
  run('node', ['scripts/verify-plugins.mjs', '--ci'], { cwd: work });
  console.log('    verify-plugins.mjs --ci exits 0');
} catch (err) {
  die(`--ci mode is not satisfied:\n${String(err.stdout || err.stderr || err.message).trim()}`);
}

// ---------------------------------------------------------------- commit + PR
const changed = run('git', ['status', '--short'], { cwd: work });
if (!changed) {
  console.log('\nNothing to change: the registry already matches this commit and version.');
  process.exit(0);
}
console.log(`\n${changed}`);

if (DRY_RUN) {
  console.log(`\nDry run complete. Clone left at ${work} for inspection.`);
  process.exit(0);
}

step(6, 'Committing and pushing');
const title = `Bump ${pluginId} pin to ${localHead.slice(0, 7)} (${version})`;
const message = [
  title,
  '',
  `- external-pins.json: pin ${sourceRepo} at ${localHead}`,
  `- marketplace.json: ${previousVersion} -> ${version}, matching plugin.json at that commit`,
  '- verified.json: regenerated with scripts/verify-plugins.mjs',
  '',
  'Verified before opening: node scripts/verify-plugins.mjs --ci exits 0.',
].join('\n');

run('git', ['add', '.claude-plugin'], { cwd: work });
run('git', ['commit', '-m', message], { cwd: work });
// The branch is rebuilt from a freshly synced main each run, so an existing PR
// branch is force-updated rather than stacked on.
run('git', ['push', '--force', 'origin', BRANCH], { cwd: work });

step(7, 'Opening or updating the pull request');
const open = run('gh', [
  'pr', 'list', '--repo', REGISTRY, '--head', `${owner}:${BRANCH}`, '--state', 'open', '--json', 'url', '--jq', '.[].url',
]);

if (open) {
  console.log(`\nUpdated the existing pull request: ${open}`);
} else {
  const url = run('gh', [
    'pr', 'create',
    '--repo', REGISTRY,
    '--base', 'main',
    '--head', `${owner}:${BRANCH}`,
    '--title', title,
    '--body', message,
  ]);
  console.log(`\nOpened ${url}`);
}

console.log(`\nWatch it with: gh pr checks --repo ${REGISTRY} --watch`);
