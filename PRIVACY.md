# Privacy Policy

_Last updated: 2026-07-28_

**search-visibility-kit does not collect, store, or transmit any data to its author or to any third party operated by its author.** There are no analytics, no telemetry, no accounts, and no servers run by this project.

## How your data flows

- **Credentials** (your Google Cloud service account JSON key) live only on your machine, at a path you choose, referenced through local environment variables (`GOOGLE_SA_KEY_PATH`, `GOOGLE_CLOUD_PROJECT_ID`). This plugin never reads, copies, uploads, or logs them.
- **Search Console and Google Analytics data** flows directly between your machine and Google's APIs, using MCP servers that run locally as child processes (the official [google-analytics-mcp](https://github.com/googleanalytics/google-analytics-mcp) and the community [mcp-search-console](https://github.com/AminForou/mcp-gsc)). No intermediary service is involved.
- **IndexNow submissions** are sent by the bundled script directly from your machine to `api.indexnow.org`. The submitted URLs and your IndexNow key (public by design) are the only data transmitted, and only when you run the script.
- The optional `--state` file for IndexNow delta submissions is a local JSON file on your machine containing only the URLs you already submitted.

## Third parties you do interact with

Using this plugin means your machine talks directly to: Google APIs (subject to [Google's Privacy Policy](https://policies.google.com/privacy)), the IndexNow endpoint operated by Microsoft Bing (subject to [Microsoft's Privacy Statement](https://privacy.microsoft.com/privacystatement)), and PyPI when `uvx` downloads the MCP server packages. This plugin adds no data flows beyond those.

## Your AI client

Data returned by the MCP servers (search queries, traffic metrics, etc.) is processed by whatever AI client you connect the plugin to (Claude or another MCP client), under that client's own privacy terms. That is inherent to how MCP works and applies to any MCP integration, not just this one.

## Contact

Questions: open an issue at https://github.com/PapiScholz/search-visibility-kit/issues

---

# Política de privacidad (Español)

_Última actualización: 2026-07-28_

**search-visibility-kit no recolecta, almacena ni transmite ningún dato a su autor ni a terceros operados por su autor.** No hay analytics, ni telemetría, ni cuentas, ni servidores de este proyecto.

## Cómo fluyen tus datos

- **Las credenciales** (el JSON de tu service account de Google Cloud) viven solo en tu máquina, en una ruta que vos elegís, referenciada por variables de entorno locales. Este plugin nunca las lee para sí, copia, sube ni loguea.
- **Los datos de Search Console y Google Analytics** fluyen directamente entre tu máquina y las APIs de Google, mediante servidores MCP que corren localmente como procesos hijos. No hay ningún servicio intermediario.
- **Los envíos de IndexNow** salen del script incluido directamente desde tu máquina hacia `api.indexnow.org`, solo cuando vos lo ejecutás. El archivo opcional de estado (`--state`) es un JSON local con las URLs ya enviadas.

## Terceros con los que sí interactuás

Usar este plugin implica que tu máquina hable directamente con: las APIs de Google (bajo la política de privacidad de Google), el endpoint de IndexNow operado por Microsoft Bing, y PyPI cuando `uvx` descarga los paquetes. Este plugin no agrega ningún flujo de datos más allá de esos.

## Tu cliente de IA

Los datos que devuelven los servidores MCP son procesados por el cliente de IA al que conectes el plugin (Claude u otro), bajo los términos de privacidad de ese cliente. Eso es inherente a cómo funciona MCP y aplica a cualquier integración MCP, no solo a esta.

## Contacto

Consultas: https://github.com/PapiScholz/search-visibility-kit/issues
