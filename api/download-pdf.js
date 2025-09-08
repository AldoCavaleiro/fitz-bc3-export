// api/download-pdf.js
export default async function handler(req, res) {
  try {
    const p = req.query.p || '';
    if (!p || typeof p !== 'string') {
      return res.status(400).send("Falta el parámetro 'p'");
    }
    let payload;
    try {
      payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
    } catch {
      try {
        payload = JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
      } catch {
        return res.status(400).send('Parámetro p inválido (no JSON/base64)');
      }
    }

    const { filename = 'archivo.pdf', contentType = 'application/pdf', data } = payload || {};
    if (!data || typeof data !== 'string') {
      return res.status(400).send('Payload sin "data" base64');
    }

    const buf = Buffer.from(data, 'base64');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buf.length);
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).send('Error preparando la descarga');
  }
}
