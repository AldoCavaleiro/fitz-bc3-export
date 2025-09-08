// api/download-pdf.js

function decodePayload(p) {
  // Intentamos base64url y luego base64 normal
  const tries = ["base64url", "base64"];
  for (const enc of tries) {
    try {
      const raw = Buffer.from(p, enc).toString("utf8");
      const obj = JSON.parse(raw);
      if (obj && typeof obj === "object" && obj.filename && obj.data) return obj;
    } catch (e) {}
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
    const payload = decodePayload(String(p));
    if (!payload) return res.status(400).send("Bad 'p' payload");

    const { filename = "archivo.pdf", contentType = "application/pdf", data } = payload;

    const buf = Buffer.from(String(data), "base64");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${String(filename).replace(/"/g, "")}"`);
    return res.status(200).send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Error preparando la descarga");
  }
}
