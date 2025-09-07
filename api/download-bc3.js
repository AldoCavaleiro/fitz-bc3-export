// api/download-bc3.js
import { toBC3 } from "./toBC3.js";

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCORS(res);
  if (req.method === "OPTIONS") return res.status(204).end();

  let project = {};
  try {
    if (req.method === "GET") {
      const p = req.query.p || req.query.token || "";
      if (!p) return res.status(400).send("Missing 'p' parameter");
      const json = Buffer.from(String(p), "base64").toString("utf8");
      project = JSON.parse(json);
    } else if (req.method === "POST") {
      project = req.body && typeof req.body === "object" ? req.body : {};
    } else {
      res.setHeader("Allow", "GET, POST, OPTIONS");
      return res.status(405).end("Method Not Allowed");
    }

    // Generar BC3 y normalizar CRLF
    let bc3Text = toBC3(project).replace(/\r?\n/g, "\r\n");
    if (!bc3Text.endsWith("\r\n")) bc3Text += "\r\n";

    // Codificar como latin1 (ISO-8859-1) para visores BC3
    const buf = Buffer.from(bc3Text, "latin1");
    const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(buf);
  } catch (e) {
    console.error(e);
    return res.status(500).send("Error generating BC3");
  }
}
