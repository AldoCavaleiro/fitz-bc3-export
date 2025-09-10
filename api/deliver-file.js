// api/deliver-file.js
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const { filename, contentType, encoding, data } = req.body || {};
    if (!filename || !contentType || !data) {
      return res.status(400).json({ error: "Missing fields in body" });
    }

    const buffer =
      encoding === "base64" ? Buffer.from(data, "base64") : Buffer.from(data, "utf8");

    res.setHeader("Content-Type", contentType);
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(buffer);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error delivering file" });
  }
}
