// api/export-pdf.js
import { toPDF } from './toPDF.js';

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const payload = (req.body && typeof req.body === "object") ? req.body : {};
    // toPDF debe devolverte un Buffer con el PDF generado
    const pdfBuffer = await toPDF(payload);

    const base64Data = pdfBuffer.toString("base64");
    const filename = (payload.filename || "documento").replace(/\s+/g, "_") + ".pdf";

    return res.status(200).json({
      filename,
      contentType: "application/pdf",
      encoding: "base64",
      data: base64Data
    });
  } catch (e) {
    console.error('export-pdf error:', e);
    return res.status(500).json({ error: "Error generating PDF" });
  }
}
