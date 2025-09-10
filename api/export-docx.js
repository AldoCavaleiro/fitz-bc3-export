// api/export-docx.js
import * as docx from "docx";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const {
      title = "Documento",
      subtitle = "",
      sections = [], // [{ heading, body }]
      footer = "",
      filename = "documento.docx"
    } = req.body || {};

    const children = [];

    // Título
    children.push(new docx.Paragraph({
      text: String(title),
      heading: docx.HeadingLevel.TITLE
    }));

    // Subtítulo
    if (subtitle) {
      children.push(new docx.Paragraph({
        text: String(subtitle),
        heading: docx.HeadingLevel.HEADING_2
      }));
    }

    // Separador
    children.push(new docx.Paragraph({ text: "" }));

    // Secciones
    for (const s of Array.isArray(sections) ? sections : []) {
      if (s.heading) {
        children.push(new docx.Paragraph({
          text: String(s.heading),
          heading: docx.HeadingLevel.HEADING_3
        }));
      }
      if (s.body) {
        children.push(new docx.Paragraph({ text: String(s.body) }));
        children.push(new docx.Paragraph({ text: "" }));
      }
    }

    // Pie
    if (footer) {
      children.push(new docx.Paragraph({ text: "" }));
      children.push(new docx.Paragraph({
        children: [ new docx.TextRun({ text: String(footer), size: 18, color: "666666" }) ]
      }));
    }

    const doc = new docx.Document({
      sections: [{ properties: {}, children }]
    });

    const buffer = await docx.Packer.toBuffer(doc);
    const data = Buffer.from(buffer).toString("base64");

    return res.status(200).json({
      filename,
      contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      encoding: "base64",
      data
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generando el DOCX" });
  }
}
