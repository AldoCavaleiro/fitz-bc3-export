import toPDF from "./toPDF.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { title, subtitle, date, sections, footer, filename } = req.body;

    const pdf = await toPDF({ title, subtitle, date, sections, footer });

    res.status(200).json({
      filename: filename || pdf.filename,
      contentType: pdf.contentType,
      encoding: pdf.encoding,
      data: pdf.data,
    });
  } catch (error) {
    console.error("PDF export error:", error);
    res.status(500).json({ error: "Error generating PDF" });
  }
}
