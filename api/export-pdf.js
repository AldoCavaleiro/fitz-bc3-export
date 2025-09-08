// api/export-pdf.js
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export default async function handler(req, res) {
  // CORS básico para pruebas (Hoppscotch/navegador)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const {
      title = 'Memoria técnica',
      subtitle = '',
      date = '',
      logo = null, // { src: "https://...png", width: 90 }
      sections = [],
      footer = '',
      filename = 'documento.pdf',
    } = req.body || {};

    // --- Crear PDF ---
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 puntos
    const { width } = page.getSize();
    const marginX = 50;
    let y = 800;

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Logo opcional (PNG/JPG remoto)
    if (logo?.src) {
      try {
        const resp = await fetch(logo.src);
        const buf = await resp.arrayBuffer();
        const mime = resp.headers.get('content-type') || '';
        let img;
        if (mime.includes('png')) img = await pdfDoc.embedPng(buf);
        else img = await pdfDoc.embedJpg(buf);
        const targetW = Number(logo.width || 80);
        const ratio = targetW / img.width;
        const targetH = img.height * ratio;
        page.drawImage(img, { x: marginX, y: y - targetH, width: targetW, height: targetH });
      } catch (e) {
        // no bloquea si el logo falla
      }
    }

    // Título
    y -= 40;
    page.drawText(title, { x: marginX, y, size: 18, font: fontBold, color: rgb(0, 0, 0) });
    y -= 22;

    // Subtítulo + fecha
    const sub = [subtitle, date].filter(Boolean).join(' · ');
    if (sub) {
      page.drawText(sub, { x: marginX, y, size: 11, font, color: rgb(0.2, 0.2, 0.2) });
      y -= 18;
    }

    // Separador
    page.drawLine({ start: { x: marginX, y }, end: { x: width - marginX, y }, thickness: 1, color: rgb(0.6,0.6,0.6) });
    y -= 18;

    // Secciones
    const maxWidth = width - marginX * 2;
    const wrapText = (txt, size) => {
      const words = String(txt || '').split(/\s+/);
      const lines = [];
      let cur = '';
      for (const w of words) {
        const test = cur ? cur + ' ' + w : w;
        const wWidth = font.widthOfTextAtSize(test, size);
        if (wWidth > maxWidth) { lines.push(cur); cur = w; }
        else cur = test;
      }
      if (cur) lines.push(cur);
      return lines;
    };

    for (const s of Array.isArray(sections) ? sections : []) {
      if (y < 120) { page.drawText('» Continúa…', { x: marginX, y: 70, size: 10, font }); }
      if (y < 100) {
        const p2 = pdfDoc.addPage([595.28, 841.89]);
        y = 800;
        p2.drawText(title, { x: marginX, y, size: 12, font: fontBold, color: rgb(0.1,0.1,0.1) });
        y -= 24;
      }
      // Heading
      page.drawText(String(s.heading || ''), { x: marginX, y, size: 13, font: fontBold });
      y -= 16;
      // Body envuelto
      const lines = wrapText(s.body || '', 11);
      for (const ln of lines) {
        if (y < 80) {
          const p2 = pdfDoc.addPage([595.28, 841.89]);
          y = 800;
          p2.drawText(title, { x: marginX, y, size: 12, font: fontBold, color: rgb(0.1,0.1,0.1) });
          y -= 24;
        }
        page.drawText(ln, { x: marginX, y, size: 11, font });
        y -= 14;
      }
      y -= 8;
    }

    // Footer simple
    if (footer) {
      page.drawLine({ start: { x: marginX, y: 60 }, end: { x: width - marginX, y: 60 }, thickness: 0.5, color: rgb(0.7,0.7,0.7) });
      page.drawText(footer, { x: marginX, y: 44, size: 10, font, color: rgb(0.3,0.3,0.3) });
    }

    const pdfBytes = await pdfDoc.save();
    const b64 = Buffer.from(pdfBytes).toString('base64');

    // ► Respuesta reforzada para que ChatGPT lo adjunte con más fiabilidad
    return res.status(200).json({
      filename,
      contentType: 'application/pdf',
      encoding: 'base64',
      data: b64,
      // pista adicional para UIs que prefieran data-uri:
      dataUri: `data:application/pdf;base64,${b64}`,
      // info de diagnóstico
      _meta: { sizeBytes: pdfBytes.length }
    });

  } catch (e) {
    // DIAGNÓSTICO: devuelve detalle de error para que lo copies si algo rompe
    return res.status(500).json({
      error: 'Error generando el PDF',
      details: String(e?.stack || e)
    });
  }
}

