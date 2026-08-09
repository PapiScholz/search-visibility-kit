#!/usr/bin/env node
/*
 * Liveness check for the pinned MCP servers.
 *
 * Reads command/args straight out of .mcp.json rather than hardcoding them, so
 * the check follows the file. For each server it performs a real MCP
 * `initialize` handshake over stdio and requires a JSON-RPC response carrying
 * result.serverInfo. Metadata is not evidence: a package can resolve and still
 * fail to start.
 *
 * Two outcomes, deliberately distinct:
 *   BROKEN  the pinned version does not resolve or does not start  -> exit 1
 *   STALE   a newer version exists on PyPI                         -> notice only
 *
 * A check that treats "something newer exists" as a failure gets ignored within
 * two weeks, so staleness never turns the build red.
 *
 * Usage: node .github/scripts/mcp-smoke.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HANDSHAKE_TIMEOUT_MS = 240_000; // uvx may need to download the package first

const INITIALIZE = JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'mcp-smoke', version: '1.0' },
  },
});

/** Expand ${VAR} against the environment; unset vars become empty strings. */
const expand = (value) =>
  String(value).replace(/\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g, (_, name) => process.env[name] ?? '');

/** Pull "pkg==version" out of a `uvx --from pkg==version pkg` invocation. */
function pinnedPackage(args) {
  const i = args.indexOf('--from');
  if (i === -1 || i + 1 >= args.length) return null;
  const m = /^([A-Za-z0-9._-]+)==([\w.]+)$/.exec(args[i + 1]);
  return m ? { name: m[1], version: m[2] } : null;
}

function handshake(name, command, args, env) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;

    const finish = (result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      child.kill();
      resolve(result);
    };

    const timer = setTimeout(
      () => finish({ ok: false, reason: `no initialize response within ${HANDSHAKE_TIMEOUT_MS / 1000}s` }),
      HANDSHAKE_TIMEOUT_MS
    );

    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      for (const line of stdout.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('{')) continue;
        try {
          const msg = JSON.parse(trimmed);
          if (msg.result && msg.result.serverInfo) {
            finish({ ok: true, serverInfo: msg.result.serverInfo });
            return;
          }
        } catch {
          // partial line, wait for more output
        }
      }
    });

    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });

    child.on('error', (err) => finish({ ok: false, reason: err.message }));

    child.on('close', () => {
      const tail = stderr.trim().split('\n').slice(-2).join(' ').slice(0, 300);
      finish({ ok: false, reason: 'exited without a valid initialize response' + (tail ? ` (${tail})` : '') });
    });

    child.stdin.write(INITIALIZE + '\n');
  });
}

async function latestOnPypi(pkg) {
  try {
    const res = await fetch(`https://pypi.org/pypi/${encodeURIComponent(pkg)}/json`, {
      signal: AbortSignal.timeout(30_000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    return body?.info?.version ?? null;
  } catch {
    return null;
  }
}

const config = JSON.parse(fs.readFileSync(path.join(ROOT, '.mcp.json'), 'utf8').replace(/\r\n/g, '\n'));
const servers = Object.entries(config.mcpServers ?? {});

if (!servers.length) {
  console.error('.mcp.json declares no servers.');
  process.exit(1);
}

const broken = [];
const stale = [];
const summary = [];

for (const [name, spec] of servers) {
  const args = (spec.args ?? []).map(expand);
  const env = Object.fromEntries(Object.entries(spec.env ?? {}).map(([k, v]) => [k, expand(v)]));
  const pin = pinnedPackage(args);

  process.stdout.write(`${name}: ${spec.command} ${args.join(' ')}\n`);

  const result = await handshake(name, spec.command, args, env);
  if (!result.ok) {
    broken.push(`${name}: ${result.reason}`);
    console.log(`  BROKEN  ${result.reason}\n`);
    summary.push(`| \`${name}\` | ${pin ? pin.version : 'unpinned'} | — | **broken** — ${result.reason} |`);
    continue;
  }

  const info = result.serverInfo;
  console.log(`  OK      serverInfo: ${info.name} ${info.version ?? ''}`.trimEnd());

  let latest = null;
  if (pin) {
    latest = await latestOnPypi(pin.name);
    if (latest && latest !== pin.version) {
      stale.push(`${pin.name}: pinned ${pin.version}, latest ${latest}`);
      console.log(`  NOTICE  ${pin.name} pinned at ${pin.version}, PyPI has ${latest}`);
    }
  }
  console.log('');

  summary.push(
    `| \`${name}\` | ${pin ? pin.version : 'unpinned'} | ${latest ?? '?'} | ` +
      (latest && pin && latest !== pin.version ? 'newer available' : 'current') +
      ' |'
  );
}

if (process.env.GITHUB_STEP_SUMMARY) {
  const lines = [
    '## MCP pin smoke test',
    '',
    '| server | pinned | latest on PyPI | status |',
    '| --- | --- | --- | --- |',
    ...summary,
    '',
  ];
  if (stale.length) {
    lines.push('Newer upstream releases exist. Bump the pins in `.mcp.json` **and** `SETUP.md`', '');
  }
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
}

if (broken.length) {
  console.error(`${broken.length} server(s) failed to start:`);
  for (const b of broken) console.error(`  - ${b}`);
  process.exit(1);
}

console.log(
  stale.length
    ? `All servers started. ${stale.length} pin(s) behind upstream (not a failure).`
    : 'All servers started and every pin is current.'
);
