// api/export.js
// Endpoint único para exportar archivos y devolver SIEMPRE un link { url, filename }.
// Implementado ahora: PDF, BC3, CSV.
// Pendiente (responde 501 provisional): DOCX, XLSX, DXF.
//
// No requiere dependencias externas. El PDF se genera con un generador mínimo propio.
// Runtime: Node (Serverless). Asegúrate de tener "type":"module" en package.json.

export const config = {
  runtime: "nodejs",
};

// ------------ Utilidades básicas ------------

// Convierte Buffer/Uint8Array a base64 (Node >= 18)
function toBase64(u8) {
  return Buffer.from(u8).toString("base64");
}

// Respuesta CORS común
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

// Llama a /api/deliver-file dentro del mismo deployment y devuelve { url, filename }
async function deliverViaServer(file, req) {
  const scheme =
    (req.headers["x-forwarded-proto"] &&
      req.headers["x-forwarded-proto"].split(",")[0]) ||
    "https";
  const host = req.headers.host;
  const origin = `${scheme}://${host}`;

  const r = await fetch(`${origin}/api/deliver-file`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(file),
  });

  const out = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(
      `deliver-file failed: ${r.status} ${JSON.stringify(out)}`
    );
  }
  // Esperamos { url, filename }
  return out;
}

// ------------ Generador PDF mínimo (sin librerías) ------------
// Crea un PDF de 1 página con varias líneas de texto (Helvetica).
// inputs: { title, subtitle, date, sections: [{heading, body}, ...] }
function buildMinimalPDF({ title, subtitle, date, sections = [] }) {
  const pageWidth = 595;  // A4
  const pageHeight = 842; // A4

  // Utilidad para dibujar una línea de texto en (x,y) con tamaño "fontSize"
  // y devolver el comando PDF para el contenido.
  function textCmd(x, y, text, fontSize = 12) {
    // Escapar paréntesis en PDF
    const safe = String(text).replace(/[()]/g, (m) => "\\" + m);
    return `BT /F1 ${fontSize} Tf ${x} ${y} Td (${safe}) Tj ET\n`;
  }

  // Creamos un contenido básico.
  const lines = [];
  let y = pageHeight - 80;

  if (title) {
    lines.push(textCmd(60, y, title, 20));
    y -= 28;
  }
  if (subtitle) {
    lines.push(textCmd(60, y, subtitle, 13));
    y -= 22;
  }
  if (date) {
    lines.push(textCmd(60, y, String(date), 11));
    y -= 22;
  }

  if (sections && sections.length) {
    y -= 16;
    for (const sec of sections) {
      if (y < 80) {
        // (Generador mínimo: no añadimos más páginas; si se llena, cortamos)
        break;
      }
      if (sec.heading) {
        lines.push(textCmd(60, y, String(sec.heading).toUpperCase(), 12));
        y -= 18;
      }
      if (sec.body) {
        // Partimos cuerpo en líneas gruesas (~90 chars) sin palabra inteligente para simplificar
        const raw = String(sec.body);
        const wrapped = raw.match(/.{1,90}(\s|$)/g) || [raw];
        for (const w of wrapped) {
          if (y < 80) break;
          lines.push(textCmd(60, y, w.trim(), 11));
          y -= 14;
        }
        y -= 8;
      }
    }
  }

  const contentStream = lines.join("");

  // Objetos PDF:
  // 1: Catalog
  // 2: Pages
  // 3: Page
  // 4: Font (Helvetica)
  // 5: Contents (stream)

  const obj1 = `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n`;
  const obj2 = `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 /MediaBox [0 0 ${pageWidth} ${pageHeight}] >>\nendobj\n`;
  const obj3 = `3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj\n`;
  const obj4 = `4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n`;

  const stream = `stream\n${contentStream}endstream\n`;
  const obj5 = `5 0 obj\n<< /Length ${contentStream.length} >>\n${stream}endobj\n`;

  // Ensamblado y tabla xref con offsets reales.
  const header = `%PDF-1.4\n`;
  const parts = [header, obj1, obj2, obj3, obj4, obj5];
  let offsets = [];
  let cursor = 0;
  for (const p of parts) {
    offsets.push(cursor);
    cursor += Buffer.byteLength(p, "utf8");
  }

  const xrefStart = cursor;
  const xref =
    `xref\n0 6\n` +
    `0000000000 65535 f \n` +
    offsets
      .map((off) => off.toString().padStart(10, "0") + " 00000 n \n")
      .join("");

  const trailer =
    `trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const pdfString = parts.join("") + xref + trailer;
  return new TextEncoder().encode(pdfString); // Uint8Array
}

// ------------ Generador BC3 sencillo (texto plano) ------------
// input esperado: { project: { code, name, desc, version, items: [...] } }
// items: [{ code, desc, qty, unit, price, children: [...] }]
function buildBC3(project = {}) {
  const today = new Date().toISOString().slice(0, 10);
  const code = project.code || "001";
  const name = project.name || "Proyecto";
  const desc = project.desc || "";
  const version = (project.version || "1.0").toString();

  const lines = [];
  // Cabecera FIEBDC (charset ISO-8859-1 simulado)
  lines.push(`~FIEBDC-3/2021|ISO-8859-1|`);
  lines.push(`~CABECERA|${code}|${name}|${desc}|${version}|${today}`);

  function emit(item, level) {
    const itCode = String(item.code ?? "").padStart(2, "0");
    const itDesc = String(item.desc ?? "");
    const qty = Number(item.qty ?? 1);
    const unit = String(item.unit ?? "ud");
    const price = Number(item.price ?? 0);

    // línea de partida muy básica: código;desc;unidad;cantidad;precio
    lines.push(`~L|${"  ".repeat(level)}${itCode}|${itDesc}|${unit}|${qty}|${price.toFixed(2)}`);

    const kids = Array.isArray(item.children) ? item.children : [];
    for (const k of kids) emit(k, level + 1);
  }

  const root = Array.isArray(project.items) ? project.items : [];
  for (const it of root) emit(it, 0);

  // Total (muy simple)
  let total = 0;
  function walkSum(arr) {
    for (const it of arr) {
      total += Number(it.qty ?? 1) * Number(it.price ?? 0);
      if (Array.isArray(it.children)) walkSum(it.children);
    }
  }
  walkSum(root);
  lines.push(`~TOTAL|${total.toFixed(2)}`);

  return new TextEncoder().encode(lines.join("\r\n") + "\r\n");
}

// ------------ Generador CSV sencillo ------------
// input: { rows: [ [c1,c2,...], ... ] , headers?: [h1,h2,...] }
function buildCSV({ headers = [], rows = [] } = {}) {
  const esc = (v) => {
    const s = String(v ?? "");
    if (s.includes('"') || s.includes(";") || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const out = [];
  if (headers.length) out.push(headers.map(esc).join(";"));
  for (const r of rows) out.push((r ?? []).map(esc).join(";"));
  return new TextEncoder().encode(out.join("\n"));
}

// ------------ Handler principal ------------
export default async function handler(req, res) {
  try {
    setCORS(res);
    if (req.method === "OPTIONS") {
      return res.status(204).end();
    }
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Use POST /api/export" });
    }

    const body = await parseJSON(req);
    const {
      format,        // "pdf" | "bc3" | "csv" | "docx" | "xlsx" | "dxf"
      filename,      // nombre sugerido (ej: "memoria_cabana.pdf")
      // Campos posibles según formato:
      title,
      subtitle,
      date,
      sections,
      project,
      headers,
      rows,
    } = body || {};

    if (!format) return res.status(400).json({ error: "format requerido" });

    let fileBytes;       // Uint8Array
    let outFilename = filename || `export.${format}`;
    let contentType = "application/octet-stream";

    switch (String(format).toLowerCase()) {
      case "pdf": {
        const pdfBytes = buildMinimalPDF({ title, subtitle, date, sections });
        fileBytes = pdfBytes;
        contentType = "application/pdf";
        if (!outFilename.toLowerCase().endsWith(".pdf")) {
          outFilename += ".pdf";
        }
        break;
      }
      case "bc3": {
        const bc3Bytes = buildBC3(project || {});
        fileBytes = bc3Bytes;
        contentType = "text/plain; charset=ISO-8859-1";
        if (!outFilename.toLowerCase().endsWith(".bc3")) {
          outFilename += ".bc3";
        }
        break;
      }
      case "csv": {
        const csvBytes = buildCSV({ headers, rows });
        fileBytes = csvBytes;
        contentType = "text/csv; charset=utf-8";
        if (!outFilename.toLowerCase().endsWith(".csv")) {
          outFilename += ".csv";
        }
        break;
      }
      case "docx":
      case "xlsx":
      case "dxf": {
        // Lo dejamos preparado para siguientes iteraciones.
        return res.status(501).json({
          error: `Formato '${format}' pendiente de activación en el endpoint unificado.`,
        });
      }
      default:
        return res.status(400).json({ error: `Formato no soportado: ${format}` });
    }

    // Montamos el objeto para entregar
    const file = {
      filename: outFilename,
      contentType,
      encoding: "base64",
      data: toBase64(fileBytes), // conversión a base64
    };

    // Entregar vía /api/deliver-file y devolver { url, filename }
    const delivered = await deliverViaServer(file, req);
    return res.status(200).json(delivered);
  } catch (err) {
    console.error("EXPORT ERROR:", err);
    setCORS(res);
    return res.status(500).json({ error: String(err && err.message || err) });
  }
}

// Parse robusto del body (JSON)
async function parseJSON(req) {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const raw = Buffer.concat(chunks).toString("utf8") || "{}";
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
