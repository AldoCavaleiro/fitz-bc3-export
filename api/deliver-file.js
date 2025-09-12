// api/deliver-file.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { filename, contentType, encoding, data } = req.body || {};

    if (!filename || !contentType || encoding !== 'base64' || !data) {
      res.status(400).json({ error: 'Invalid payload: expected { filename, contentType, encoding:"base64", data }' });
      return;
    }

    // Codifica el JSON en base64url para incluirlo seguro en la URL (?p=...)
    const payload = JSON.stringify({ f: filename, c: contentType, d: data });
    const base64 = Buffer.from(payload, 'utf8').toString('base64');
    const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

    // Construye la URL absoluta a /api/download-file
    const proto = (req.headers['x-forwarded-proto'] || 'https');
    const host  = (req.headers['x-forwarded-host'] || req.headers.host);
    const origin = `${proto}://${host}`;

    const url = `${origin}/api/download-file?p=${base64url}`;

    // Devolvemos URL (no binario) para que el chat muestre un enlace limpio y estable
    res.status(200).json({ url, filename, contentType });
  } catch (err) {
    console.error('deliver-file error:', err);
    res.status(500).json({ error: 'deliver-file failed' });
  }
}
