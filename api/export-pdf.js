export const config = { runtime: "edge" };

/**
 * Genera un PDF (base64) desde {title, subtitle, date, sections:[{heading, body}], footer?, filename?}
 * Devuelve FileResponse JSON para usar con /api/deliver-file.
 *
 * Si existe ./toPDF.js (tu generador anterior), lo usa. Si no, genera un PDF simple de texto.
 */
export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const {
      title = "Documento",
      subtitle = "",
      date = new Date().toISOString().slice(0, 10),
      sections = [],
      footer = "",
      filename = "documento.pdf"
    } = await req.json();

    // 1) Intentar usar tu generador toPDF.js si está disponible
    try {
      const mod = await import(`${new URL("./toPDF.js", import.meta.url).href}`);
      if (mod && typeof mod.default === "function") {
        const buf = await mod.default({ title, subtitle, date, sections, footer });
        const data = arrayBufferToBase64(buf instanceof ArrayBuffer ? buf : buf.buffer || buf);
        return jsonFileResponse(filename, "application/pdf", data);
      }
    } catch (_) {
      // si no está, seguimos con fallback
    }

    // 2) Fallback: PDF muy simple incrustando texto (válido y abrible)
    const textLines = [
      `Memoria técnica`,
      subtitle ? `${subtitle}` : "",
      `${date}`,
      "",
      ...sections.flatMap(s => [`${s.heading || ""}`, `${s.body || ""}`, ""]),
      footer ? `${footer}` : ""
    ].join("\n");

    const pdfBuffer = simpleTextPDF(textLines);
    const data = arrayBufferToBase64(pdfBuffer.buffer);

    return jsonFileResponse(filename, "application/pdf", data);
  } catch (err) {
    return new Response(JSON.stringify({ error: "export-pdf failed", detail: String(err) }), { status: 500 });
  }
}

/* ---------- helpers ---------- */

function jsonFileResponse(filename, contentType, base64Data) {
  return new Response(
    JSON.stringify({
      filename,
      contentType,
      encoding: "base64",
      data: base64Data
    }),
    { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } }
  );
}

function arrayBufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

/**
 * Genera un PDF muy sencillo (texto monoespaciado) sin dependencias.
 * No es bonito, pero es válido. Ideal como fallback.
 */
function simpleTextPDF(text) {
  const lines = String(text).split("\n").map(escapePdfText);

  // PDF mínimo con una sola página (A4) y una fuente Helvetica embebida
  const header = `%PDF-1.4
%âãÏÓ
`;
  const objs = [];

  // 1: catalog
  objs.push(`1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj`);

  // 2: pages
  objs.push(`2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj`);

  // 3: page
  objs.push(`3 0 obj
<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 595 842] /Contents 5 0 R >>
endobj`);

  // 4: font
  objs.push(`4 0 obj
<< /Type /Font /Subtype /Type1 /Name /F1 /BaseFont /Helvetica >>
endobj`);

  // 5: contents (texto)
  const contentStream = buildTextStream(lines);
  const content = `5 0 obj
<< /Length ${contentStream.length} >>
stream
${contentStream}
endstream
endobj`;

  objs.push(content);

  // xref
  const offsets = [];
  let pos = header.length;
  const body = objs
    .map(o => {
      offsets.push(pos);
      pos += o.length + 1;
      return o;
    })
    .join("\n") + "\n";

  const xrefPos = pos;
  const xref = `xref
0 ${objs.length + 1}
0000000000 65535 f
${offsets.map(off => off.toString().padStart(10, "0") + " 00000 n").join("\n")}
trailer
<< /Size ${objs.length + 1} /Root 1 0 R >>
startxref
${xrefPos}
%%EOF`;

  const pdfString = header + body + xref;
  const encoder = new TextEncoder();
  return encoder.encode(pdfString);
}

function buildTextStream(lines) {
  // escribe cada línea empezando en x=50, y=780 y bajando 16 pt
  let y = 780;
  const chunks = [
    "BT",
    "/F1 12 Tf",
    "50 " + y + " Td"
  ];
  for (const line of lines) {
    chunks.push(`(${line}) Tj`);
    y -= 16;
    chunks.push("T*"); // move to next line
  }
  chunks.push("ET");
  return chunks.join("\n");
}

function escapePdfText(s) {
  return String(s).replace(/[()\\]/g, m => "\\" + m);
}
