// api/toPDF.js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

/**
 * Entrada esperada (ejemplo mínimo):
 * {
 *   "title": "Memoria técnica",
 *   "subtitle": "Cabaña de madera 20x30",
 *   "date": "2025-09-07",
 *   "logo": { "src": "https://.../logo.png", "width": 120 }, // opcional
 *   "sections": [
 *     { "heading": "Objeto", "body": "Texto..." },
 *     { "heading": "Alcance", "body": "Texto..." }
 *   ],
 *   "footer": "PGM Proyectos • www.pgmproyectos.com",
 *   "filename": "memoria_cabana.pdf" // opcional
 * }
 */

export async function toPDF(spec = {}) {
  const A4 = { w: 595.28, h: 841.89 }; // puntos
  const margin = 40;

  const {
    title = "Documento",
    subtitle = "",
    date = new Date().toISOString().slice(0, 10),
    logo = null, // { src, width }
    sections = [],
    footer = "",
    filename = "documento.pdf"
  } = spec;

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([A4.w, A4.h]);

  const helv = await pdf.embedFont(StandardFonts.Helvetica);
  const helvBold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let y = A4.h - margin;

  // LOGO (PNG o JPG)
  if (logo && logo.src) {
    try {
      const resp = await fetch(logo.src);
      const arr = await resp.arrayBuffer();
      let img;
      // Intento PNG y luego JPG
      try { img = await pdf.embedPng(arr); }
      catch { img = await pdf.embedJpg(arr); }

      const maxW = typeof logo.width === "number" ? logo.width : 120;
      const scale = maxW / img.width;
      const w = maxW;
      const h = img.height * scale;
      page.drawImage(img, { x: margin, y: y - h, width: w, height: h });
      y -= h + 12; // espacio tras logo
    } catch {
      // Si falla el logo, seguimos sin romper
    }
  }

  // TÍTULO
  const titleSize = 20;
  const tw = helvBold.widthOfTextAtSize(title, titleSize);
  page.drawText(title, {
    x: margin,
    y: y - titleSize,
    size: titleSize,
    font: helvBold,
    color: rgb(0, 0, 0)
  });
  y -= titleSize + 6;

  // SUBTÍTULO + FECHA
  const sub = [subtitle, date].filter(Boolean).join("  •  ");
  if (sub) {
    const subSize = 11;
    page.drawText(sub, {
      x: margin,
      y: y - subSize,
      size: subSize,
      font: helv,
      color: rgb(0.2, 0.2, 0.2)
    });
    y -= subSize + 18;
  } else {
    y -= 10;
  }

  // SECCIONES
  const maxWidth = A4.w - margin * 2;
  const bodySize = 11;
  const headingSize = 13;
  const lineGap = 4;

  const drawWrapped = (text, font, size, x, yStart) => {
    const words = String(text).split(/\s+/);
    let line = "";
    let yLine = yStart;
    const lines = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      const width = font.widthOfTextAtSize(test, size);
      if (width > maxWidth) {
        if (line) lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);

    for (const ln of lines) {
      if (yLine < margin + 60) {
        // Nueva página si no cabe
        const p = pdf.addPage([A4.w, A4.h]);
        yLine = A4.h - margin;
      }
      page.drawText(ln, { x: margin, y: yLine - size, size, font, color: rgb(0,0,0) });
      yLine -= size + lineGap;
    }
    return yLine;
  };

  for (const sec of sections) {
    const h = sec.heading ? String(sec.heading) : "";
    const b = sec.body ? String(sec.body) : "";

    if (h) {
      page.drawText(h, {
        x: margin,
        y: y - headingSize,
        size: headingSize,
        font: helvBold,
        color: rgb(0,0,0)
      });
      y -= headingSize + 6;
    }
    if (b) {
      y = drawWrapped(b, helv, bodySize, margin, y);
      y -= 8;
    }
    y -= 6;
  }

  // LÍNEA + PIE
  if (footer) {
    page.drawLine({
      start: { x: margin, y: margin + 22 },
      end:   { x: A4.w - margin, y: margin + 22 },
      thickness: 0.5,
      color: rgb(0.7,0.7,0.7)
    });
    page.drawText(footer, {
      x: margin, y: margin + 8, size: 9, font: helv, color: rgb(0.3,0.3,0.3)
    });
  }

  const pdfBytes = await pdf.save(); // Uint8Array
  const outName = filename && filename.toLowerCase().endsWith(".pdf")
    ? filename
    : (filename || (title || "documento")).replace(/\s+/g,"_") + ".pdf";

  return { bytes: pdfBytes, filename: outName, contentType: "application/pdf" };
}
