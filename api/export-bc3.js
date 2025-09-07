// api/export-bc3.js
import { toBC3 } from "./toBC3.js";

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const project = req.body && typeof req.body === "object" ? req.body : {};

    // Para compatibilidad seguimos devolviendo el base64 (por si GPT lo adjunta)
    let bc3Text = toBC3(project).replace(/\r?\n/g, "\r\n");
    if (!bc3Text.endsWith("\r\n")) bc3Text += "\r\n";
    const base64Data = Buffer.from(bc3Text, "latin1").toString("base64");
    const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

    // Además devolvemos una URL de descarga directa
    const payloadB64 = Buffer.from(JSON.stringify(project), "utf8").toString("base64");
    const baseUrl = "https://fitz-bc3-export.vercel.app";
    const url = `${baseUrl}/api/download-bc3?p=${encodeURIComponent(payloadB64)}`;

    return res.status(200).json({
      filename,
      contentType: "application/octet-stream",
      encoding: "base64",
      data: base64Data,     // el GPT puede intentar adjuntar
      url                   // y siempre tendrás este enlace directo
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generating BC3" });
  }
}
