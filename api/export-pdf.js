// api/export-pdf.js
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } }
};

function baseOrigin(req) {
  // Intenta usar el dominio real de producción cuando existe
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  // Fallback a tu dominio conocido
  return 'https://fitz-bc3-export.vercel.app';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    // ===== 1) Leer payload =====
    const {
      title = 'Informe técnico',
      subtitle = '',
      date = new Date().toISOString().slice(0,10),
      logo = null, // { src: "https://...png", width: 90 } (opcional)
      sections = [], // [{ heading, body }, ...]
      footer = '',
      filename = 'documento.pdf'
    } = req.body || {};

    // ===== 2) Crear PDF =====
    const pdfDoc = await PDFDocument.create();
    const page   = pdfDoc.addPage([595.28, 841.89]); // A4 puntos
    const { width, height } = page.getSize();

    const fontTitle = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontBody  = await pdfDoc.embedFont(StandardFonts.Helvetica);

    let cursorY = height - 60;

    // Logo (opcional)
    if (logo?.src) {
      try {
        const imgBytes = await (await fetch(logo.src)).arrayBuffer();
        const isPng = logo.src.toLowerCase().endsWith('.png');
        const img   = isPng ? await pdfDoc.embedPng(imgBytes) : await pdfDoc.embedJpg(imgBytes);
        const w     = Number(logo.width || 90);
        const ratio = img.height / img.width;
        const h     = w * ratio;
        page.drawImage(img, { x: 40, y: height - 40 - h, width: w, height: h });
      } catch { /* si falla el logo, seguimos */ }
    }

    // Título
    page.drawText(title, {
      x: 40, y: cursorY, size: 20, font: fontTitle, color: rgb(0.12,0.12,0.12)
    });
    cursorY -= 26;

    // Subtítulo + fecha
    const sub = [subtitle, date].filter(Boolean).join('  •  ');
    if (sub) {
      page.drawText(sub, {
        x: 40, y: cursorY, size: 12, font: fontBody, color: rgb(0.2,0.2,0.2)
      });
      cursorY -= 24;
    }

    // Línea separadora
    page.drawLine({ start: { x: 40, y: cursorY }, end: { x: width - 40, y: cursorY }, thickness: 1, color: rgb(0.8,0.8,0.8) });
    cursorY -= 24;

    // Secciones
    const wrap = (text, maxChars = 95) => {
      if (!text) return [];
      const words = String(text).split(/\s+/);
      const lines = [];
      let line = '';
      for (const w of words) {
        if ((line + ' ' + w).trim().length > maxChars) {
          lines.push(line.trim()); line = w;
        } else {
          line = (line ? line + ' ' : '') + w;
        }
      }
      if (line) lines.push(line.trim());
      return lines;
    };

    for (const sec of Array.isArray(sections) ? sections : []) {
      const heading = sec.heading || '';
      const body    = sec.body    || '';

      if (heading) {
        if (cursorY < 120) { page.addPage(); cursorY = height - 60; }
        page.drawText(heading, {
          x: 40, y: cursorY, size: 14, font: fontTitle, color: rgb(0.1,0.1,0.1)
        });
        cursorY -= 18;
      }

      for (const ln of wrap(body)) {
        if (cursorY < 80) { pdfDoc.addPage(); cursorY = height - 60; }
        page.drawText(ln, { x: 40, y: cursorY, size: 11, font: fontBody, color: rgb(0,0,0) });
        cursorY -= 14;
      }
      cursorY -= 6;
    }

    // Footer (marca)
    if (footer) {
      page.drawText(footer, {
        x: 40, y: 30, size: 10, font: fontBody, color: rgb(0.3,0.3,0.3)
      });
    }

    // ===== 3) Serializar a base64 =====
    const pdfBytes = await pdfDoc.save();
    const data = Buffer.from(pdfBytes).toString('base64');

    const file = {
      filename: filename || 'documento.pdf',
      contentType: 'application/pdf',
      encoding: 'base64',
      data
    };

    // ===== 4) Construir URL de descarga robusta =====
    const payload    = Buffer.from(JSON.stringify(file)).toString('base64');
    const origin     = baseOrigin(req);
    const url        = `${origin}/api/download-pdf?p=${encodeURIComponent(payload)}`;

    // ===== 5) Responder JSON (para el agente y para pruebas) =====
    return res.status(200).json({ ...file, url });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error generando el PDF' });
  }
}
