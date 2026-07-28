#!/usr/bin/env node
/**
 * indexnow.mjs — Notifica URLs a IndexNow (Bing, Yandex, Seznam, Naver).
 * Sin dependencias. Requiere Node 18+.
 *
 * Uso:
 *   node indexnow.mjs generar-clave
 *   node indexnow.mjs --host midominio.com --key MICLAVE https://midominio.com/pagina1 [mas URLs...]
 *   node indexnow.mjs --host midominio.com --key MICLAVE --sitemap https://midominio.com/sitemap.xml
 *   node indexnow.mjs --host midominio.com --key MICLAVE --sitemap https://midominio.com/sitemap.xml --state .indexnow-sent.json
 *
 * --state <archivo>: persiste las URLs ya enviadas y en cada corrida envia solo las nuevas (delta).
 *
 * La clave tambien puede pasarse via variable de entorno INDEXNOW_KEY.
 * Requisito previo: https://midominio.com/MICLAVE.txt debe existir y contener la clave.
 */

import crypto from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const ENDPOINT = "https://api.indexnow.org/indexnow";
const UA_HEADERS = { "User-Agent": "Mozilla/5.0 (compatible; IndexNowClient/1.0; +https://www.indexnow.org/)" };

function parseArgs(argv) {
  const args = { urls: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "generar-clave" || a === "generate-key") args.generate = true;
    else if (a === "--host") args.host = argv[++i];
    else if (a === "--key") args.key = argv[++i];
    else if (a === "--sitemap") args.sitemap = argv[++i];
    else if (a === "--state") args.state = argv[++i];
    else if (a.startsWith("http")) args.urls.push(a);
    else {
      console.error(`Argumento no reconocido: ${a}`);
      process.exit(1);
    }
  }
  return args;
}

async function urlsFromSitemap(sitemapUrl, seen = new Set()) {
  if (seen.has(sitemapUrl)) return [];
  seen.add(sitemapUrl);
  const res = await fetch(sitemapUrl, { headers: UA_HEADERS });
  if (!res.ok) throw new Error(`No pude leer el sitemap ${sitemapUrl}: HTTP ${res.status}`);
  const xml = await res.text();
  const locs = [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]);
  // Si es un indice de sitemaps, resolver recursivamente
  if (/<sitemapindex/i.test(xml)) {
    const nested = await Promise.all(locs.map((u) => urlsFromSitemap(u, seen)));
    return nested.flat();
  }
  return locs;
}

async function submit(host, key, urlList) {
  const body = { host, key, urlList };
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8", ...UA_HEADERS },
    body: JSON.stringify(body),
  });
  return res;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.generate) {
    console.log(crypto.randomBytes(16).toString("hex"));
    console.log("\nGuardala como public/CLAVE.txt en tu sitio (el contenido del archivo es la clave misma).");
    return;
  }

  const key = args.key ?? process.env.INDEXNOW_KEY;
  if (!args.host || !key) {
    console.error("Faltan --host y/o --key (o INDEXNOW_KEY). Ver comentario de uso al inicio del archivo.");
    process.exit(1);
  }

  let urls = args.urls;
  if (args.sitemap) {
    console.log(`Leyendo sitemap: ${args.sitemap}`);
    urls = urls.concat(await urlsFromSitemap(args.sitemap));
  }
  urls = [...new Set(urls)];
  if (urls.length === 0) {
    console.error("No hay URLs para enviar.");
    process.exit(1);
  }

  let sentBefore = [];
  if (args.state) {
    try {
      sentBefore = JSON.parse(await readFile(args.state, "utf8"));
      if (!Array.isArray(sentBefore)) sentBefore = [];
    } catch {
      sentBefore = [];
    }
    const known = new Set(sentBefore);
    const total = urls.length;
    urls = urls.filter((u) => !known.has(u));
    console.log(`Delta: ${urls.length} URLs nuevas de ${total} (${total - urls.length} ya enviadas antes).`);
    if (urls.length === 0) {
      console.log("Nada nuevo para enviar.");
      return;
    }
  }

  // Verificar que el archivo de clave este publicado
  const keyFileUrl = `https://${args.host}/${key}.txt`;
  const check = await fetch(keyFileUrl, { headers: UA_HEADERS }).catch(() => null);
  if (!check || !check.ok) {
    console.warn(`AVISO: no pude verificar ${keyFileUrl} (el envio puede fallar con 403).`);
  }

  // IndexNow acepta hasta 10.000 URLs por POST; enviamos en lotes por prolijidad
  const BATCH = 5000;
  for (let i = 0; i < urls.length; i += BATCH) {
    const lote = urls.slice(i, i + BATCH);
    const res = await submit(args.host, key, lote);
    const okStatus = [200, 202];
    if (okStatus.includes(res.status)) {
      console.log(`OK (HTTP ${res.status}): ${lote.length} URLs enviadas.`);
    } else {
      const text = await res.text().catch(() => "");
      console.error(`Error HTTP ${res.status}: ${text || res.statusText}`);
      process.exit(1);
    }
  }
  if (args.state) {
    await writeFile(args.state, JSON.stringify([...new Set([...sentBefore, ...urls])], null, 2) + "\n");
    console.log(`Estado actualizado en ${args.state}.`);
  }
  console.log(`Listo: ${urls.length} URLs notificadas a IndexNow para ${args.host}.`);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
