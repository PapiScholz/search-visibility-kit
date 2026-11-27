# Manual setup guide — step by step

Full walkthrough to connect any MCP client (Claude Code, Claude Desktop/Cowork, Cursor, etc.) to your own Google Search Console and Google Analytics 4 accounts, plus Bing Webmaster Tools for IndexNow visibility. If you use Claude with this plugin installed, you can skip reading: run the `setup-google-access` skill and Claude walks you through these exact steps interactively.

*(Versión en español más abajo.)*

## 1. Google Cloud project (once, ~10 minutes, free)

1. Go to https://console.cloud.google.com/ and create a project (e.g. `seo-mcp`). Note the **Project ID**.
2. Enable three APIs (APIs & Services → Library):
   - Google Search Console API
   - Google Analytics Data API
   - Google Analytics Admin API
3. Create a service account: APIs & Services → Credentials → Create credentials → **Service account**. Any name (e.g. `seo-bot`). No project roles needed.
4. Open the service account → **Keys** tab → Add key → Create new key → **JSON** → download.
5. Save the JSON in a permanent local path, ideally outside cloud-synced folders (it contains a private key).
6. Note the service account **email** (`seo-bot@your-project.iam.gserviceaccount.com`). This email is all you need to add more sites later.

## 2. Grant access per website (2 minutes per site)

**Search Console** (https://search.google.com/search-console) — property must exist and be verified first:

- Settings → Users and permissions → Add user → paste the service account email → **Full** permission (or Restricted for read-only).

**Google Analytics 4** (https://analytics.google.com):

- Admin → Property column → **Property access management** → "+" → Add users → paste the service account email → **Viewer** role (least privilege; use Editor only if you have a concrete write use case).

## 3. Plugin settings

When you enable the plugin, Claude Code asks for two values:

| Setting | Value |
|---|---|
| Google service account key | The JSON key file from step 1. Stored in your system's secure credential store |
| Google Cloud project ID | Your Google Cloud Project ID (also `project_id` inside the key file) |

The project ID can be changed later in Claude Code's `/config` panel. After changing a value, fully restart your Claude client so the MCP servers start with it.

Upgrading from 0.3.x: the plugin no longer reads the `GOOGLE_SA_KEY_PATH` and `GOOGLE_CLOUD_PROJECT_ID` environment variables. Enter the same two values in the prompt, then you can remove the variables.

Requirement: [uv](https://docs.astral.sh/uv/) installed — `uvx` runs both servers, no Python management needed.

## 4. Non-plugin clients (Cursor, plain MCP config)

If your client does not support Claude plugins, declare the servers directly (same shape as this repo's `.mcp.json`):

```json
{
  "mcpServers": {
    "gsc": {
      "command": "uvx",
      "args": ["--from", "mcp-search-console==0.3.3", "mcp-search-console"],
      "env": {
        "GSC_CREDENTIALS_PATH": "/absolute/path/to/key.json",
        "GSC_SKIP_OAUTH": "true"
      }
    },
    "analytics": {
      "command": "uvx",
      "args": ["--from", "analytics-mcp==0.7.0", "analytics-mcp"],
      "env": {
        "GOOGLE_APPLICATION_CREDENTIALS": "/absolute/path/to/key.json",
        "GOOGLE_PROJECT_ID": "your-project-id"
      }
    }
  }
}
```

GUI clients often ignore your shell PATH — if you get `spawn uvx ENOENT`, replace `"uvx"` with the full binary path (`which uvx` / `Get-Command uvx`).

## 5. Verify

Ask your AI: "List my Search Console properties" and "Show my Google Analytics account summaries". Both should return your data. Empty results usually mean step 2 was missed for that property, or the GA4 grant was made at account level instead of property level.

## 6. Bing Webmaster Tools (for IndexNow ground truth)

1. Go to https://www.bing.com/webmasters and sign in.
2. Choose **Import from Google Search Console** — one click, no manual verification.
3. The **IndexNow** panel there is the only place submissions are confirmed as processed (an HTTP 200 from the API is just an acknowledgment). Note: if your site is behind Cloudflare with Crawler Hints enabled, Cloudflare auto-submits too — the Sources chart separates its submissions from yours.

There is no MCP integration for Bing Webmaster Tools in this kit; it is a one-time manual registration used as a verification dashboard.

---

# Guía de configuración manual — paso a paso (Español)

Recorrido completo para conectar cualquier cliente MCP (Claude Code, Claude Desktop/Cowork, Cursor, etc.) a tus propias cuentas de Google Search Console y Google Analytics 4, más Bing Webmaster Tools para visibilidad de IndexNow. Si usás Claude con este plugin instalado, podés saltear la lectura: ejecutá la skill `setup-google-access` y Claude te guía por estos mismos pasos de forma interactiva.

## 1. Proyecto de Google Cloud (una vez, ~10 minutos, gratis)

1. Entrá a https://console.cloud.google.com/ y creá un proyecto (ej. `seo-mcp`). Anotá el **Project ID**.
2. Habilitá tres APIs (APIs y servicios → Biblioteca): Google Search Console API, Google Analytics Data API, Google Analytics Admin API.
3. Creá una service account: APIs y servicios → Credenciales → Crear credenciales → **Cuenta de servicio**. Sin roles de proyecto.
4. Abrí la cuenta de servicio → pestaña **Claves** → Agregar clave → Crear clave nueva → **JSON** → descargar.
5. Guardá el JSON en una ruta local permanente, idealmente fuera de carpetas sincronizadas a la nube (contiene una clave privada).
6. Anotá el **email** de la service account (`seo-bot@tu-proyecto.iam.gserviceaccount.com`). Es lo único que necesitás para sumar más sitios.

## 2. Dar acceso por sitio (2 minutos por sitio)

**Search Console** (la propiedad debe existir y estar verificada): Configuración → Usuarios y permisos → Agregar usuario → email de la service account → permiso **Completo** (o Restringido para solo lectura).

**Google Analytics 4**: Administrar → columna Propiedad → **Administración de acceso a la propiedad** → "+" → Agregar usuarios → email de la service account → rol **Lector** (mínimo privilegio; Editor solo con un caso de uso concreto de escritura).

## 3. Configuración del plugin

Al habilitar el plugin, Claude Code pide dos valores: el **archivo JSON de la service account** (se guarda en el almacén seguro de credenciales del sistema) y el **ID del proyecto de Google Cloud** (también es `project_id` dentro del JSON). El ID del proyecto se puede cambiar después en el panel `/config` de Claude Code; después de cambiar un valor, reiniciá el cliente por completo.

Si venís de 0.3.x: el plugin ya no lee las variables de entorno `GOOGLE_SA_KEY_PATH` y `GOOGLE_CLOUD_PROJECT_ID`. Cargá los mismos dos valores en el diálogo y después podés borrar las variables. Requisito: [uv](https://docs.astral.sh/uv/) instalado.

## 4. Clientes sin soporte de plugins

Usá el bloque JSON de la sección 4 en inglés — es la misma forma que el `.mcp.json` de este repo. Si aparece `spawn uvx ENOENT`, reemplazá `"uvx"` por la ruta completa al binario.

## 5. Verificar

Pedile a tu IA: "listá mis propiedades de Search Console" y "mostrame mis cuentas de Google Analytics". Resultados vacíos = falta el paso 2 en esa propiedad, o el permiso de GA4 se dio a nivel cuenta en vez de propiedad.

## 6. Bing Webmaster Tools (la verdad sobre IndexNow)

Entrá a https://www.bing.com/webmasters → **Importar desde Google Search Console** (un click). El panel **IndexNow** es el único lugar donde se confirma el procesamiento de los envíos (el HTTP 200 de la API es solo acuse de recibo). Si tu sitio usa Cloudflare con Crawler Hints, Cloudflare también auto-envía — el gráfico de Sources separa sus envíos de los tuyos.
