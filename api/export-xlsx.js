export const config = { runtime: "edge" };

/**
 * Stub XLSX: por ahora devuelve CSV con extensión XLSX para no romper el flujo.
 * Más tarde sustitúyelo por generación real de XLSX con `xlsx` o `exceljs`.
 */
export default async function handler(req) {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
    }

    const { headers = [], rows = [], filename = "datos.xlsx" } = await req.json();

    const csv = [headers, ...rows]
      .map(cols => cols.map(v => csvEscape(v)).join(","))
      .join("\n");

    const data = bufferToBase64(new TextEncoder().encode(csv).buffer);

    return new Response(JSON.stringify({
      filename,
      contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      encoding: "base64",
      data
    }), { status: 200, headers: { "Content-Type": "application/json", "Cache-Control": "no-store" } });

  } catch (err) {
    return new Response(JSON.stringify({ error: "export-xlsx failed", detail: String(err) }), { status: 500 });
  }
}

function csvEscape(v) {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function bufferToBase64(ab) {
  const bytes = new Uint8Array(ab);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}
