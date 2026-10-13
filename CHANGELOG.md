# Changelog

All notable changes to this project are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Fixed

- The registry pin watchdog had failed every day since 2026-10-06 with HTTP 404
  on `external-pins.json`. The registry moved from `ClaudeRegistry/marketplace`
  to `sigistry/marketplace` and, on 2026-09-03, dropped that file: the pin now
  lives in our `marketplace.json` entry as the git-subdir `source.sha`.
  `registry-pin.mjs` reads it from there, and `bump-registry-pin.mjs` writes the
  new commit into that same field next to `version`. Checked against the
  registry's own `verify-plugins.mjs --ci` on a throwaway clone before landing.

## [0.3.2] - 2026-10-13

### Changed

- The `papischolz` marketplace file is now one catalog that lists both
  `search-visibility-kit` and `sdlc-assist` (`ed48a6c`). The plugin itself is
  unchanged by it.
- The registry pin watchdog runs daily instead of weekly. It is the only thing
  that closes the drift reminder, and the event it waits for — the registry
  merging the pull request — happens in someone else's repository, at a time
  nobody here picks, with no webhook pointing back. There is nothing to react
  to, so the interval is the entire mechanism. At weekly it left issue #1
  standing for six days after the work that resolved it had already been merged.
- The drift issue now names the pull request when one is already open, instead
  of repeating a command that has already been run. `registry-pin.mjs` asks the
  registry for an open pull request on the pin branch and, finding one, says the
  bump is waiting on their review. The lookup takes a token if the environment
  has one and works without it; any failure there is swallowed, so drift
  detection never depends on it. Both scripts now derive the branch name from
  `plugin.json`, which is what lets them agree on which branch to look at.

### Fixed

- `bump-registry-pin.mjs` force-pushed the branch of a pull request that was
  already open without restating what that pull request said about itself. The
  title and body are written once, at creation, so an updated pull request kept
  advertising the commit and version it was opened with: PR #14 on the registry
  merged titled "Pin search-visibility-kit at eef17bc, bump entry to 0.2.1"
  while its only commit pinned `df395cd` (0.3.1). A reviewer who reads the title
  is reading the previous run. It now runs `gh pr edit --title --body` on every
  update.

## [0.3.1] - 2026-08-09

### Fixed

- `bump-registry-pin.mjs` asked `gh pr list --head` for `owner:branch`. That flag
  wants the bare branch name; the qualified form matches nothing and still exits
  successfully, which is indistinguishable from "no pull request exists". The
  script concluded there was none, tried to open a duplicate, and failed after it
  had already pushed. It now queries by branch name, filters by fork owner, and
  falls back to the URL `gh pr create` reports when a pull request does exist.

## [0.3.0] - 2026-08-09

First tagged release. Everything below already shipped to `main`: the plugin is
distributed from `HEAD`, so users received these changes as they landed, without
a version boundary to refer back to. This release creates that boundary.

> **Why there is no 0.2.1.** Commit `eef17bc` set `plugin.json` to `0.2.1`, but
> this range contains `daa7547` — a new feature. Semantic Versioning requires a
> minor bump for that, so the label was wrong, and no release was ever cut under
> it. `0.3.0` supersedes it. The gap in numbering is deliberate.

### Added

- Standalone compatibility for skills.sh installs: plugin-agnostic script path,
  MCP fallback guidance in `setup-google-access`, and `npx` install docs
  (`daa7547`).
- Bilingual `SETUP.md` — manual step-by-step for Search Console / GA4
  credentials, non-Claude MCP clients, and Bing Webmaster Tools registration
  (`1e9fa52`), including the Windows stale-environment gotcha: `setx` does not
  update running processes, and editor-embedded terminals inherit the editor's
  environment (`6837c97`).
- Bilingual `PRIVACY.md` — no data collection, local-only credentials, direct
  API flows (`6814086`).
- README: "Who is this for" positioning with an honest non-audience (`4a58087`),
  and a use-cases table mapping real prompts to outcomes (`f119018`).
- Release infrastructure: this changelog, a release guard that keeps the version
  and the changelog from drifting apart, tagged GitHub releases, a scheduled
  smoke test of the pinned MCP servers, and drift detection against the
  ClaudeRegistry commit pin.

### Changed

- Both MCP servers are pinned to exact versions — `mcp-search-console==0.3.3`
  and `analytics-mcp==0.7.0` — so every install resolves the same server code
  the plugin was tested against (`eef17bc`).

### Fixed

- Removed an XML-like placeholder from the `onboard-site` skill description,
  which Cowork's stricter skill validator rejected (`64a75da`).

### Removed

- The `--with "mcp<2"` workaround, introduced during this cycle (`8deee99`) when
  the July 2026 `mcp` Python SDK release removed `mcp.server.fastmcp` and renamed
  `Tool.inputSchema`, crashing both upstream servers. It is no longer needed:
  both packages now declare the `mcp<2` upper bound themselves (`eef17bc`).

## [0.2.0] - 2026-07-28

### Added

- IndexNow delta submissions via a `--state` file: only URLs that have not been
  submitted before are sent (`fb865a4`).
- `.gitignore` for graphify knowledge-graph artifacts (`aaf97b8`) and Snyk
  organization configuration (`c46fd78`).

## [0.1.0] - 2026-07-28

### Added

- Initial release (`f4a9a7b`). Four skills — `setup-google-access`, `seo-audit`,
  `indexnow`, `onboard-site` — plus two MCP servers (`gsc`, `analytics`) run via
  `uvx`, and a zero-dependency Node script for IndexNow submissions.

[Unreleased]: https://github.com/PapiScholz/search-visibility-kit/compare/v0.3.2...HEAD
[0.3.2]: https://github.com/PapiScholz/search-visibility-kit/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/PapiScholz/search-visibility-kit/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/PapiScholz/search-visibility-kit/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/PapiScholz/search-visibility-kit/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/PapiScholz/search-visibility-kit/releases/tag/v0.1.0
