export const config = { runtime: "edge" };

/**
 * Genera un BC3 simple a partir de { rows, filename }
 * rows: array de arrays [code, desc, unit, qty, price, notes] (o similar). Flexible.
 * Devuelve FileResponse JSON (base64).
 */
export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const { rows = [], filename = "presupuesto.bc3" } = await req.json();

    // Intentar usar tu generador toBC3.js si existe
    let content;
    try {
      const mod = await import(`${new URL("./toBC3.js", import.meta.url).href}`);
      if (mod && typeof mod.default === "function") {
        const buf = await mod.default({ rows });
        content = bufferToBase64(buf instanceof ArrayBuffer ? buf : buf.buffer || buf);
      }
    } catch(_) {}

    if (!content) {
      // Fallback: BC3 de texto muy básico (no estricto, pero compatible con varios visores)
      const lines = [];
      lines.push("~V|BC3|FITZ|1");
      for (const r of rows) {
        const [code="", desc="", unit="", qty="", price="", notes=""] = r || [];
        lines.push(`~C|${code}|${desc}|${unit}|${Number(qty)||0}|${Number(price)||0}|${notes}`);
      }
      const txt = lines.join("\n");
      content = bufferToBase64(new TextEncoder().encode(txt).buffer);
    }

    return new Response(JSON.stringify({
      filename,
      contentType: "application/octet-stream",
      encoding: "base64",
      data: content
    }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "export-bc3 failed", detail: String(err) }), { status: 500 });
  }
}

function bufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
