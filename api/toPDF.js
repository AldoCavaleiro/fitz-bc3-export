// api/toPDF.js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function createPdf(payload = {}) {
  const {
    title = "Memoria técnica",
    subtitle = "",
    date = new Date().toLocaleDateString("es-ES"),
    sections = [],
    footer = ""
  } = payload;

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4 en puntos
  const { width, height } = page.getSize();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  let y = height - 60;

  const drawLine = (txt, size = 12, bold = false) => {
    if (!txt) return;
    const lines = wrap(String(txt), 90);
    for (const line of lines) {
      page.drawText(line, {
        x: 50,
        y,
        size,
        font,
        color: rgb(0, 0, 0)
      });
      y -= size + 4;
      if (y < 80) newPage();
    }
    y -= 6;
  };

  const newPage = () => {
    const p = doc.addPage([595.28, 841.89]);
    // “Resetea” el contexto
    page.setX?.(0); // no pasa nada si no existe
    y = p.getSize().height - 60;
    // redirige page a la nueva
    Object.assign(page, p);
  };

  // Cabecera
  drawLine(title, 20);
  if (subtitle) drawLine(subtitle, 14);
  if (date) drawLine(String(date), 10);

  // Secciones
  for (const s of sections) {
    y -= 8;
    drawLine(String((s.heading || "SECCIÓN")).toUpperCase(), 12);
    drawLine(s.body || "", 11);
  }

  // Pie de página (sencillo)
  if (footer) {
    if (y < 50) newPage();
    page.drawText(footer, {
      x: 50,
      y: 40,
      size: 10,
      font,
      color: rgb(0, 0, 0)
    });
  }

  return await doc.save();
}

// Helper: wrap de texto por caracteres (simple)
function wrap(text, max = 90) {
  const words = String(text).split(/\s+/);
  const out = [];
  let line = "";
  for (const w of words) {
    const test = line ? line + " " + w : w;
    if (test.length > max) {
      if (line) out.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out;
}
