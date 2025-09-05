// api/export-bc3.js
import { toBC3 } from "./toBC3.js";

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCORS(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    const project = req.body && typeof req.body === "object" ? req.body : {};
    const bc3Text = toBC3(project);

    const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

    // 🔑 Forzar descarga + dejar que el front-end use el nombre .bc3
    res.setHeader("Content-Type", "application/octet-stream; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("X-Content-Type-Options", "nosniff");

    // 🔑 Añadir BOM UTF-8 para herramientas que lo requieren
    const bom = Buffer.from("\uFEFF", "utf8");
    const content = Buffer.concat([bom, Buffer.from(bc3Text, "utf8")]);

    return res.status(200).send(content);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generating BC3" });
  }
}
