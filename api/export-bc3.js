// api/export-bc3-json.js
import { toBC3 } from "./toBC3.js";
import { okFileJSON, handlePreflight } from "./_util.js";

export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Use POST" });
  }

  const project = req.body && typeof req.body === "object" ? req.body : {};

  // Generar texto BC3 normalizado a CRLF
  let bc3Text = toBC3(project).replace(/\r?\n/g, "\r\n");
  if (!bc3Text.endsWith("\r\n")) bc3Text += "\r\n";

  const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

  // ISO-8859-1 (latin1), sin BOM, en base64
  const base64 = Buffer.from(bc3Text, "latin1").toString("base64");

  return okFileJSON(res, {
    filename,
    contentType: "application/octet-stream",
    base64
  });
}
