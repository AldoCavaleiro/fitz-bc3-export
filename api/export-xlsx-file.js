// api/export-xlsx-file.js
export const config = { runtime: "nodejs" };

import XLSX from "xlsx";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const b = req.body || {};
    const title = b.title || "Hoja";
    const sections = Array.isArray(b.sections) ? b.sections : [];
    const filename = ((b.filename || title).replace(/\s+/g, "_")) + ".xlsx";

    const rows = [];
    rows.push(["Título", title]);
    if (b.subtitle) rows.push(["Subtítulo", b.subtitle]);
    if (b.date) rows.push(["Fecha", b.date]);
    rows.push([]);
    rows.push(["SECCIÓN", "CONTENIDO"]);
    for (const s of sections) {
      rows.push([s?.heading || "", s?.body || ""]);
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Memoria");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "buffer" });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("EXPORT_XLSX_FILE_FAILED:", e);
    return res.status(500).json({ error: "EXPORT_XLSX_FILE_FAILED" });
  }
}
