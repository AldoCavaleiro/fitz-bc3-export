// api/export-pdf.js
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// CORS helper
function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const {
      title = "Informe",
      subtitle = "",
      date,
      // logo: { src, width }  -> OPCIONAL
      logo,
      // sections: [{ heading, body }]
      sections = [],
      footer = "",
      filename = "documento.pdf",
    } = req.body || {};

    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]); // A4 portrait
    const { width, height } = page.getSize();

    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);

    // Cabecera
    let y = height - 60;

    // Logo (opcional, y NO rompe si falla)
    if (logo && logo.src) {
      try {
        const resp = await fetch(logo.src, { cache: "no-store" });
        const bytes = new Uint8Array(await resp.arrayBuffer());
        let img;
        const lower = logo.src.toLowerCase();
        if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) {
          img = await pdf.embedJpg(bytes);
        } else {
          img = await pdf.embedPng(bytes);
        }
        const w = Math.min(logo.width || 90, 160);
        const scale = w / img.width;
        const h = img.height * scale;
        page.drawImage(img, { x: 50, y: y - h + 10, width: w, height: h });
      } catch {
        // ignoramos errores de logo
      }
    }

    page.drawText(title, { x: 50, y, size: 20, font: fontBold });
    y -= 24;

    if (subtitle) {
      page.drawText(subtitle, { x: 50, y, size: 14, font });
      y -= 18;
    }

    const theDate = date || new Date().toISOString().slice(0, 10);
    page.drawText(theDate, { x: width - 140, y: height - 40, size: 10, font });

    // Utilidad para “wrap” de texto
    const wrap = (text = "", size = 11, maxWidth = width - 100) => {
      const words = String(text).split(/\s+/);
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

    // Cuerpo básico (1 página). Si necesitas multipágina lo añadimos luego.
    for (const sec of sections) {
      y -= 12;
      page.drawText(sec?.heading || "", { x: 50, y, size: 13, font: fontBold });
      y -= 16;
      for (const ln of wrap(sec?.body || "", 11)) {
        if (y < 60) break; // (simple: no multipágina para evitar complejidad)
        page.drawText(ln, { x: 50, y, size: 11, font });
        y -= 14;
      }
    }

    if (footer) {
      page.drawText(footer, {
        x: 50,
        y: 30,
        size: 10,
        font,
        color: rgb(0.4, 0.4, 0.4),
      });
    }

    const pdfBytes = await pdf.save();
    const base64 = Buffer.from(pdfBytes).toString("base64");

    return res.status(200).json({
      filename,
      contentType: "application/pdf",
      encoding: "base64",
      data: base64,
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generando el PDF" });
  }
}
