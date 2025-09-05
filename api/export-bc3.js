// api/export-bc3.js
import { toBC3 } from "./toBC3.js";

function setCORS(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  // CORS para peticiones desde navegador
  setCORS(res);

  // Responder al preflight
  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  // Solo permitimos POST (además de OPTIONS)
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Use POST" });
  }

  try {
    // Cuerpo esperado: JSON de proyecto
    const project = req.body && typeof req.body === "object" ? req.body : {};
    const bc3Text = toBC3(project);

    // Nombre sugerido del archivo
    const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

    // Forzar descarga con extensión correcta
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(bc3Text);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generating BC3" });
  }
}

