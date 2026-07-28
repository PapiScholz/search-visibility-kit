---
name: setup-google-access
description: Guide the user through connecting Claude to Google Search Console and Google Analytics 4 with a reusable service account. Use when the user wants to set up, connect, or configure Search Console / GA4 access, mentions "setup google access", credentials, service accounts, or when other skills in this plugin fail with authentication or empty-property errors.
---

# Setup Google access

Walk the user through a one-time setup that works for unlimited websites afterwards. The end state: a Google Cloud service account whose JSON key feeds two local MCP servers (`gsc` and `analytics`, declared in this plugin's `.mcp.json`).

## Prerequisites check

Before anything, verify what already works:

1. Try `list_properties` (gsc) and `get_account_summaries` (analytics). If both return data, setup is done — skip to verification.
2. Check `uvx` is installed (`uvx --version`). If missing, have the user install uv: Windows `powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"`, macOS/Linux `curl -LsSf https://astral.sh/uv/install.sh | sh`. If the installer errors with "file in use", uv is already installed — do not reinstall.

## One-time Google Cloud setup

Guide the user through (they do this in the browser; offer to walk through each screen):

1. Create a project at console.cloud.google.com. Note the Project ID.
2. Enable three APIs (APIs & Services → Library): Google Search Console API, Google Analytics Data API, Google Analytics Admin API.
3. Create a service account (Credentials → Create credentials → Service account). No project roles needed.
4. Create a JSON key (service account → Keys → Add key → JSON) and save it in a permanent local path outside cloud-synced folders.
5. Note the service account email (`name@project.iam.gserviceaccount.com`) — it is the only thing needed to add future sites.

## Per-site access grant

For each website:

- Search Console → property → Settings → Users and permissions → Add user → service account email → Full (or Restricted for read-only).
- GA4 → Admin → Property access management → Add user → service account email → Viewer role. Recommend Viewer (least privilege); only suggest Editor if the user has a concrete write use case.

## Environment variables

This plugin's `.mcp.json` expects two environment variables set in the user's shell/OS:

- `GOOGLE_SA_KEY_PATH` — absolute path to the service account JSON key
- `GOOGLE_CLOUD_PROJECT_ID` — the Google Cloud project ID

On Windows: `setx GOOGLE_SA_KEY_PATH "C:\path\to\key.json"` and `setx GOOGLE_CLOUD_PROJECT_ID "project-id"`, then fully restart the Claude app. On macOS/Linux, export them in the shell profile.

## Verification

1. `list_properties` must return the user's GSC properties.
2. `get_account_summaries` must return the GA4 account and property. Note the numeric property ID for reports.

## Troubleshooting

- Empty property list / permission denied → the service account email was not added to that specific property, or was added at account level instead of property level in GA4.
- `spawn uvx ENOENT` → the client needs the full path to the uvx binary in `.mcp.json` overrides (GUI apps do not read shell PATH). Find it with `which uvx` / `Get-Command uvx`.
- MCP servers not appearing after config changes → the Claude app was not fully quit (system tray on Windows, Cmd+Q on macOS).
- Data mismatch vs GSC dashboard → the gsc server defaults to `dataState: all` (matches dashboard). `GSC_DATA_STATE=final` returns only confirmed data (2-3 day lag).
