// api/export-dxf-file.js
export const config = { runtime: "nodejs" };

// DXF ASCII mínimo
function dxfText(x, y, text, height = 3.5) {
  return [
    "0","TEXT",
    "8","0",          // capa
    "10", String(x),
    "20", String(y),
    "30","0",
    "40", String(height),
    "1", text
  ].join("\n");
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const b = req.body || {};
    const title = b.title || "Plano";
    const subtitle = b.subtitle || "";
    const sections = Array.isArray(b.sections) ? b.sections : [];
    const filename = ((b.filename || title).replace(/\s+/g, "_")) + ".dxf";

    let y = 290;                 // coordenada y inicial (mm si lo abres como ISO)
    const lines = [];
    lines.push("0","SECTION","2","HEADER","0","ENDSEC");
    lines.push("0","SECTION","2","ENTITIES");

    lines.push(dxfText(10, y, title, 7)); y -= 10;
    if (subtitle) { lines.push(dxfText(10, y, subtitle, 5)); y -= 8; }
    y -= 5;

    for (const s of sections) {
      if (!s) continue;
      if (s.heading) { lines.push(dxfText(10, y, s.heading, 4.5)); y -= 7; }
      if (s.body) {
        const body = String(s.body).split(/\n/).slice(0, 6);   // recorte básico
        for (const row of body) { lines.push(dxfText(12, y, row, 3.5)); y -= 6; }
        y -= 3;
      }
      if (y < 20) break; // evita y negativas (MVP)
    }

    lines.push("0","ENDSEC","0","EOF");
    const dxf = lines.join("\n");
    const buffer = Buffer.from(dxf, "utf8");

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("EXPORT_DXF_FILE_FAILED:", e);
    return res.status(500).json({ error: "EXPORT_DXF_FILE_FAILED" });
  }
}
