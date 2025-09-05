// api/export-bc3.js
import { toBC3 } from "./toBC3.js";

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === "OPTIONS") return res.status(204).end();

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const project = req.body && typeof req.body === "object" ? req.body : {};
    let bc3Text = toBC3(project);

    // 🔒 Normalizar saltos de línea a CRLF SIEMPRE
    bc3Text = bc3Text.replace(/\r?\n/g, "\r\n");
    if (!bc3Text.endsWith("\r\n")) bc3Text += "\r\n";

    // Nombre del archivo .bc3
    const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

    // Forzar descarga como archivo, evitar sniff de texto
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Transfer-Encoding", "binary");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // ⚠️ Sin BOM y en ISO-8859-1 (latin1) para compat máxima
    const buffer = Buffer.from(bc3Text, "latin1");

    return res.status(200).send(buffer);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generating BC3" });
  }
}
