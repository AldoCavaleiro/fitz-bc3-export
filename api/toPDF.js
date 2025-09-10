import PDFDocument from "pdfkit";
import getStream from "get-stream";

export default async function toPDF({ title, subtitle, date, sections, footer }) {
  const doc = new PDFDocument();
  let buffers = [];

  doc.on("data", buffers.push.bind(buffers));
  doc.on("end", () => {});

  // Título
  if (title) {
    doc.fontSize(20).text(title, { align: "center" });
    doc.moveDown();
  }

  // Subtítulo
  if (subtitle) {
    doc.fontSize(16).text(subtitle, { align: "center" });
    doc.moveDown();
  }

  // Fecha
  if (date) {
    doc.fontSize(12).text(date, { align: "right" });
    doc.moveDown();
  }

  // Secciones
  if (sections && Array.isArray(sections)) {
    sections.forEach(sec => {
      doc.fontSize(14).text(sec.heading || "", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).text(sec.body || "");
      doc.moveDown();
    });
  }

  // Pie de página
  if (footer) {
    doc.moveDown();
    doc.fontSize(10).text(footer, { align: "center" });
  }

  doc.end();
  const buffer = await getStream.buffer(doc);

  return {
    filename: "memoria.pdf",
    contentType: "application/pdf",
    encoding: "base64",
    data: buffer.toString("base64"),
  };
}
