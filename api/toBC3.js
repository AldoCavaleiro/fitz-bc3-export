// api/toBC3.js
export function toBC3(project) {
  const today = new Date().toISOString().slice(0,10);
  const code = project.code || "001";
  const name = project.name || "Proyecto";
  const desc = project.desc || "";
  const version = project.version || "1.0";
  const items = Array.isArray(project.items) ? project.items : [];

  const safe = (s="") => String(s).replace(/\|/g, " ");

  const lines = [];
  // Cabecera FIEBDC-3 + declaramos UTF-8 (el BOM lo añade export-bc3.js)
  lines.push("~V|FIEBDC-3/2012|||UTF-8");
  lines.push(`~K|${code}|${name}|${desc}|${version}|${today}`);

  let total = 0;
  for (const it of items) {
    const c = it.code || "000";
    const d = safe(it.desc);
    const u = it.unit || "ud";
    const q = Number(it.qty || 0);
    const p = Number(it.price || 0);
    const notes = safe(it.notes || "");
    const imp = +(q * p).toFixed(2);
    total += imp;
    lines.push(`~C|${c}|${d}|${u}|${q}|${p}|${imp}|${notes}`);

    const children = Array.isArray(it.children) ? it.children : [];
    let idx = 1;
    for (const ch of children) {
      const cc = `${c}.${ch.code || String(idx).padStart(2,"0")}`;
      const cd = safe(ch.desc);
      const cu = ch.unit || "ud";
      const cq = Number(ch.qty || 0);
      const cp = Number(ch.price || 0);
      const cimp = +(cq * cp).toFixed(2);
      lines.push(`~D|${cc}|${cd}|${cu}|${cq}|${cp}|${cimp}|`);
      idx++;
    }
  }
  lines.push(`~M|TOTAL PROYECTO|${total.toFixed(2)}`);

  // 🔑 CRLF (Windows) + línea final
  return lines.join("\r\n") + "\r\n";
}
