// api/download-pdf.js
export default async function handler(req, res) {
  try {
    const p = req.query.p;
    if (!p) return res.status(400).send("Missing 'p' parameter");

    const parsed = JSON.parse(Buffer.from(p, 'base64').toString('utf8'));
    const { filename = 'documento.pdf', contentType = 'application/pdf', data } = parsed || {};
    if (!data) return res.status(400).send('Missing base64 data');

    const buf = Buffer.from(data, 'base64');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(buf);
  } catch (e) {
    console.error('DOWNLOAD ERROR:', e);
    res.status(500).send('Error preparando la descarga');
  }
}
