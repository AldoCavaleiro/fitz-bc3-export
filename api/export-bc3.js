// api/export-bc3.js
import { toBC3 } from './toBC3.js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const project = (req.body && typeof req.body === "object") ? req.body : {};
    const bc3Text = toBC3(project);

    const buffer = Buffer.from(bc3Text, "utf8");
    const base64Data = buffer.toString("base64");
    const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

    return res.status(200).json({
      filename,
      contentType: "application/octet-stream",
      encoding: "base64",
      data: base64Data
    });
  } catch (e) {
    console.error('export-bc3 error:', e);
    return res.status(500).json({ error: "Error generating BC3" });
  }
}
