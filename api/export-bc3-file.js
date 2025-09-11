// api/export-bc3-file.js
export const config = { runtime: "nodejs" };

import { toBC3 } from "./toBC3.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST" });
  }
  try {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const bc3Text = toBC3(body);                        // string
    const buffer = Buffer.from(bc3Text, "utf8");
    const filename = ((body.name || "presupuesto").replace(/\s+/g, "_")) + ".bc3";

    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(buffer);
  } catch (e) {
    console.error("EXPORT_BC3_FILE_FAILED:", e);
    return res.status(500).json({ error: "EXPORT_BC3_FILE_FAILED" });
  }
}
