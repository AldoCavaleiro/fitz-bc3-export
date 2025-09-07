// api/export-bc3.js
import { toBC3 } from './toBC3.js';

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCORS(res);

  // Preflight CORS
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const project = req.body && typeof req.body === "object" ? req.body : {};

    // Generar texto BC3 y normalizar CRLF
    let bc3Text = toBC3(project).replace(/\r?\n/g, "\r\n");
    if (!bc3Text.endsWith("\r\n")) bc3Text += "\r\n";

    // Codificar como latin1 (ISO-8859-1) y devolver en base64
    const base64Data = Buffer.from(bc3Text, "latin1").toString("base64");

    const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

    return res.status(200).json({
      filename,
      contentType: "application/octet-stream",
      encoding: "base64",
      data: base64Data
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generating BC3" });
  }
}
