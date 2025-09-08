// api/download-pdf.js

function tryParsePayload(str) {
  try {
    const obj = JSON.parse(str);
    if (obj && typeof obj === "object" && obj.filename && (obj.data || obj.dataUri || obj.url)) {
      return obj;
    }
  } catch (_) {}
  return null;
}

function decodeBase64Loose(b64) {
  // Normaliza padding
  let s = b64;
  const pad = s.length % 4;
  if (pad === 2) s += "==";
  else if (pad === 3) s += "=";
  else if (pad === 1) s += "==="; // por si viniera muy roto
  return Buffer.from(s, "base64").toString("utf8");
}

function decodePayload(pRaw) {
  // 1) empezamos con lo que vino
  const candidates = new Set();
  let s = String(pRaw);

  // 2) prueba a decodificar URL 1 o 2 veces
  try { s = decodeURIComponent(s); } catch (_) {}
  candidates.add(s);
  try { candidates.add(decodeURIComponent(s)); } catch (_) {}

  // 3) variantes por espacios/mas: (chat a veces convierte + ↔ espacio)
  candidates.add(s.replace(/\s/g, "+"));

  // 4) variantes base64url → base64
  const url2b64 = (x) => x.replace(/-/g, "+").replace(/_/g, "/");
  candidates.add(url2b64(s));
  candidates.add(url2b64(s.replace(/\s/g, "+")));

  // 5) intentos de parseo:
  for (const cand of candidates) {
    // a) intento base64 “normalizado”
    try {
      const txt = decodeBase64Loose(cand);
      const obj = tryParsePayload(txt);
      if (obj) return obj;
    } catch (_) {}

    // b) intento "base64url" nativo (por si el runtime lo soporta)
    try {
      const txt = Buffer.from(cand, "base64url").toString("utf8");
      const obj = tryParsePayload(txt);
      if (obj) return obj;
    } catch (_) {}

    // c) por si ya viniera en claro (raro, pero no cuesta)
    const obj = tryParsePayload(cand);
    if (obj) return obj;
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

    // 1) si viene dataUri
    if (payload.dataUri && /^data:/.test(payload.dataUri)) {
      const base64 = payload.dataUri.split(",")[1] || "";
      const buf = Buffer.from(base64, "base64");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(buf);
    }

    // 2) si viene base64 “data”
    if (payload.data) {
      const buf = Buffer.from(String(payload.data), "base64");
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      return res.status(200).send(buf);
    }

    // 3) si viene una url a un binario
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

