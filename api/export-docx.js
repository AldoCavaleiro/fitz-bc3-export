export const config = { runtime: "edge" };

/**
 * Stub: genera un DOCX "falso" como texto .docx (para no romper el flujo).
 * Reemplázalo luego por una generación real con la librería `docx`.
 */
export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const { title = "Documento", sections = [], filename = "documento.docx" } = await req.json();
    const body = [
      `${title}`,
      "",
      ...sections.flatMap(s => [s.heading || "", s.body || "", ""])
    ].join("\n");

    // No es un DOCX real, pero permite que el agente no falle hasta que lo sustituyas.
    const data = bufferToBase64(new TextEncoder().encode(body).buffer);

    return new Response(JSON.stringify({
      filename,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      encoding: "base64",
      data
    }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "export-docx failed", detail: String(err) }), { status: 500 });
  }
}

function bufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
