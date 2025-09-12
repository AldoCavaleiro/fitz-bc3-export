// api/export-bc3-link.js
export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed' }); return; }
  try {
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host  = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;

    const r = await fetch(`${origin}/api/export-bc3-file`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });
    const j = await r.json();
    if (!r.ok) { res.status(r.status).json(j); return; }

    const { filename, contentType, encoding, data } = j || {};
    if (!filename || !contentType || encoding !== 'base64' || !data) {
      res.status(400).json({ error: 'Bad export payload' }); return;
    }

    const payload = JSON.stringify({ f: filename, c: contentType, d: data });
    const b64 = Buffer.from(payload, 'utf8').toString('base64')
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

    const url = `${origin}/api/download-file?p=${b64}`;
    res.status(200).json({ url, filename, contentType });
  } catch (e) {
    console.error('export-bc3-link error:', e);
    res.status(500).json({ error: 'export-bc3-link failed' });
  }
}
