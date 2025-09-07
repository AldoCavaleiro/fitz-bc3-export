// api/export-pdf.js
import { toPDF } from "./toPDF.js";

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
    const spec = req.body && typeof req.body === "object" ? req.body : {};
    const { bytes, filename, contentType } = await toPDF(spec);

    const base64 = Buffer.from(bytes).toString("base64");
    const payloadB64 = Buffer.from(JSON.stringify(spec), "utf8").toString("base64");
    const baseUrl = "https://fitz-bc3-export.vercel.app"; // tu dominio en vercel
    const url = `${baseUrl}/api/download-pdf?p=${encodeURIComponent(payloadB64)}`;

    return res.status(200).json({
      filename,
      contentType,        // application/pdf
      encoding: "base64",
      data: base64,
      url                  // descarga directa
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generating PDF" });
  }
}
