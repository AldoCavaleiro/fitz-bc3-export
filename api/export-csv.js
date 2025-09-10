// api/export-csv.js
function csvEscape(val, delimiter) {
  if (val == null) return "";
  let s = String(val);
  const needsQuotes = s.includes('"') || s.includes("\n") || s.includes("\r") || s.includes(delimiter);
  s = s.replace(/"/g, '""');
  return needsQuotes ? `"${s}"` : s;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const {
      headers = [],        // ["Col1","Col2",...]
      rows = [],           // [ ["v1","v2"], ... ]
      delimiter = ";",     // ; o ,
      filename = "documento.csv"
    } = req.body || {};

    const D = String(delimiter || ";");
    const lines = [];

    if (Array.isArray(headers) && headers.length) {
      lines.push(headers.map(v => csvEscape(v, D)).join(D));
    }

    for (const r of Array.isArray(rows) ? rows : []) {
      const arr = Array.isArray(r) ? r : [r];
      lines.push(arr.map(v => csvEscape(v, D)).join(D));
    }

    // BOM para Excel (UTF-8)
    const csvText = "\uFEFF" + lines.join("\r\n") + "\r\n";
    const data = Buffer.from(csvText, "utf8").toString("base64");

    return res.status(200).json({
      filename,
      contentType: "text/csv; charset=utf-8",
      encoding: "base64",
      data
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generando el CSV" });
  }
}
