---
name: indexnow
description: Set up or run IndexNow URL submissions (Bing, Yandex, Seznam, Naver) for a website, with a pre-check of the key file and verification beyond the HTTP status. Use when the user mentions IndexNow, notifying search engines of new/changed URLs, "submit URLs to Bing", or fast indexing. Not applicable to Google — Google ignores IndexNow; use Search Console sitemap submission instead.
---

# IndexNow

Notify IndexNow-participating engines (Bing, Yandex, Seznam, Naver) when URLs are published or updated. State clearly to the user: **Google does not use IndexNow** — for Google, submit the sitemap via Search Console.

## How a submission works

IndexNow is one HTTPS request; no tool or script is needed. Send every request with an explicit browser-like User-Agent, such as `Mozilla/5.0 (compatible; IndexNowClient/1.0; +https://www.indexnow.org/)`: WAFs commonly answer 403 to default library User-Agents.

1. **Key.** A key is 8 to 128 characters of `a-z`, `A-Z`, `0-9` and `-`. Generate 32 hex characters with whatever the user's shell has: `openssl rand -hex 16`, or in PowerShell `[guid]::NewGuid().ToString('N')`.
2. **Pre-check the key file** before submitting: `https://<host>/<KEY>.txt` must return 200 with exactly the key as content. If it doesn't, stop and fix that first (see Verification); submissions sent before the file serves never count.
3. **Collect the URLs.** Either the specific URLs the user names, or every `<loc>` in the sitemap. If the sitemap is a `<sitemapindex>`, fetch each child sitemap it lists and collect their `<loc>` entries, skipping any sitemap already fetched. Remove duplicates.
4. **Send only what's new** when the user runs this repeatedly: keep the submitted URLs in a JSON array file such as `.indexnow-sent.json` (suggest gitignoring it), submit only URLs not in it, and add them after a successful submission. Without it, every run submits the full list (harmless, since IndexNow deduplicates, but noisy at scale).
5. **Submit** with a POST to `https://api.indexnow.org/indexnow`, header `Content-Type: application/json; charset=utf-8`, body `{"host": "<host>", "key": "<KEY>", "urlList": ["https://<host>/page", ...]}`. Up to 10,000 URLs per request; split larger lists into batches. HTTP 200 or 202 is an acknowledgment; anything else is an error to show the user with its response body.

## Setup for a new site

1. Generate a key (step 1 above).
2. Publish `https://<host>/<KEY>.txt` containing exactly the key (no newline, no BOM). For most frameworks that means dropping `<KEY>.txt` into the static/public directory. The key is public by design — it is not a secret and may live in CI config in plaintext.
3. For recurring submissions, suggest a post-deploy step in the user's own CI that sends the POST from step 5 with the sitemap's URLs.

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
