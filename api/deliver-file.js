// api/deliver-file.js
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const {
      filename = 'file.bin',
      contentType = 'application/octet-stream',
      encoding = 'base64',
      data
    } = (req.body || {});

    if (!data || encoding !== 'base64') {
      return res.status(400).json({ error: "Invalid payload. Expect { filename, contentType, encoding:'base64', data }" });
    }

    const buffer = Buffer.from(data, 'base64');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);

    return res.status(200).send(buffer);
  } catch (e) {
    console.error('deliver-file error:', e);
    return res.status(500).json({ error: 'Failed to deliver file' });
  }
}
