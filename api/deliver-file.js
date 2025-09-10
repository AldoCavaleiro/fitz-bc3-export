// api/deliver-file.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const { filename, contentType, encoding, data } = req.body || {};
    if (!filename || !contentType || !data || encoding !== "base64") {
      return res.status(400).json({ error: "Bad body. Required: { filename, contentType, encoding:'base64', data }" });
    }
    const buf = Buffer.from(String(data), "base64");
    const safe = String(filename).replace(/[^a-zA-Z0-9._-]/g, "_");
    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${safe}"`);
    res.setHeader("Content-Length", buf.length);
    return res.status(200).send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error preparando la descarga" });
  }
}
