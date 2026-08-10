#!/usr/bin/env node
/*
 * Drift detection against the ClaudeRegistry commit pin.
 *
 * The registry badge reads "verified @<sha>" and a daily watchdog on their side
 * flips it to "outdated" the moment this repo's HEAD moves past the pin. This
 * script notices the same thing from our side, so the reminder lands here
 * instead of being discovered weeks later on the plugin page.
 *
 * Read-only: it fetches two public files over HTTPS and compares them with local
 * state. Bumping the pin is a separate, deliberate act performed locally by
 * bump-registry-pin.mjs.
 *
 * When it finds drift it also asks whether a pull request with the new pin is
 * already open, so the issue can say "waiting on their review" instead of asking
 * again for a command that has already been run. That call takes a token if one
 * is in the environment and works without it; either way a failure there is
 * swallowed and detection carries on.
 *
 * Exit codes: 0 in sync, 3 drift detected, 1 could not determine.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const REGISTRY = 'ClaudeRegistry/marketplace';
const RAW = `https://raw.githubusercontent.com/${REGISTRY}/main/.claude-plugin`;

const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n'));
const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();

async function fetchJson(url) {
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

const plugin = readJson('.claude-plugin/plugin.json');
const pluginId = plugin.name;
const localVersion = plugin.version;
const localHead = git('rev-parse', 'HEAD');

// Both scripts derive the pull request branch from the plugin name, so renaming
// the plugin cannot leave them looking at two different branches.
const BRANCH = `pin-${pluginId}`;
const owner = (/github\.com\/([\w.-]+)\//.exec(plugin.repository ?? '') ?? [])[1] ?? null;

/*
 * Enrichment, never a gate. Any failure leaves this null and the issue falls back
 * to the plain instructions: drift detection is the job, and it must not start
 * depending on an authenticated call into a third party's repository.
 *
 * Worth knowing, because it is the exact inverse of the 0.3.1 bug: the REST API
 * wants the qualified `owner:branch` form for this filter, while `gh pr list
 * --head` wants the bare branch name and silently matches nothing if given the
 * qualified one.
 */
async function findOpenPull() {
  if (!owner) return null;
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  try {
    const res = await fetch(
      `https://api.github.com/repos/${REGISTRY}/pulls?state=open&head=${owner}:${BRANCH}`,
      {
        signal: AbortSignal.timeout(30_000),
        headers: {
          accept: 'application/vnd.github+json',
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
      }
    );
    if (!res.ok) return null;
    const [pr] = await res.json();
    return pr ? { url: pr.html_url, number: pr.number, opened: pr.created_at.slice(0, 10) } : null;
  } catch {
    return null;
  }
}

let pins;
let registryMarketplace;
try {
  [pins, registryMarketplace] = await Promise.all([
    fetchJson(`${RAW}/external-pins.json`),
    fetchJson(`${RAW}/marketplace.json`),
  ]);
} catch (err) {
  console.error(`Could not read the registry: ${err.message}`);
  process.exit(1);
}

const pin = pins?.plugins?.[pluginId] ?? null;
const entry = (registryMarketplace?.plugins ?? []).find((p) => p.name === pluginId) ?? null;
const pinnedCommit = pin?.commit ?? null;
const registryVersion = entry?.version ?? null;

const commitDrift = pinnedCommit !== localHead;
const versionDrift = registryVersion !== localVersion;
const drift = commitDrift || versionDrift;

const short = (sha) => (sha ? sha.slice(0, 7) : 'none');

console.log(`plugin           ${pluginId}`);
console.log(`local HEAD       ${localHead}`);
console.log(`registry pin     ${pinnedCommit ?? '(not pinned)'}`);
console.log(`local version    ${localVersion}`);
console.log(`registry version ${registryVersion ?? '(absent)'}`);
console.log('');

// Only asked when it can change what the issue should say.
const pull = drift ? await findOpenPull() : null;

const nextStep = pull
  ? [
      `A pull request carrying the new pin is already open: ${pull.url} (#${pull.number}, opened ${pull.opened}).`,
      '',
      'Nothing to do from here until the registry reviews and merges it. This issue closes',
      'itself on the first run after that, and the watchdog runs daily.',
      '',
      'Only if HEAD has moved again since it was opened, force-update it with:',
    ]
  : ['Bump it with:'];

const body = [
  `The ClaudeRegistry pin for \`${pluginId}\` no longer matches this repository.`,
  '',
  '| | registry | this repo |',
  '| --- | --- | --- |',
  `| commit | \`${short(pinnedCommit)}\` | \`${short(localHead)}\` |`,
  `| version | ${registryVersion ?? '(absent)'} | ${localVersion} |`,
  '',
  `While these differ the badge reads **outdated**. Their watchdog runs daily and never`,
  'flips a plugin back to verified on its own: that needs a new pin, reviewed and merged.',
  '',
  ...nextStep,
  '',
  '```',
  'node .github/scripts/bump-registry-pin.mjs',
  '```',
  '',
  `That opens (or updates) a PR against \`${REGISTRY}\` with the new commit, the new`,
  'version and a regenerated `verified.json` — all three are required or their CI fails.',
].join('\n');

if (drift) {
  console.log(body);
} else {
  console.log('In sync: the registry pin matches HEAD and the versions agree.');
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(
    process.env.GITHUB_OUTPUT,
    [`drift=${drift}`, `head=${localHead}`, `version=${localVersion}`, `pinned=${pinnedCommit ?? ''}`, ''].join('\n')
  );
}
if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(
    process.env.GITHUB_STEP_SUMMARY,
    drift ? `## Registry pin drift\n\n${body}\n` : '## Registry pin\n\nIn sync with HEAD.\n'
  );
}
// The workflow uses this file as the issue body. It goes to the runner's temp
// directory, never the repo root: everything at the root ships as plugin payload.
const bodyPath = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'pin-drift.md');
fs.writeFileSync(bodyPath, body + '\n');
console.log(`\nissue body written to ${bodyPath}`);

process.exit(drift ? 3 : 0);
