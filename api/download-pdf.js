// api/download-pdf.js
export default async function handler(req, res) {
  try {
    // 1) Leer 'p' tanto en GET como en POST
    let p = req.method === 'GET' ? req.query.p : (req.body && req.body.p);
    if (!p) return res.status(400).send("Missing 'p' parameter");

    // 2) Normalizar a string y limpiar
    if (typeof p !== 'string') p = String(p);
    p = p.trim();

    // 3) Aceptar URL codificada y 'espacios' en lugar de '+'
    try { p = decodeURIComponent(p); } catch { /* no pasa nada */ }
    p = p.replace(/ /g, '+');

    // 4) Decodificar base64 ⇒ JSON
    const jsonStr = Buffer.from(p, 'base64').toString('utf8');
    const parsed = JSON.parse(jsonStr);

    const filename    = (parsed.filename || 'documento.pdf').replace(/"/g, '');
    const contentType = parsed.contentType || 'application/pdf';
    const dataB64     = parsed.data;

    if (!dataB64) return res.status(400).send("Missing 'data' inside payload");

    const fileBuf = Buffer.from(dataB64, 'base64');

    // 5) Entregar como descarga
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', fileBuf.length);

    return res.status(200).send(fileBuf);
  } catch (e) {
    console.error(e);
    return res.status(400).send("Error preparando la descarga");
  }
}
