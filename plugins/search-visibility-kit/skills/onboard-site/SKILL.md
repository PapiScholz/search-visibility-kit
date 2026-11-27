---
name: onboard-site
description: Checklist-driven onboarding of a new website into the full search-visibility stack (Search Console, GA4, IndexNow, Bing Webmaster Tools). Use when the user says "add a new site", "onboard example.com", "set up this website", or wants to repeat the setup for another project or client site.
---

# Onboard a new site

Run this checklist for each new website. The service account and MCP servers already exist (if not, run setup-google-access first) — onboarding a site requires zero Claude reconfiguration.

## Checklist

Work through in order, verifying each step with tool calls where possible:

1. **Search Console property.** Check `list_properties` for the domain. If absent, the user creates it at search.google.com/search-console (DNS verification recommended for domain properties) and adds the service account email under Users and permissions.
2. **GA4 access.** Check `get_account_summaries`. If the property is missing, the user adds the service account (Viewer) under Admin → Property access management. Record the numeric property ID.
3. **Sitemap.** `list_sitemaps_enhanced` — if no sitemap is registered, or `last_downloaded` is stale, submit it with `submit_sitemap` (confirm the live sitemap URL returns valid XML first).
4. **IndexNow.** Run the indexnow skill's setup section: new key, key file in the site's static assets, verify it serves 200, submit the sitemap URLs.
5. **Bing Webmaster Tools.** Have the user import the site from Search Console at bing.com/webmasters (one click, no manual verification). This is the only place IndexNow processing is visible.
6. **Baseline audit.** Run the seo-audit skill and save the output as the site's baseline for future comparisons.

## Verification

Close by confirming: GSC property listed, GA4 property readable, sitemap freshly downloaded or pending, IndexNow key file serving 200 with exact content, first submission acknowledged. Report any step that could not be verified as pending — never mark it done on assumption.
