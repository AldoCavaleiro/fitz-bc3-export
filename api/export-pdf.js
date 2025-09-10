// api/export-pdf.js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const {
      title = "Documento",
      subtitle = "",
      date = new Date().toISOString().slice(0, 10),
      sections = [], // [{ heading, body }]
      footer = "",
      filename = "documento.pdf"
    } = req.body || {};

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4
    const { width, height } = page.getSize();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    let y = height - 60;
    const marginX = 50;
    const maxWidth = width - marginX * 2;

    // Título
    page.drawText(String(title), { x: marginX, y, size: 20, font: bold, color: rgb(0,0,0) });
    y -= 26;

    // Subtítulo
    if (subtitle) {
      page.drawText(String(subtitle), { x: marginX, y, size: 12, font, color: rgb(0.2,0.2,0.2) });
      y -= 18;
    }

    // Fecha
    if (date) {
      page.drawText(String(date), { x: marginX, y, size: 10, font, color: rgb(0.3,0.3,0.3) });
      y -= 20;
    }

    // Línea
    page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: rgb(0.8,0.8,0.8) });
    y -= 18;

    // Utilidad wrap
    const wrap = (text, size = 11) => {
      const words = String(text || "").split(/\s+/);
      const lines = [];
      let line = "";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        if (font.widthOfTextAtSize(test, size) > maxWidth) {
          if (line) lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    };

    // Secciones
    for (const sec of Array.isArray(sections) ? sections : []) {
      if (sec.heading) {
        page.drawText(String(sec.heading), { x: marginX, y, size: 13, font: bold, color: rgb(0,0,0) });
        y -= 16;
      }
      const lines = wrap(sec.body || "");
      for (const ln of lines) {
        if (y < 60) break; // (versión simple: 1 página)
        page.drawText(ln, { x: marginX, y, size: 11, font, color: rgb(0,0,0) });
        y -= 14;
      }
      y -= 6;
    }

    if (footer) {
      page.drawText(String(footer), { x: marginX, y: 40, size: 10, font, color: rgb(0.35,0.35,0.35) });
    }

    const pdfBytes = await pdf.save();
    const data = Buffer.from(pdfBytes).toString("base64");

    return res.status(200).json({
      filename,
      contentType: "application/pdf",
      encoding: "base64",
      data
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generando el PDF" });
  }
}

