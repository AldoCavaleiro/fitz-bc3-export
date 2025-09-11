// api/export-pdf.js
import { toPDF } from "./toPDF.js";

export const config = {
  runtime: "edge",
};

function okJSON(body) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // Evita compresiones que puedan alterar el body en proxys:
      "cache-control": "no-store",
    },
  });
}

function badJSON(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export default async function handler(req) {
  if (req.method !== "POST") {
    return badJSON("Method Not Allowed", 405);
  }

  let payload;
  try {
    payload = await req.json();
  } catch {
    return badJSON("Invalid JSON body", 400);
  }

  // Campos esperados (ajusta a lo que ya envías desde el agente)
  const {
    title = "Memoria técnica",
    subtitle = "",
    date = new Date().toISOString().slice(0, 10),
    sections = [],
    footer = "PGM Proyectos",
    filename = "memoria.pdf",
  } = payload || {};

  try {
    // Genera bytes del PDF con tu helper (debes tener toPDF funcionando)
    const pdfBytes = await toPDF({ title, subtitle, date, sections, footer });

    // → base64 LIMPIO, sin saltos de línea
    const data = Buffer.from(pdfBytes).toString("base64");

    return okJSON({
      filename,
      contentType: "application/pdf",
      encoding: "base64",
      data, // <-- sin prefijos, solo el base64
    });
  } catch (err) {
    return badJSON(`Error generating PDF: ${err?.message || err}`, 500);
  }
}
