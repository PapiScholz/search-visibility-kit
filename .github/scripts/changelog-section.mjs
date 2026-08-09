#!/usr/bin/env node
/*
 * Print the body of one CHANGELOG.md section, used as the GitHub Release notes.
 *
 * Usage: node .github/scripts/changelog-section.mjs v0.3.0
 *        node .github/scripts/changelog-section.mjs 0.3.0
 *
 * Exits 1 if the section is absent, so a tag can never produce a release with
 * empty notes: the release guard already requires the section to exist, and this
 * is the second line of defence.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const raw = process.argv[2];
if (!raw) {
  console.error('Usage: changelog-section.mjs <version>');
  process.exit(1);
}
const version = raw.replace(/^v/, '');

const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8').replace(/\r\n/g, '\n');
const lines = changelog.split('\n');

const start = lines.findIndex((l) => l.startsWith(`## [${version}]`));
if (start === -1) {
  console.error(`CHANGELOG.md has no "## [${version}]" section.`);
  process.exit(1);
}

let end = lines.length;
for (let i = start + 1; i < lines.length; i++) {
  if (lines[i].startsWith('## ')) {
    end = i;
    break;
  }
}

// Drop the heading itself and any link-reference block that trails the section.
const body = lines
  .slice(start + 1, end)
  .filter((l) => !/^\[[^\]]+\]:\s*https?:/.test(l))
  .join('\n')
  .trim();

if (!body) {
  console.error(`The "## [${version}]" section is empty.`);
  process.exit(1);
}

console.log(body);
