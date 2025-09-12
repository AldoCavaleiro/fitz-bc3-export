// api/download-file.js
export default async function handler(req, res) {
  try {
    const { p } = req.query || {};
    if (!p) {
      res.status(400).send('Missing "p"');
      return;
    }

    // base64url → base64
    const base64 = String(p).replace(/-/g, '+').replace(/_/g, '/');
    const pad = base64.length % 4 === 0 ? '' : '='.repeat(4 - (base64.length % 4));
    const jsonStr = Buffer.from(base64 + pad, 'base64').toString('utf8');

    let obj;
    try {
      obj = JSON.parse(jsonStr);
    } catch {
      res.status(400).send('Bad "p" payload');
      return;
    }

    const filename    = obj.f || 'download.bin';
    const contentType = obj.c || 'application/octet-stream';
    const dataBase64  = obj.d;

    if (!dataBase64) {
      res.status(400).send('Empty data');
      return;
    }

    const buf = Buffer.from(dataBase64, 'base64');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).send(buf);
  } catch (err) {
    console.error('download-file error:', err);
    res.status(500).send('Internal error');
  }
}
