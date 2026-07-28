---
name: seo-audit
description: Run a data-driven SEO audit of a website using Google Search Console and GA4 MCP tools. Use when the user asks for an SEO audit, analysis, review, "how is my site doing in search", traffic analysis, indexing status, or sitemap health. Requires the gsc and analytics MCP servers from this plugin to be connected.
---

# SEO audit

Produce a prioritized, evidence-based audit. Every claim must come from actual tool output — never estimate or fill gaps with plausible numbers.

## Data collection

Run these in order (parallelize where independent):

1. `list_properties` — get the exact `site_url` (prefer `sc-domain:` properties). `get_account_summaries` — get the GA4 property ID.
2. `get_performance_overview` (28 days) — clicks, impressions, CTR, position, daily trend.
3. `get_search_analytics` with `dimensions=query` (50 rows) and again with `dimensions=page` (25 rows).
4. `list_sitemaps_enhanced` — CRITICAL: compare `last_downloaded` against today and `url_count` against the live sitemap's real URL count (fetch the sitemap and count `<loc>` entries). A stale download date or a lower count than reality means Google is working from an outdated map — resubmit with `submit_sitemap` after confirming with the user.
5. `batch_url_inspection` on the top 8-10 pages by impressions — check `coverage_state` and `last_crawled`.
6. GA4 `run_report`: sessions/users/engagementRate by `sessionDefaultChannelGroup` (28 days), and `screenPageViews`/`totalUsers` by `pagePath` (top 15).
7. Optional: `run_realtime_report` for active users right now.

## Analysis framework

Evaluate and report in this order:

- **Branded vs non-branded queries.** Classify every query. A site with ~100% branded queries has a content problem, not a technical problem — say so plainly. Flag non-branded queries at position 1-10 with low impressions as expansion seeds.
- **Brand dominance.** If the brand query itself ranks below position ~5, flag it (schema.org Organization markup, Google Business Profile, brand-name collisions).
- **CTR opportunities.** Pages with impressions > 50 and CTR < 2%: recommend title/meta rewrites tied to the actual queries shown.
- **Sitemap and index health.** Stale sitemap, non-indexed key pages, crawl dates older than ~30 days on important pages.
- **Analytics hygiene.** Flag admin/CMS paths (e.g. `/admin`) appearing in GA4 top pages — recommend internal traffic filtering.
- **Channel mix.** Direct vs organic ratio, engagement rate per channel. High direct + near-zero organic = visibility problem; organic engagement above site average = quality signal worth scaling.

## Output

Deliver: what is healthy (2-3 lines), the 3 findings that matter most (each with the metric that proves it), and concrete next actions ranked by impact. Lead with the most uncomfortable finding, not the most flattering one. State data caveats: GSC data lags ~2 days; low-volume sites have noisy daily numbers.
