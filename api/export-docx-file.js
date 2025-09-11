// api/export-docx-file.js
export const config = { runtime: "nodejs" };

import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const b = req.body || {};
    const title = b.title || "Documento";
    const subtitle = b.subtitle || "";
    const sections = Array.isArray(b.sections) ? b.sections : [];
    const filename = ((b.filename || title).replace(/\s+/g, "_")) + ".docx";

    const children = [];
    children.push(new Paragraph({ text: title, heading: HeadingLevel.TITLE }));
    if (subtitle) children.push(new Paragraph({ text: subtitle, heading: HeadingLevel.HEADING_2 }));
    children.push(new Paragraph({ text: b.date || "" }));

    for (const s of sections) {
      if (!s) continue;
      if (s.heading) children.push(new Paragraph({ text: s.heading, heading: HeadingLevel.HEADING_3 }));
      if (s.body) {
        const chunks = String(s.body).split(/\n{2,}/);
        for (const chunk of chunks) {
          children.push(new Paragraph(new TextRun(chunk)));
        }
      }
    }

    const doc = new Document({ sections: [{ properties: {}, children }] });
    const buffer = await Packer.toBuffer(doc);

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("EXPORT_DOCX_FILE_FAILED:", e);
    return res.status(500).json({ error: "EXPORT_DOCX_FILE_FAILED" });
  }
}
