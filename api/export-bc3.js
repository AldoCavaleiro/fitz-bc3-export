// api/export-bc3.js
import { toBC3 } from "./toBC3.js";

// --- CORS (para llamadas desde navegador / herramientas) ---
function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  // Habilitar CORS
  setCORS(res);

  // Preflight CORS
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Aceptamos solo POST (además de OPTIONS)
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    // 1) Leer el JSON del presupuesto
    const project = req.body && typeof req.body === "object" ? req.body : {};

    // 2) Construir el texto BC3
    const bc3Text = toBC3(project);

    // 3) Sugerir nombre de archivo con .bc3
    const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

    // 4) Cabeceras para FORZAR descarga con extensión correcta
    //    y marcarlo como binario genérico
    res.setHeader("Content-Type", "application/octet-stream; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // 5) Añadir BOM UTF-8 al principio para que herramientas
    //    como ILOVEBC3 detecten bien la codificación
    const bom = Buffer.from("\uFEFF", "utf8");
    const content = Buffer.concat([bom, Buffer.from(bc3Text, "utf8")]);

    // 6) Enviar
    return res.status(200).send(content);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generating BC3" });
  }
}
