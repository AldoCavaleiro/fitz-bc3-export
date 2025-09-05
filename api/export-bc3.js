// api/export-bc3.js
import { toBC3 } from "./toBC3.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const project = req.body && typeof req.body === "object" ? req.body : {};
    const bc3Text = toBC3(project);
    const filename = (project.name || "proyecto").replace(/\s+/g, "_") + ".bc3";

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    return res.status(200).send(bc3Text);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "Error generating BC3" });
  }
}
