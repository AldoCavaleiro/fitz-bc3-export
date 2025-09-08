// api/download-pdf.js

function tryJSON(str) {
  try {
    const o = JSON.parse(str);
    if (o && typeof o === "object") return o;
  } catch (_) {}
  return null;
}

function b64Pad(s) {
  let x = s;
  const r = x.length % 4;
  if (r === 2) x += "==";
  else if (r === 3) x += "=";
  else if (r === 1) x += "===";
  return x;
}
function b64Clean(s) {
  return s.replace(/[^A-Za-z0-9+/_=-]/g, "");
}
function decodeB64Variants(raw) {
  const out = [];
  try { out.push(Buffer.from(raw, "base64").toString("utf8")); } catch(_) {}
  try { out.push(Buffer.from(b64Pad(raw), "base64").toString("utf8")); } catch(_) {}
  try { out.push(Buffer.from(raw, "base64url").toString("utf8")); } catch(_) {}
  try {
    const norm = b64Pad(raw.replace(/-/g, "+").replace(/_/g, "/"));
    out.push(Buffer.from(norm, "base64").toString("utf8"));
  } catch(_) {}
  try {
    const clean = b64Clean(raw);
    out.push(Buffer.from(b64Pad(clean), "base64").toString("utf8"));
  } catch(_) {}
  return out;
}

function decodePayloadFromQuery(pRaw) {
  const seen = new Set();
  const cand = [];

  let s = String(pRaw);
  cand.push(s);

  // hasta 5 decodificaciones URL acumuladas
  let cur = s;
  for (let i = 0; i < 5; i++) {
    try {
      const dec = decodeURIComponent(cur);
      if (dec === cur) break;
      cur = dec;
      cand.push(cur);
    } catch (_) { break; }
  }

  const more = [];
  for (const c of cand) {
    more.push(c.replace(/\s/g, "+")); // espacios→+
    more.push(c.replace(/-/g, "+").replace(/_/g, "/")); // url-safe→normal
    more.push(c.replace(/\s/g, "+").replace(/-/g, "+").replace(/_/g, "/"));
  }
  cand.push(...more);

  // probar JSON directo
  for (const c of cand) {
    if (seen.has(c)) continue; seen.add(c);
    const o = tryJSON(c);
    if (o && (o.data || o.dataUri || o.url) && o.filename) return o;
  }
  // probar JSON tras base64 (todas variantes)
  for (const c of cand) {
    if (seen.has(c)) continue; seen.add(c);
    const decs = decodeB64Variants(c);
    for (const t of decs) {
      const o = tryJSON(t);
      if (o && (o.data || o.dataUri || o.url) && o.filename) return o;
    }
  }
  return null;
}

async function sendFile(res, payload) {
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
}

export default async function handler(req, res) {
  try {
    if (req.method === "POST") {
      const body = req.body || {};
      if (!body || !(body.data || body.dataUri || body.url) || !body.filename) {
        return res.status(400).json({ error: "Bad body" });
      }
      return await sendFile(res, body);
    }

    if (req.method === "GET") {
      const p = req.query?.p;
      if (!p) return res.status(400).send("Missing 'p' parameter");
      const payload = decodePayloadFromQuery(p);
      if (!payload) return res.status(400).send("Bad 'p' payload");
      return await sendFile(res, payload);
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).send("Use GET or POST");
  } catch (e) {
    console.error(e);
    return res.status(500).send("Error preparando la descarga");
  }
}


