// api/toPDF.js
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

function mm(n) { return (n / 25.4) * 72; } // mm → puntos

function wrapText(text, font, size, maxWidth) {
  const words = String(text || '').split(/\s+/);
  const lines = [];
  let line = '';

  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    const width = font.widthOfTextAtSize(test, size);
    if (width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * payload esperado:
 * {
 *   title: "Memoria técnica",
 *   subtitle: "Cabaña de madera 20x30",
 *   date: "2025-09-07",
 *   logo: { src: "https://…png|jpg", width: 90 }, // opcional (ancho en px aprox)
 *   sections: [{ heading: "Objeto", body: "…" }, { heading: "Alcance", body: "…" }],
 *   footer: "PGM Proyectos · www.pgmproyectos.com",
 *   filename: "memoria.pdf"
 * }
 */
export async function toPDF(payload = {}) {
  const {
    title = 'Documento',
    subtitle = '',
    date = '',
    logo = null,
    sections = [],
    footer = '',
  } = payload;

  const doc = await PDFDocument.create();
  const page = doc.addPage([mm(210), mm(297)]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  const margin = mm(20);
  const usableW = page.getWidth() - margin * 2;
  let y = page.getHeight() - margin;

  // LOGO (opcional y no bloqueante)
  if (logo && logo.src) {
    try {
      const res = await fetch(logo.src);
      const bytes = new Uint8Array(await res.arrayBuffer());
      let img;
      try {
        img = await doc.embedPng(bytes);
      } catch {
        img = await doc.embedJpg(bytes); // por si el PNG falla y realmente era JPG
      }
      const imgW = Number(logo.width || 90); // px aprox → lo usamos directo
      const ratio = imgW / img.width;
      const imgH = img.height * ratio;

      page.drawImage(img, {
        x: margin,
        y: y - imgH,
        width: imgW,
        height: imgH,
      });
      y -= (imgH + 12);
    } catch (e) {
      // No detener la generación si el logo falla
      console.error('Logo no cargado:', e);
    }
  }

  // TÍTULO
  const titleSize = 20;
  page.drawText(title, {
    x: margin,
    y: y - titleSize,
    size: titleSize,
    font: fontBold,
    color: rgb(0, 0, 0),
  });
  y -= (titleSize + 6);

  // SUBTÍTULO + FECHA
  const subSize = 12;
  if (subtitle) {
    page.drawText(subtitle, { x: margin, y: y - subSize, size: subSize, font });
    y -= (subSize + 4);
  }
  if (date) {
    page.drawText(date, { x: margin, y: y - subSize, size: subSize, font, color: rgb(0.25,0.25,0.25) });
    y -= (subSize + 10);
  }

  // SECCIONES
  const headingSize = 14;
  const bodySize = 11;
  const lineGap = 4;

  for (const sec of sections) {
    // salto de página si hace falta
    if (y < margin + 80) {
      y = page.getHeight() - margin;
      const newPage = doc.addPage([mm(210), mm(297)]);
      newPage.drawText('(continuación)', {
        x: margin,
        y: y - bodySize,
        size: bodySize,
        font,
        color: rgb(0.4,0.4,0.4),
      });
      page.drawText('', { x:0, y:0, size:1, font }); // dummy
      // cambiar referencia
      page = newPage;
      y -= (bodySize + 10);
    }

    if (sec.heading) {
      page.drawText(String(sec.heading), {
        x: margin,
        y: y - headingSize,
        size: headingSize,
        font: fontBold,
      });
      y -= (headingSize + 4);
    }

    const lines = wrapText(sec.body || '', font, bodySize, usableW);
    for (const ln of lines) {
      if (y < margin + 40) {
        y = page.getHeight() - margin;
        const np = doc.addPage([mm(210), mm(297)]);
        page = np;
      }
      page.drawText(ln, { x: margin, y: y - bodySize, size: bodySize, font });
      y -= (bodySize + lineGap);
    }
    y -= 8;
  }

  // FOOTER
  if (footer) {
    const footerY = margin / 2;
    page.drawText(footer, {
      x: margin,
      y: footerY,
      size: 10,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }

  const pdfBytes = await doc.save();           // Uint8Array
  const base64 = Buffer.from(pdfBytes).toString('base64');
  return { base64 };
}
