#!/usr/bin/env node
/*
 * Offline validation gate for search-visibility-kit.
 *
 * Four checks, no network and no dependencies:
 *   version-changelog  the version in plugin.json moved forward and CHANGELOG.md
 *                      documents it
 *   json-valid         every JSON manifest parses
 *   skill-frontmatter  each SKILL.md declares name/description, the name matches
 *                      its directory, and the description carries no XML-like
 *                      placeholder (Cowork's validator rejects those, see 64a75da)
 *   script-syntax      the bundled IndexNow script parses
 *
 * Usage: node .github/scripts/validate.mjs [--base <sha>]
 * Without --base the version ordering check is skipped: there is nothing to
 * compare against. Exit code 1 if any check fails.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// Every content comparison runs on normalised line endings: the repo is edited on
// Windows and validated on a Linux runner, and a check whose result depends on the
// operating system is not a check.
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const results = [];
const pass = (id, detail) => results.push({ id, status: 'pass', detail });
const fail = (id, detail) => results.push({ id, status: 'fail', detail });
const skip = (id, detail) => results.push({ id, status: 'skip', detail });

const argv = process.argv.slice(2);
const baseFlag = argv.indexOf('--base');
const rawBase = baseFlag !== -1 ? argv[baseFlag + 1] : null;
// github.event.before is all zeros on a branch's first push; treat that as no base.
const base = rawBase && !/^0+$/.test(rawBase) ? rawBase : null;

const SEMVER = /^(\d+)\.(\d+)\.(\d+)$/;
const parseSemver = (v) => {
  const m = SEMVER.exec(v ?? '');
  return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null;
};
const isGreater = (a, b) => {
  for (let i = 0; i < 3; i++) {
    if (a[i] !== b[i]) return a[i] > b[i];
  }
  return false;
};

// ----------------------------------------------------------------- json-valid
const MANIFESTS = ['.claude-plugin/plugin.json', '.claude-plugin/marketplace.json', '.mcp.json'];
let plugin = null;
{
  const broken = [];
  for (const rel of MANIFESTS) {
    if (!exists(rel)) {
      broken.push(rel + ': missing');
      continue;
    }
    try {
      const parsed = JSON.parse(read(rel));
      if (rel.endsWith('plugin.json')) plugin = parsed;
    } catch (err) {
      broken.push(rel + ': ' + err.message);
    }
  }
  if (broken.length) fail('json-valid', broken.join('; '));
  else pass('json-valid', MANIFESTS.length + ' manifests parse');
}

// ---------------------------------------------------------- version-changelog
{
  const version = plugin && plugin.version;
  const current = parseSemver(version);
  if (!current) {
    fail('version-changelog', 'plugin.json version missing or not semver: ' + JSON.stringify(version));
  } else if (!exists('CHANGELOG.md')) {
    fail('version-changelog', 'CHANGELOG.md does not exist');
  } else {
    const changelog = read('CHANGELOG.md');
    const heading = new RegExp('^## \\[' + version.replace(/\./g, '\\.') + '\\]', 'm');
    const documented = heading.test(changelog);

    // undefined = base commit exists but has no readable plugin.json there
    let previous = null;
    if (base) {
      try {
        const raw = execFileSync('git', ['show', base + ':.claude-plugin/plugin.json'], {
          cwd: ROOT,
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        previous = parseSemver(JSON.parse(raw).version);
      } catch {
        previous = undefined;
      }
    }

    if (!documented) {
      fail('version-changelog', 'CHANGELOG.md has no "## [' + version + ']" section');
    } else if (!base) {
      skip('version-changelog', version + ' documented; no --base given, ordering not checked');
    } else if (previous === undefined) {
      pass('version-changelog', version + ' documented; no plugin.json at base to compare');
    } else if (previous === null) {
      fail('version-changelog', 'plugin.json at base has a non-semver version');
    } else if (previous.join('.') === current.join('.')) {
      pass('version-changelog', version + ' unchanged since base and documented');
    } else if (!isGreater(current, previous)) {
      fail('version-changelog', 'version went backwards: ' + previous.join('.') + ' -> ' + version);
    } else {
      pass('version-changelog', previous.join('.') + ' -> ' + version + ', documented in CHANGELOG.md');
    }
  }
}

// --------------------------------------------------------- skill-frontmatter
{
  const skillsDir = path.join(ROOT, 'skills');
  const problems = [];
  let checked = 0;

  const dirs = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir, { withFileTypes: true }).filter((d) => d.isDirectory())
    : [];

  if (!dirs.length) problems.push('no skill directories found under skills/');

  for (const dir of dirs) {
    const rel = 'skills/' + dir.name + '/SKILL.md';
    if (!exists(rel)) {
      problems.push(rel + ': missing');
      continue;
    }
    checked++;
    const fm = /^---\n([\s\S]*?)\n---/.exec(read(rel));
    if (!fm) {
      problems.push(rel + ': no YAML frontmatter delimited by ---');
      continue;
    }
    const block = fm[1];
    const field = (key) => {
      const m = new RegExp('^' + key + ':[ \\t]*(.+)$', 'm').exec(block);
      return m ? m[1].trim() : null;
    };

    const name = field('name');
    const description = field('description');

    if (!name) problems.push(rel + ': frontmatter has no "name"');
    else if (name !== dir.name) problems.push(rel + ': name "' + name + '" does not match directory "' + dir.name + '"');

    if (!description) {
      problems.push(rel + ': frontmatter has no "description"');
    } else {
      // Cowork's skill validator rejects XML-like placeholders in descriptions.
      // Regression guard for 64a75da.
      const placeholder = /<[A-Za-z_][\w-]*>/.exec(description);
      if (placeholder) problems.push(rel + ': description contains XML-like placeholder ' + placeholder[0]);
      if (description.length > 1024) problems.push(rel + ': description is ' + description.length + ' chars (max 1024)');
    }
  }

  if (problems.length) fail('skill-frontmatter', problems.join('; '));
  else pass('skill-frontmatter', checked + ' skill(s) have valid frontmatter');
}

// ------------------------------------------------------------- script-syntax
{
  const rel = 'skills/indexnow/scripts/indexnow.mjs';
  if (!exists(rel)) {
    fail('script-syntax', rel + ': missing');
  } else {
    try {
      execFileSync(process.execPath, ['--check', path.join(ROOT, rel)], { stdio: ['ignore', 'pipe', 'pipe'] });
      pass('script-syntax', rel + ' parses');
    } catch (err) {
      const first = String(err.stderr || err.message).trim().split('\n')[0];
      fail('script-syntax', rel + ': ' + first);
    }
  }
}

// ------------------------------------------------------------------ mcp-pins
{
  // Exact version pins are policy here (see CHANGELOG 0.3.0). Catching an
  // unpinned server in the PR gate beats catching it a week later in the
  // scheduled smoke test.
  try {
    const config = JSON.parse(read('.mcp.json'));
    const servers = Object.entries(config.mcpServers ?? {});
    const problems = [];

    if (!servers.length) problems.push('.mcp.json declares no servers');

    for (const [name, spec] of servers) {
      const args = spec.args ?? [];
      const i = args.indexOf('--from');
      if (i === -1 || i + 1 >= args.length) {
        problems.push(name + ': no "--from <pkg>==<version>" argument');
        continue;
      }
      if (!/^[A-Za-z0-9._-]+==[\w.]+$/.test(args[i + 1])) {
        problems.push(name + ': "' + args[i + 1] + '" is not an exact version pin');
      }
    }

    if (problems.length) fail('mcp-pins', problems.join('; '));
    else pass('mcp-pins', servers.length + ' server(s) pinned to exact versions');
  } catch (err) {
    fail('mcp-pins', '.mcp.json unreadable: ' + err.message);
  }
}

// -------------------------------------------------------------------- report
const width = Math.max(...results.map((r) => r.id.length));
for (const r of results) {
  const tag = r.status === 'pass' ? 'PASS' : r.status === 'skip' ? 'SKIP' : 'FAIL';
  console.log(tag + '  ' + r.id.padEnd(width) + '  ' + r.detail);
}

const failures = results.filter((r) => r.status === 'fail');
console.log('');
if (failures.length) {
  console.error(failures.length + ' of ' + results.length + ' check(s) failed.');
  process.exit(1);
}
console.log('All ' + results.length + ' checks passed.');
