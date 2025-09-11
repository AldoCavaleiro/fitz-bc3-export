// api/export-pdf-file.js
// Runtime Node (NO edge). Asegúrate de que package.json tiene "type": "module"
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Pequeño helper para normalizar/asegurar strings
const s = (v, def = "") => (v == null ? def : String(v));

export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    const body = req.body || {};
    // Valores por defecto para evitar undefined
    const title    = s(body.title, "Memoria técnica");
    const subtitle = s(body.subtitle, "");
    const dateStr  = s(body.date, new Date().toISOString().slice(0, 10));
    const footer   = s(body.footer, "");
    const filename = s(body.filename, "documento.pdf").trim() || "documento.pdf";

    // Secciones normalizadas
    const rawSections = Array.isArray(body.sections) ? body.sections : [];
    const sections = rawSections.map(sec => ({
      heading: s(sec?.heading, ""),
      body:    s(sec?.body, "")
    }));

    if (sections.length === 0) {
      // Permitimos PDF “vacío” pero avisamos; si prefieres, cambia a 400
      // res.status(400).json({ error: "sections vacío: se requiere al menos 1 sección" }); return;
    }

    // Generar PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 (pt)
    const { width, height } = page.getSize();

    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Márgenes y tipografías
    const margin = 50;
    let y = height - margin;

    // Título
    if (title) {
      page.drawText(title, {
        x: margin,
        y,
        size: 22,
        font: fontBold,
        color: rgb(0, 0, 0),
      });
      y -= 28;
    }

    // Subtítulo
    if (subtitle) {
      page.drawText(subtitle, {
        x: margin,
        y,
        size: 14,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15),
      });
      y -= 22;
    }

    // Fecha
    if (dateStr) {
      page.drawText(dateStr, {
        x: margin,
        y,
        size: 10,
        font: fontRegular,
        color: rgb(0.25, 0.25, 0.25),
      });
      y -= 20;
    }

    // Separador
    page.drawLine({
      start: { x: margin, y: y },
      end:   { x: width - margin, y: y },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });
    y -= 16;

    // Función para añadir página nueva si no cabe más texto
    const newPage = () => {
      const p = pdfDoc.addPage([595.28, 841.89]);
      y = p.getSize().height - margin;
      return p;
    };
    let currentPage = page;

    // Dibuja cada sección
    const wrapText = (text, maxWidth, size, font) => {
      if (!text) return [""];
      const words = text.split(/\s+/);
      const lines = [];
      let line = "";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        const wWidth = font.widthOfTextAtSize(test, size);
        if (wWidth > maxWidth && line) {
          lines.push(line);
          line = w;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      return lines;
    };

    for (const sec of sections) {
      // Heading
      if (y < margin + 80) currentPage = newPage();
      if (sec.heading) {
        currentPage.drawText(sec.heading, {
          x: margin,
          y,
          size: 13,
          font: fontBold,
          color: rgb(0.05, 0.05, 0.05),
        });
        y -= 18;
      }

      // Body (con ajuste de línea sencillo)
      if (sec.body) {
        const lines = wrapText(sec.body, (width - margin * 2), 11, fontRegular);
        for (const line of lines) {
          if (y < margin + 40) currentPage = newPage();
          currentPage.drawText(line, {
            x: margin,
            y,
            size: 11,
            font: fontRegular,
            color: rgb(0, 0, 0),
          });
          y -= 14;
        }
        y -= 6;
      }
    }

    // Footer
    if (footer) {
      const textWidth = fontRegular.widthOfTextAtSize(footer, 9);
      const fx = Math.max(margin, (width - textWidth) / 2);
      currentPage.drawText(footer, {
        x: fx,
        y: margin - 10,
        size: 9,
        font: fontRegular,
        color: rgb(0.35, 0.35, 0.35),
      });
    }

    const pdfBytes = await pdfDoc.save();

    // Enviamos BINARIO (descarga directa)
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/"/g, "")}"`);
    res.status(200).send(Buffer.from(pdfBytes));
  } catch (err) {
    // Log útil para Vercel
    console.error("PDF export error:", err);
    // Respondemos sin reventar la función
    res.status(500).json({
      error: "PDF_GENERATION_FAILED",
      details: err?.message || String(err),
    });
  }
}
