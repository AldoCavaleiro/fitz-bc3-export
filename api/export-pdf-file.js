// api/export-pdf-file.js
import { toPDF } from './toPDF.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const body = (req.body && typeof req.body === 'object') ? req.body : {};
    const {
      title = 'Memoria técnica',
      subtitle = '',
      date = new Date().toISOString().slice(0, 10),
      sections = [],
      footer = 'PGM Proyectos',
      filename = 'memoria.pdf',
    } = body;

    const pdfBytes = await toPDF({ title, subtitle, date, sections, footer }); // Uint8Array/Buffer

    const safeName = String(filename).replace(/[^\w.\-]/g, '_');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeName}"`);
    res.setHeader('Cache-Control', 'no-store');

    // IMPORTANTE: responder en binario, no JSON
    return res.status(200).end(Buffer.from(pdfBytes));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'PDF_ERROR' });
  }
}
