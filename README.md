# search-visibility-kit

Connect Claude (Cowork / Claude Code / any MCP client) to **Google Search Console**, **Google Analytics 4** and **IndexNow** — for any website, with one reusable setup.

This plugin does not reinvent MCP servers. It orchestrates two existing, maintained ones — [google-analytics-mcp](https://github.com/googleanalytics/google-analytics-mcp) (official, Google) and [mcp-search-console](https://github.com/AminForou/mcp-gsc) (AminForou, MIT) — and adds the operational knowledge that makes them work smoothly across many sites: guided credential setup, audit workflows, sitemap health checks, and IndexNow submission with real end-to-end verification.

## Who is this for

Your AI already reads your code — this makes it read your search reality.

This kit is for developers who own the *outcome* of a website, not just its code: indie hackers, freelancers running client sites, small agencies, anyone whose deploy is only half the job. If SEO is "the marketing team's problem" in your org, this probably isn't for you — and if you have an enterprise SEO stack (Ahrefs, Semrush, a data team), you already have better-resourced answers.

What it changes in practice:

- **Integration cost collapses.** Wiring Search Console + GA4 into an AI agent normally means reading two repos, fighting Google Cloud auth, and debugging WAFs, CDN caches and stale environments. That knowledge is distilled here — setup is ~15 minutes, guided.
- **The deploy → impact loop closes where you work.** Real case from this kit's development: a production site's sitemap had been frozen for six months — Google knew 5 of its 34 URLs and no human had noticed. One audit query found it and fixed it in the same conversation.
- **Your AI stops guessing.** "How's my SEO?" without data yields generic advice. With live GSC/GA4 access, answers cite your actual queries, CTR, positions and index coverage.
- **N sites, zero marginal config.** One service account, two clicks per new site. Audits become a billable deliverable built on Google's free APIs.

## What you get

| Skill | What it does |
|---|---|
| `setup-google-access` | One-time guided setup: Google Cloud project, service account, per-site access grants, environment variables, troubleshooting. |
| `seo-audit` | Data-driven audit: branded vs non-branded queries, CTR opportunities, sitemap staleness detection, index coverage, GA4 channel mix and hygiene. |
| `indexnow` | Bundled zero-dependency Node script (key generation, sitemap submission) plus a verification playbook for the failure modes that bite in production: CDN-cached 404s, WAF user-agent blocking, SPA fallback routing. |
| `onboard-site` | Repeatable checklist to bring any new website into the full stack in minutes. |

## Install

From the Claude Code / Cowork plugin marketplace flow:

```
/plugin marketplace add PapiScholz/search-visibility-kit
/plugin install search-visibility-kit@papischolz
```

## Requirements

- [uv](https://docs.astral.sh/uv/) installed (`uvx` runs both MCP servers, no Python management needed)
- Node 18+ (only for the IndexNow script)
- Two environment variables:
  - `GOOGLE_SA_KEY_PATH` — absolute path to your service account JSON key
  - `GOOGLE_CLOUD_PROJECT_ID` — your Google Cloud project ID

No key? Two paths: run the `setup-google-access` skill and Claude walks you through creating one interactively (~10 minutes, free), or follow the manual step-by-step in [SETUP.md](SETUP.md) — which also covers non-Claude MCP clients (Cursor, etc.) and Bing Webmaster Tools registration.

> **Note:** both MCP servers are currently pinned with `--with "mcp<2"` because the July 2026 release of the `mcp` Python SDK introduced breaking changes (removed `mcp.server.fastmcp`, renamed `Tool.inputSchema`) that crash both upstream servers. Remove the pin once upstream publishes compatible releases.

## Reusing across websites

The core design decision: one service account, added as a user to each site's Search Console property and GA4 property. Adding site #2 (or #20) requires two clicks in Google's UIs and zero configuration changes here. Run `onboard-site` per site.

## Honest limitations

- Search Console data lags ~2 days by design (all tools, not just this one). GA4 realtime covers the last 30 minutes.
- IndexNow reaches Bing, Yandex, Seznam and Naver. **Google ignores IndexNow** — for Google, this kit submits your sitemap through Search Console instead.
- An HTTP 200 from IndexNow is an acknowledgment, not proof of processing. The `indexnow` skill verifies the whole chain and points you to Bing Webmaster Tools for ground truth.

## License

MIT — see [LICENSE](LICENSE).

---

# search-visibility-kit (Español)

Conectá Claude (Cowork / Claude Code / cualquier cliente MCP) con **Google Search Console**, **Google Analytics 4** e **IndexNow** — para cualquier sitio web, con una única configuración reutilizable.

Este plugin no reinventa servidores MCP: orquesta dos existentes y mantenidos — [google-analytics-mcp](https://github.com/googleanalytics/google-analytics-mcp) (oficial de Google) y [mcp-search-console](https://github.com/AminForou/mcp-gsc) (AminForou, MIT) — y suma el conocimiento operativo que hace que funcionen bien en muchos sitios: setup guiado de credenciales, workflows de auditoría, control de salud de sitemaps, y envío a IndexNow con verificación real de punta a punta.

## Para quién es

Tu IA ya lee tu código — esto le hace leer tu realidad de búsqueda.

Este kit es para developers dueños del *resultado* de un sitio, no solo de su código: indie hackers, freelancers con sitios de clientes, agencias chicas, cualquiera para quien el deploy es la mitad del trabajo. Si en tu organización el SEO es "problema de marketing", probablemente no es para vos — y si tenés stack SEO enterprise (Ahrefs, Semrush, equipo de datos), ya tenés respuestas con más recursos.

Qué cambia en la práctica:

- **El costo de integración colapsa.** Conectar Search Console + GA4 a un agente de IA normalmente implica leer dos repos, pelear con la autenticación de Google Cloud y debuggear WAFs, caches de CDN y entornos congelados. Ese conocimiento está destilado acá — el setup toma ~15 minutos, guiado.
- **El loop deploy → impacto se cierra donde trabajás.** Caso real del desarrollo de este kit: el sitemap de un sitio en producción llevaba seis meses congelado — Google conocía 5 de sus 34 URLs y ningún humano lo había notado. Una consulta de auditoría lo detectó y lo corrigió en la misma conversación.
- **Tu IA deja de adivinar.** "¿Cómo está mi SEO?" sin datos produce consejos genéricos. Con acceso vivo a GSC/GA4, las respuestas citan tus queries, CTR, posiciones y cobertura de indexación reales.
- **N sitios, configuración marginal cero.** Una service account, dos clicks por sitio nuevo. Las auditorías se vuelven un entregable facturable sobre las APIs gratuitas de Google.

## Qué incluye

| Skill | Qué hace |
|---|---|
| `setup-google-access` | Setup guiado por única vez: proyecto de Google Cloud, service account, permisos por sitio, variables de entorno, solución de problemas. |
| `seo-audit` | Auditoría basada en datos: queries de marca vs no-marca, oportunidades de CTR, detección de sitemaps desactualizados, cobertura de indexación, mix de canales e higiene de GA4. |
| `indexnow` | Script Node sin dependencias (generación de clave, envío por sitemap) más un playbook de verificación para los problemas reales de producción: 404 cacheados en el CDN, bloqueo por user-agent en el WAF, fallback de SPA. |
| `onboard-site` | Checklist repetible para sumar cualquier sitio nuevo al stack completo en minutos. |

## Instalación

```
/plugin marketplace add PapiScholz/search-visibility-kit
/plugin install search-visibility-kit@papischolz
```

## Requisitos

- [uv](https://docs.astral.sh/uv/) instalado (`uvx` ejecuta ambos servidores MCP)
- Node 18+ (solo para el script de IndexNow)
- Dos variables de entorno: `GOOGLE_SA_KEY_PATH` (ruta absoluta al JSON de la service account) y `GOOGLE_CLOUD_PROJECT_ID` (ID del proyecto de Google Cloud)

¿No tenés clave? Dos caminos: ejecutá la skill `setup-google-access` y Claude te guía de forma interactiva (~10 minutos, gratis), o seguí el paso a paso manual de [SETUP.md](SETUP.md) — que además cubre clientes MCP sin Claude (Cursor, etc.) y el alta en Bing Webmaster Tools.

## Reutilización entre sitios

La decisión central de diseño: una sola service account, agregada como usuario en Search Console y GA4 de cada sitio. Sumar el sitio n.° 2 (o 20) son dos clicks en las UIs de Google y cero cambios de configuración acá. Ejecutá `onboard-site` por sitio.

## Limitaciones honestas

- Los datos de Search Console tienen ~2 días de retraso por diseño. El realtime de GA4 cubre los últimos 30 minutos.
- IndexNow llega a Bing, Yandex, Seznam y Naver. **Google ignora IndexNow** — para Google, este kit envía tu sitemap vía Search Console.
- Un HTTP 200 de IndexNow es un acuse de recibo, no prueba de procesamiento. La skill `indexnow` verifica la cadena completa y te lleva a Bing Webmaster Tools para la confirmación real.

## Licencia

MIT — ver [LICENSE](LICENSE).
