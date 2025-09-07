// api/download-pdf.js
export default async function handler(req, res) {
  try {
    const p = req.query.p;
    if (!p) return res.status(400).send("Missing 'p' parameter");

    const json = Buffer.from(String(p), 'base64').toString('utf8');
    const { filename = 'archivo.pdf', contentType = 'application/pdf', encoding = 'base64', data } = JSON.parse(json || '{}');

    if (!data) return res.status(400).send("Missing 'data'");
    const bin = Buffer.from(data, encoding === 'base64' ? 'base64' : undefined);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename.replace(/[^\w.\-]/g, '_')}"`);
    return res.status(200).send(bin);

  } catch (e) {
    console.error('[download-pdf] ERROR', e);
    return res.status(500).send('Error downloading file');
  }
}
