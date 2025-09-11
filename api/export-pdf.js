// api/export-pdf.js
export const config = { runtime: "nodejs" };

import { createPdf } from "./toPDF.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};

    // Genera PDF (Uint8Array)
    const pdfBytes = await createPdf(body);

    // Pasa a base64
    const base64 = Buffer.from(pdfBytes).toString("base64");

    // Nombre de archivo
    const filename = (body.filename || "documento") + ".pdf";

    return res.status(200).json({
      filename,
      contentType: "application/pdf",
      encoding: "base64",
      data: base64
    });
  } catch (e) {
    console.error("EXPORT_PDF_FAILED:", e);
    return res.status(500).json({
      error: "EXPORT_PDF_FAILED",
      detail: String(e && e.stack ? e.stack : e)
    });
  }
}
