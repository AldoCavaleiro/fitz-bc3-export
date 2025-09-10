// api/export-xlsx.js
import ExcelJS from "exceljs";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const {
      sheets = [
        { name: "Hoja1", rows: [ ["Columna 1", "Columna 2"], ["valor1", "valor2"] ] }
      ],
      filename = "documento.xlsx"
    } = req.body || {};

    const wb = new ExcelJS.Workbook();
    for (const sh of sheets) {
      const ws = wb.addWorksheet(String(sh?.name || "Hoja"));
      const rows = Array.isArray(sh?.rows) ? sh.rows : [];
      for (const r of rows) ws.addRow(Array.isArray(r) ? r : [String(r)]);
      ws.columns?.forEach(col => { col.width = Math.max(12, col.width || 12); });
    }

    const buffer = await wb.xlsx.writeBuffer();
    const data = Buffer.from(buffer).toString("base64");

    return res.status(200).json({
      filename,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      encoding: "base64",
      data
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generando el XLSX" });
  }
}
