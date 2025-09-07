// api/export-pdf.js
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

async function fetchLogoAsBytes(url) {
  if (!url) return null;
  try {
    // time-out defensivo para que no se caiga si el logo tarda o falla
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000); // 6s
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    // limitar el tamaño del logo a 400 KB para pdf-lib y para la Acción
    if (buf.byteLength > 400 * 1024) return null;
    return new Uint8Array(buf);
  } catch {
    return null; // nunca reventar por el logo
  }
}

function drawWrappedText(page, text, x, y, maxWidth, lineHeight, font) {
  const words = String(text || '').split(/\s+/);
  let line = '';
  let yy = y;
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    const width = font.widthOfTextAtSize(test, 11);
    if (width > maxWidth && line) {
      page.drawText(line, { x, y: yy, size: 11, font });
      yy -= lineHeight;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) page.drawText(line, { x, y: yy, size: 11, font });
  return yy - lineHeight;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const {
      title = 'Documento técnico',
      subtitle = '',
      date = new Date().toISOString().slice(0, 10),
      logo, // { src: 'https://...png|jpg', width: 90 }  (opcional)
      sections = [], // [{ heading, body }]
      footer = '',
      filename = 'documento.pdf',
    } = req.body || {};

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4
    const margin = 50;
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let x = margin;
    let y = 841.89 - margin;

    // LOGO (opcional, nunca rompe)
    if (logo && logo.src) {
      const bytes = await fetchLogoAsBytes(logo.src);
      if (bytes) {
        try {
          let img;
          const isPng = /\.png($|\?)/i.test(logo.src);
          if (isPng) img = await pdfDoc.embedPng(bytes);
          else img = await pdfDoc.embedJpg(bytes);
          const w = Math.min(logo.width || 90, 140);
          const ratio = img.height / img.width;
          const h = w * ratio;
          page.drawImage(img, { x, y: y - h, width: w, height: h });
          x = margin;
          y = y - h - 12;
        } catch {
          // ignorar si no se puede incrustar
        }
      }
    }

    // TÍTULO
    page.drawText(title, { x, y, size: 20, font: fontBold });
    y -= 26;

    if (subtitle) {
      page.drawText(subtitle, { x, y, size: 13, font: fontRegular, color: rgb(0.2,0.2,0.2) });
      y -= 18;
    }

    page.drawText(`Fecha: ${date}`, { x, y, size: 10, font: fontRegular, color: rgb(0.3,0.3,0.3) });
    y -= 20;

    // SECCIONES
    for (const s of sections) {
      if (y < 120) {
        // nueva página cuando falta espacio
        const p = pdfDoc.addPage([595.28, 841.89]);
        y = 841.89 - margin;
        p.drawText(title, { x: margin, y, size: 10, font: fontRegular, color: rgb(0.5,0.5,0.5) });
        y -= 18;
        // continuar en nueva
        page.drawText = p.drawText.bind(p);
        page.drawImage = p.drawImage?.bind(p);
      }
      if (s.heading) {
        page.drawText(String(s.heading), { x: margin, y, size: 12, font: fontBold });
        y -= 16;
      }
      if (s.body) {
        y = drawWrappedText(page, s.body, margin, y, 595.28 - margin*2, 14, fontRegular);
        y -= 8;
      }
    }

    // PIE
    if (footer) {
      page.drawText(String(footer), { x: margin, y: 40, size: 9, font: fontRegular, color: rgb(0.4,0.4,0.4) });
    }

    const pdfBytes = await pdfDoc.save(); // Uint8Array
    const base64 = Buffer.from(pdfBytes).toString('base64');

    // Respuesta para Acción (JSON + base64 + URL)
    const url = new URL(req.headers['x-forwarded-proto']?.includes('https') ? 'https://' : 'http://'
      + req.headers.host + '/api/download-pdf');
    url.searchParams.set('p', Buffer.from(JSON.stringify({
      filename,
      contentType: 'application/pdf',
      encoding: 'base64',
      data: base64
    })).toString('base64'));

    return res.status(200).json({
      filename,
      contentType: 'application/pdf',
      encoding: 'base64',
      data: base64,
      url: url.toString()
    });

  } catch (e) {
    console.error('[export-pdf] ERROR', e);
    return res.status(500).json({ error: 'Error generando el PDF' });
  }
}
