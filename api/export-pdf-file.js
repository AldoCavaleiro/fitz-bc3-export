// api/export-pdf-file.js
export const config = { runtime: "nodejs" };

import { createPdf } from "./toPDF.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const pdfBytes = await createPdf(body);            // Uint8Array
    const buffer = Buffer.from(pdfBytes);
    const filename = ((body.filename || "documento").replace(/\s+/g, "_")) + ".pdf";

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("EXPORT_PDF_FILE_FAILED:", e);
    return res.status(500).json({ error: "EXPORT_PDF_FILE_FAILED" });
  }
}
