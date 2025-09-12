// api/toBC3.js
// Conversor de datos planos a formato BC3 (texto)

function toBC3(project) {
  const today = new Date().toISOString().slice(0, 10);
  const code = project.code || "001";
  const name = project.name || "Proyecto";
  const desc = project.desc || "";
  const version = project.version || "1.0";
  const items = project.items || [];

  const lines = [];

  // Cabecera FIEBDC-3 con charset
  lines.push(`~V|FIEBDC-3/2021|ISO-8859-1`);
  lines.push(`~K|${code}|${name}|${desc}|${version}|${today}`);

  let total = 0;
  for (const it of items) {
    const c = it.code || "";
    const n = it.name || "";
    const u = it.unit || "";
    const q = Number(it.quantity || 0);
    const p = Number(it.price || 0);
    const imp = (q * p).toFixed(2);
    total += q * p;
    lines.push(`~L|${c}|${n}|${u}|${q}|${p}|${imp}`);
  }

  lines.push(`~M|TOTAL PROYECTO|${total.toFixed(2)}`);

  return lines.join("\r\n") + "\r\n";
}

// Export nombrado (para import { toBC3 })
export { toBC3 };
