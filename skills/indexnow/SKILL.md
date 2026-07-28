---
name: indexnow
description: Set up or run IndexNow URL submissions (Bing, Yandex, Seznam, Naver) for a website using the bundled zero-dependency Node script. Use when the user mentions IndexNow, notifying search engines of new/changed URLs, "submit URLs to Bing", or fast indexing. Not applicable to Google — Google ignores IndexNow; use Search Console sitemap submission instead.
---

# IndexNow

Notify IndexNow-participating engines (Bing, Yandex, Seznam, Naver) when URLs are published or updated. State clearly to the user: **Google does not use IndexNow** — for Google, submit the sitemap via Search Console.

## Bundled script

`${CLAUDE_PLUGIN_ROOT}/skills/indexnow/scripts/indexnow.mjs` — zero dependencies, Node 18+. Commands:

- `node indexnow.mjs generar-clave` (or `generate-key`) — prints a fresh 32-char hex key.
- `node indexnow.mjs --host example.com --key KEY https://example.com/page` — submit specific URLs.
- `node indexnow.mjs --host example.com --key KEY --sitemap https://example.com/sitemap.xml` — submit every URL in the sitemap (handles nested sitemap indexes). Key can also come from env `INDEXNOW_KEY`.

The script sends an explicit browser-like User-Agent on every request (WAFs commonly 403 default library UAs) and pre-checks that the key file is publicly reachable before submitting.

## Setup for a new site

1. Generate a key with the script.
2. Publish `https://<host>/<KEY>.txt` containing exactly the key (no newline, no BOM). For most frameworks that means dropping `<KEY>.txt` into the static/public directory. The key is public by design — it is not a secret and may live in package.json or CI config in plaintext.
3. Suggest a `package.json` script and/or a post-deploy CI step that runs the sitemap submission.

## Verification — do not trust HTTP 200

An HTTP 200/202 from api.indexnow.org is an acknowledgment of receipt, NOT confirmation of processing. Verify the full chain:

1. Fetch `https://<host>/<KEY>.txt` with a browser-like User-Agent. Expect 200 and exact key content.
2. If it returns 404 right after a deploy, retry with a cache-buster query string (`?v=timestamp`). A 200 with cache-buster but 404 without means the CDN edge cached the pre-deploy 404 — purge the URL or wait for TTL.
3. If it returns 403, test the same URL with several User-Agents (browser, empty, bot names, `curl`, `python-requests`, `Go-http-client`). WAF rules often deny specific library UA signatures while allowing everything else. Compare against a known-good file like `/robots.txt` — but beware: robots.txt frequently has its own WAF exemption, so it is a weak control.
4. The only true confirmation is Bing Webmaster Tools → IndexNow panel (bing.com/webmasters, properties can be imported from Search Console in one click). Check submitted-URL counts there. Note: Cloudflare's "Crawler Hints" feature auto-submits to IndexNow — the panel's Sources chart distinguishes it from your own submissions.

## Common pitfalls

- Key file behind a WAF/bot-protection rule → submissions silently never validate.
- SPA fallback routing returning 200 HTML for the key path → IndexNow validation fails despite "working" URL; the file must be served as a real static asset.
- Submitting before the key file is deployed → those submissions never count; resubmit after the file serves 200.
