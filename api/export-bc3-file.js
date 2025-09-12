// api/export-bc3-file.js
// Runtime: Node (NO edge). Requiere "type": "module" en package.json
// Devuelve: { filename, contentType, encoding: "base64", data }

import { toBC3 } from "./toBC3.js";
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

    // Estructura ligera de proyecto para BC3 (puedes enviar solo lo que uses)
    // Ejemplo esperado:
    // {
    //   "code": "PRJ001",
    //   "name": "Cabaña de madera",
    //   "desc": "Memoria técnica",
    //   "version": "1.0",
    //   "items": [
    //     { "code":"01", "name":"Cimiento", "unit":"ud", "quantity":1, "price":1200 }
    //   ]
    // }
    const {
      code,
      name,
      desc,
      version,
      items = [],
      filename = "presupuesto.bc3",
    } = body || {};

    const bc3Text = toBC3({ code, name, desc, version, items }); // string
    const b64 = Buffer.from(bc3Text, "utf8").toString("base64");

    const payload = {
      filename,
      // Algunos visores BC3 prefieren ISO-8859-1; si lo necesitas, cámbialo a ese encoding en toBC3
      contentType: "text/plain",
      encoding: "base64",
      data: b64,
    };

    res.setHeader("Content-Type", "application/json");
    return res.status(200).json(payload);
  } catch (err) {
    console.error("export-bc3-file error:", err);
    return res.status(500).json({
      error: "BC3_EXPORT_FAILED",
      message: err?.message || "Unknown error",
    });
  }
}
