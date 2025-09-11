export const config = { runtime: "edge" };

/**
 * Recibe un FileResponse JSON { filename, contentType, encoding:"base64", data }
 * y entrega el binario con cabeceras correctas para que ChatGPT adjunte el archivo.
 */
export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const body = await req.json().catch(() => ({}));
    const { filename = "file.bin", contentType = "application/octet-stream", encoding, data } = body || {};

    if (!data || encoding !== "base64") {
      return new Response(JSON.stringify({ error: "Invalid payload: require {filename, contentType, encoding:'base64', data}" }), { status: 400 });
    }

    const buffer = Uint8Array.from(atob(data), c => c.charCodeAt(0));

    return new Response(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: "deliver-file failed", detail: String(err) }), { status: 500 });
  }
}
