// api/download-pdf.js

function tryJSON(str) {
  try {
    const o = JSON.parse(str);
    if (o && typeof o === "object" && (o.data || o.dataUri || o.url) && o.filename) return o;
  } catch (_) {}
  return null;
}

function b64Pad(s) {
  let x = s;
  const r = x.length % 4;
  if (r === 2) x += "==";
  else if (r === 3) x += "=";
  else if (r === 1) x += "==="; // por si viene muy mal
  return x;
}

function b64Clean(s) {
  // deja sólo chars base64 (aceptando url-safe) y '='
  return s.replace(/[^A-Za-z0-9+/_=-]/g, "");
}

function decodeB64Variants(raw) {
  const out = [];
  // normal
  try { out.push(Buffer.from(raw, "base64").toString("utf8")); } catch(_) {}
  // con padding
  try { out.push(Buffer.from(b64Pad(raw), "base64").toString("utf8")); } catch(_) {}
  // url-safe nativo
  try { out.push(Buffer.from(raw, "base64url").toString("utf8")); } catch(_) {}
  // url-safe manual (+ /) y padding
  try {
    const norm = b64Pad(raw.replace(/-/g, "+").replace(/_/g, "/"));
    out.push(Buffer.from(norm, "base64").toString("utf8"));
  } catch(_) {}
  // limpiando caracteres raros
  try {
    const clean = b64Clean(raw);
    out.push(Buffer.from(b64Pad(clean), "base64").toString("utf8"));
  } catch(_) {}
  return out;
}

function decodePayload(pRaw) {
  const seen = new Set();
  const cand = [];

  // 0) original
  let s = String(pRaw);
  cand.push(s);

  // 1) decodificar URL hasta 5 veces acumulando variantes
  let cur = s;
  for (let i = 0; i < 5; i++) {
    try {
      const dec = decodeURIComponent(cur);
      if (dec === cur) break;
      cur = dec;
      cand.push(cur);
    } catch (_) { break; }
  }

  // 2) sobre cada candidato, añadir variantes:
  const more = [];
  for (const c of cand) {
    // espacios -> '+'
    more.push(c.replace(/\s/g, "+"));
    // url-safe → normal
    more.push(c.replace(/-/g, "+").replace(/_/g, "/"));
    // ambas
    more.push(c.replace(/\s/g, "+").replace(/-/g, "+").replace(/_/g, "/"));
  }
  cand.push(...more);

  // 3) probar parseo directo por si viniera JSON claro
  for (const c of cand) {
    if (seen.has(c)) continue; seen.add(c);
    const o = tryJSON(c);
    if (o) return o;
  }

  // 4) probar todas las variantes base64 posibles sobre los candidatos
  for (const c of cand) {
    if (seen.has(c)) continue; seen.add(c);
    const texts = decodeB64Variants(c);
    for (const t of texts) {
      const o = tryJSON(t);
      if (o) return o;
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).send("Use GET");
  }

  const p = req.query?.p;
  if (!p) return res.status(400).send("Missing 'p' parameter");

  try {
    const payload = decodePayload(p);
    if (!payload) return res.status(400).send("Bad 'p' payload");

    const filename = String(payload.filename || "archivo.pdf").replace(/"/g, "");
    const contentType = String(payload.contentType || "application/pdf");

    // a) dataUri
    if (payload.dataUri && /^data:/.test(payload.dataUri)) {
      const base64 = payload.dataUri.split(",")[1] || "";
      const buf = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(buf);
    }

    // b) data base64
    if (payload.data) {
      const buf = Buffer.from(String(payload.data), "base64");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(buf);
    }

    // c) url remota
    if (payload.url) {
      const resp = await fetch(String(payload.url));
      const arr = await resp.arrayBuffer();
      const buf = Buffer.from(arr);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(buf);
    }

    return res.status(400).send("No file data in payload");
  } catch (e) {
    console.error(e);
    return res.status(500).send("Error preparando la descarga");
  }
}

