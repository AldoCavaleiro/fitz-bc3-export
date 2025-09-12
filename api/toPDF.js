// api/toPDF.js
// Generador simple de PDF usando pdf-lib

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

async function toPDF({ title, subtitle, date, sections = [], footer }) {
  // Crear documento
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const { height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  let y = height - 50;

  // Título
  if (title) {
    page.drawText(title, { x: 50, y, size: 20, font, color: rgb(0, 0, 0) });
    y -= 30;
  }

  // Subtítulo
  if (subtitle) {
    page.drawText(subtitle, { x: 50, y, size: 16, font, color: rgb(0.1, 0.1, 0.1) });
    y -= 25;
  }

  // Fecha
  if (date) {
    page.drawText(date, { x: 50, y, size: 12, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 30;
  }

  // Secciones
  for (const sec of sections) {
    if (sec.heading) {
      page.drawText(sec.heading, { x: 50, y, size: 14, font, color: rgb(0, 0, 0) });
      y -= 20;
    }
    if (sec.body) {
      page.drawText(sec.body, { x: 50, y, size: 12, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 40;
    }
  }

  // Footer
  if (footer) {
    page.drawText(footer, { x: 50, y: 40, size: 10, font, color: rgb(0.4, 0.4, 0.4) });
  }

  // Serializar documento a Uint8Array
  const pdfBytes = await doc.save();
  return pdfBytes;
}

// Export nombrado (para import { toPDF })
export { toPDF };
