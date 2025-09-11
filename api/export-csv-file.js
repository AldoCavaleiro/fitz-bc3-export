// api/export-csv-file.js
export const config = { runtime: "nodejs" };

function esc(v = "") {
  const s = String(v).replace(/"/g, '""');
  return `"${s}"`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const b = req.body || {};
    const title = b.title || "Documento";
    const sections = Array.isArray(b.sections) ? b.sections : [];
    const filename = ((b.filename || title).replace(/\s+/g, "_")) + ".csv";

    const lines = [];
    lines.push(`"Título",${esc(title)}`);
    if (b.subtitle) lines.push(`"Subtítulo",${esc(b.subtitle)}`);
    if (b.date) lines.push(`"Fecha",${esc(b.date)}`);
    lines.push("");
    lines.push(`"SECCIÓN","CONTENIDO"`);
    for (const s of sections) {
      lines.push(`${esc(s?.heading || "")},${esc(s?.body || "")}`);
    }
    const csv = lines.join("\r\n");
    const buffer = Buffer.from(csv, "utf8");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("EXPORT_CSV_FILE_FAILED:", e);
    return res.status(500).json({ error: "EXPORT_CSV_FILE_FAILED" });
  }
}
