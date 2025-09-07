// api/export-pdf.js
import { toPDF } from './toPDF.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const payload = (req.body && typeof req.body === 'object') ? req.body : {};
    const { base64 } = await toPDF(payload);

    const filename = (payload.filename || 'documento.pdf').replace(/\s+/g, '_');

    return res.status(200).json({
      filename,
      contentType: 'application/pdf',
      encoding: 'base64',
      data: base64,
      // opcional: url de descarga directa con el JSON empaquetado
      url: `https://${req.headers.host}/api/download-pdf?p=${encodeURIComponent(
        Buffer.from(JSON.stringify({ filename, contentType: 'application/pdf', data: base64 })).toString('base64')
      )}`,
    });
  } catch (e) {
    console.error('PDF ERROR:', e);
    return res.status(500).json({ error: 'Error generando el PDF' });
  }
}

