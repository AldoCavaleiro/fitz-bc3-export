// api/deliver-file.js
export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const { filename, contentType, encoding, data } = req.body || {};
    if (!filename || !contentType || encoding !== "base64" || !data) {
      return res.status(400).json({ error: "BAD_PAYLOAD" });
    }

    const buffer = Buffer.from(data, "base64");
    res.setHeader("Content-Type", contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename.replace(/"/g, "")}"`
    );
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("DELIVER_FILE_FAILED:", e);
    return res.status(500).json({ error: "DELIVER_FILE_FAILED" });
  }
}
