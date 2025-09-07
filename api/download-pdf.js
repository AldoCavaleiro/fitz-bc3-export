// api/download-pdf.js
import { toPDF } from "./toPDF.js";

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    let spec = {};
    if (req.method === "GET") {
      const p = req.query.p || req.query.token || "";
      if (!p) return res.status(400).send("Missing 'p' parameter");
      const json = Buffer.from(String(p), "base64").toString("utf8");
      spec = JSON.parse(json);
    } else if (req.method === "POST") {
      spec = req.body && typeof req.body === "object" ? req.body : {};
    } else {
      res.setHeader("Allow", "GET, POST, OPTIONS");
      return res.status(405).end("Method Not Allowed");
    }

    const { bytes, filename, contentType } = await toPDF(spec);

    res.setHeader("Content-Type", contentType); // application/pdf
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(Buffer.from(bytes));
  } catch (e) {
    console.error(e);
    return res.status(500).send("Error generating PDF");
  }
}
