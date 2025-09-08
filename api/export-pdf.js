// api/export-pdf.js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const body = typeof req.body === "object" && req.body ? req.body : {};
    const {
      title = "Documento",
      subtitle = "",
      date = new Date().toISOString().slice(0, 10),
      logo = null, // { src: "https://...", width: 90 }
      sections = [], // [{ heading, body }]
      footer = "",
      filename = "documento.pdf",
    } = body;

    // Crear PDF
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595.28, 841.89]); // A4 en puntos
    const { width, height } = page.getSize();

    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let cursorY = height - 50;

    // Logo (opcional)
    if (logo && logo.src) {
      try {
        const resp = await fetch(logo.src);
        const buf = Buffer.from(await resp.arrayBuffer());
        let img;
        if (logo.src.toLowerCase().endsWith(".png")) {
          img = await pdfDoc.embedPng(buf);
        } else {
          img = await pdfDoc.embedJpg(buf);
        }
        const w = Math.min(Number(logo.width || 90), 200);
        const scale = w / img.width;
        const h = img.height * scale;
        page.drawImage(img, { x: 50, y: cursorY - h, width: w, height: h });
        cursorY -= h + 18;
      } catch {
        // Si falla el logo, seguimos sin él
        cursorY -= 10;
      }
    }

    // Título
    page.drawText(title, { x: 50, y: cursorY, size: 20, font: fontBold, color: rgb(0, 0, 0) });
    cursorY -= 26;

    // Subtítulo
    if (subtitle) {
      page.drawText(subtitle, { x: 50, y: cursorY, size: 12, font, color: rgb(0.1, 0.1, 0.1) });
      cursorY -= 18;
    }

    // Fecha
    page.drawText(date, { x: 50, y: cursorY, size: 10, font, color: rgb(0.2, 0.2, 0.2) });
    cursorY -= 24;

    // Secciones
    const lineHeight = 14;
    const maxWidth = width - 100;

    const drawParagraph = (text) => {
      const words = String(text || "").split(/\s+/);
      let line = "";
      for (const w of words) {
        const test = line ? line + " " + w : w;
        const testWidth = font.widthOfTextAtSize(test, 11);
        if (testWidth > maxWidth) {
          page.drawText(line, { x: 50, y: cursorY, size: 11, font, color: rgb(0, 0, 0) });
          cursorY -= lineHeight;
          if (cursorY < 80) {
            // Nueva página si nos quedamos sin espacio
            const newPage = pdfDoc.addPage([595.28, 841.89]);
            page.drawText(footer || "", { x: 50, y: 40, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
            page = newPage; // continuar en nueva
            cursorY = height - 50;
          }
          line = w;
        } else {
          line = test;
        }
      }
      if (line) {
        page.drawText(line, { x: 50, y: cursorY, size: 11, font, color: rgb(0, 0, 0) });
        cursorY -= lineHeight + 6;
      }
    };

    for (const s of sections) {
      const heading = String(s?.heading || "");
      const bodyText = String(s?.body || "");
      if (heading) {
        page.drawText(heading, { x: 50, y: cursorY, size: 13, font: fontBold, color: rgb(0, 0, 0) });
        cursorY -= 18;
      }
      if (bodyText) drawParagraph(bodyText);
    }

    // Pie de página
    if (footer) {
      page.drawText(footer, { x: 50, y: 40, size: 10, font, color: rgb(0.3, 0.3, 0.3) });
    }

    const pdfBytes = await pdfDoc.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");

    // Construir URL de descarga estable en el MISMO dominio de la request
    const origin = `${req.headers["x-forwarded-proto"] || "https"}://${req.headers.host}`;
    const payload = { filename, contentType: "application/pdf", data: base64 };
    const p = Buffer.from(JSON.stringify(payload)).toString("base64url");
    const url = `${origin}/api/download-pdf?p=${encodeURIComponent(p)}`;

    // OJO: no devolvemos "data" para que el GPT NO intente adjuntar a /mnt/data
    return res.status(200).json({
      filename,
      contentType: "application/pdf",
      encoding: "base64",
      url
      // Si quisieras, podrías devolver también dataUri:
      // dataUri: `data:application/pdf;base64,${base64}`
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generando el PDF" });
  }
}

