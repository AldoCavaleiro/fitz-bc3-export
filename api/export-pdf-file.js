// api/export-pdf-file.js
// Runtime: Node (NO edge). Requiere "type": "module" en package.json
// Devuelve: { filename, contentType, encoding: "base64", data }

import { toPDF } from "./toPDF.js";
import { Buffer } from "node:buffer";

// Lee el body en Node (tanto si viene como objeto como si viene en stream)
async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  return await new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => (raw += chunk));
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = await readJsonBody(req);

    // Campos esperados por toPDF (ignora los que no necesite)
    const {
      title,
      subtitle,
      date,
      sections = [],
      footer,
      filename = "memoria_cabana.pdf",
    } = body || {};

    // Generar PDF (Uint8Array) con pdf-lib (toPDF.js)
    const pdfBytes = await toPDF({ title, subtitle, date, sections, footer });

    // Codificar en base64 para el entregador
    const b64 = Buffer.from(pdfBytes).toString("base64");

    const payload = {
      filename,
      contentType: "application/pdf",
      encoding: "base64",
      data: b64,
    };

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(payload);
  } catch (err) {
    console.error("export-pdf-file error:", err);
    return res.status(500).json({
      error: "PDF_EXPORT_FAILED",
      message: err?.message || "Unknown error",
    });
  }
}
