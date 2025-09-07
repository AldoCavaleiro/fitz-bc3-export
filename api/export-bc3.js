// api/export-bc3.js
import { toBC3 } from './toBC3.js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const project = req.body && typeof req.body === "object" ? req.body : {};
    let bc3Text = toBC3(project)
      .replace(/\r?\n/g, "\r\n");           // normaliza CRLF
    if (!bc3Text.endsWith("\r\n")) bc3Text += "\r\n";

    // IMPORTANTE: latin1 para BC3
    const base64Data = Buffer.from(bc3Text, "latin1").toString("base64");

    const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

    return res.status(200).json({
      filename,
      contentType: "application/octet-stream",
      encoding: "base64",                 // <- ayuda a Actions a tratarlo como fichero
      data: base64Data
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generating BC3" });
  }
}
