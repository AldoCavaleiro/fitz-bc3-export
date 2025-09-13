// api/export.js
// Endpoint único y autosuficiente (sin imports) para PDF, BC3, DOCX, XLSX, CSV, DXF

/***** Helpers de respuesta y CORS (equivalente a _util.js) *****/
function okFileJSON(res, { filename, contentType, base64 }) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  return res.status(200).json({
    filename,
    contentType,
    encoding: "base64",
    data: base64,
  });
}
function handlePreflight(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") {
    res.status(204).end();
    return true;
  }
  return false;
}
async function readBody(req) {
  try { return await req.json(); }
  catch {
    const t = await req.text();
    try { return JSON.parse(t || "{}"); } catch { return {}; }
  }
}
function toBase64(data) {
  if (data instanceof Uint8Array) return Buffer.from(data).toString("base64");
  if (typeof data === "string")     return Buffer.from(data, "utf8").toString("base64");
  return Buffer.from(data).toString("base64");
}
function bad(res, msg, code = 400) {
  return res.status(code).json({ ok:false, error: msg });
}

/***** PDF mínimo sin dependencias (una página, texto) *****/
function pdfEscape(s) {
  return String(s ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}
function makePDF({ title = "Memoria técnica", subtitle = "", date = "", sections = [], footer = "" } = {}) {
  // Contenido del stream (coordenadas simples, fuente Helvetica 12/18/24)
  const lines = [];
  let y = 770;
  const push = (text, size = 12) => {
    const esc = pdfEscape(text);
    lines.push(`BT /F1 ${size} Tf 50 ${y} Td (${esc}) Tj ET`);
    y -= (size >= 18 ? 28 : 18);
  };
  push(title || "Documento", 24);
  if (subtitle) push(subtitle, 18);
  if (date)     push(date, 12);
  if (sections && sections.length) {
    for (const s of sections) {
      if (s.heading) push(String(s.heading).toUpperCase(), 14);
      if (s.body) {
        const body = String(s.body);
        // troceo sencillo por longitud
        const chunks = body.match(/.{1,90}(\s|$)/g) || [body];
        chunks.forEach(t => push(t.trim(), 12));
        y -= 6;
      }
    }
  }
  if (footer) {
    y = 40;
    lines.push(`BT /F1 10 Tf 50 ${y} Td (${pdfEscape(footer)}) Tj ET`);
  }
  const streamText = lines.join("\n");
  const stream = `<< /Length ${streamText.length} >>\nstream\n${streamText}\nendstream`;

  // Objetos PDF
  const objs = [];
  const add = (s) => objs.push(s);
  add("%PDF-1.4");
  add("1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj");
  add("2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj");
  add("3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 5 0 R /Resources << /Font << /F1 4 0 R >> >> >> endobj");
  add("4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj");
  add(`5 0 obj ${stream} endobj`);
  add("xref");
  // Construcción del xref
  let offset = 0;
  const parts = [];
  const pushPart = (p) => { parts.push(p); offset += Buffer.byteLength(p, "utf8"); };
  // cabecera
  pushPart(objs[0] + "\n");
  const xrefPositions = [0]; // obj 0 fake
  let pos = Buffer.byteLength(parts.join(""), "utf8");
  const xref = ["0000000000 65535 f "];

  for (let i = 1; i < objs.length; i++) {
    const objStr = objs[i] + "\n";
    xref.push(String(pos).padStart(10, "0") + " 00000 n ");
    parts.push(objStr);
    pos += Buffer.byteLength(objStr, "utf8");
  }

  const xrefStart = pos;
  parts.push("xref\n");
  parts.push(`0 ${objs.length}\n`);
  parts.push(xref.join("\n") + "\n");
  parts.push("trailer << /Size " + objs.length + " /Root 1 0 R >>\n");
  parts.push("startxref\n" + xrefStart + "\n%%EOF");

  return Buffer.from(parts.join(""), "utf8");
}

/***** BC3 muy básico (FIEBDC-3 simplificado) sin dependencias *****/
function makeBC3(project = {}) {
  // project: { code,name,desc,version, items:[ {code, desc, unit, qty, price, children:[{code, qty}]} ] }
  const items = Array.isArray(project.items) ? project.items : [];
  const name  = project.name || "Proyecto";
  const code  = project.code || "PRJ";
  const ver   = project.version || "1.0";
  const today = new Date().toISOString().slice(0,10);

  const L = [];
  // Cabecera mínima
  L.push("~V|FIEBDC-3/2012|1");
  L.push(`~P|${code}|${name}|${ver}|${today}`);

  // Definición de partidas (K = Key, D = Descripción, U = Unidad, E = Precio)
  for (const it of items) {
    const c = (it.code ?? "").toString().replace(/\|/g,"/");
    const d = (it.desc ?? "").toString().replace(/\|/g,"/");
    const u = (it.unit ?? "").toString().replace(/\|/g,"/");
    const p = Number(it.price || 0).toFixed(6);
    L.push(`~K|${c}`);
    if (d) L.push(`~D|${c}|${d}`);
    if (u) L.push(`~U|${c}|${u}`);
    L.push(`~E|${c}|${p}`);
  }
  // Composición simple (C)
  for (const it of items) {
    const parent = (it.code ?? "").toString().replace(/\|/g,"/");
    const ch = Array.isArray(it.children) ? it.children : [];
    for (const k of ch) {
      const child = (k.code ?? "").toString().replace(/\|/g,"/");
      const q = Number(k.qty || 0);
      L.push(`~C|${parent}|${child}|${q}`);
    }
  }
  // Fin
  L.push("~F");
  // FIEBDC usa ISO-8859-1 en muchos casos; devolvemos latin1
  return Buffer.from(L.join("\r\n"), "latin1");
}

/***** ZIP "store" + generadores mínimos DOCX/XLSX *****/
const CRC_TABLE = (() => {
  let c, table = new Array(256);
  for (let n = 0; n < 256; n++) {
    c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    table[n] = c >>> 0;
  } return table;
})();
function crc32(buf){ let crc=0^(-1); for(let i=0;i<buf.length;i++){ crc=(crc>>>8)^CRC_TABLE[(crc^buf[i])&0xFF]; } return (crc^(-1))>>>0; }
function dateToDos(dt=new Date()){
  const time=(dt.getHours()<<11)|(dt.getMinutes()<<5)|(Math.floor(dt.getSeconds()/2));
  const date=(((dt.getFullYear()-1980)&0x7F)<<9)|((dt.getMonth()+1)<<5)|(dt.getDate());
  return {time,date};
}
function u8(s){ return new TextEncoder().encode(s); }
function zipStore(files){
  const localParts=[],centralParts=[]; let offset=0; const {time,date}=dateToDos();
  for(const f of files){
    const nameBytes=u8(f.name);
    const data = f.data instanceof Uint8Array ? f.data : u8(String(f.data));
    const crc=crc32(data); const sz=data.length;

    const local=new Uint8Array(30+nameBytes.length+sz);
    let p=0; const s32=v=>{local[p++]=v&255;local[p++]=(v>>>8)&255;local[p++]=(v>>>16)&255;local[p++]=(v>>>24)&255;};
    const s16=v=>{local[p++]=v&255;local[p++]=(v>>>8)&255;};
    s32(0x04034b50); s16(20); s16(0); s16(0); s16(time); s16(date); s32(crc); s32(sz); s32(sz); s16(nameBytes.length); s16(0);
    local.set(nameBytes,p); p+=nameBytes.length; local.set(data,p);
    localParts.push(local);

    const central=new Uint8Array(46+nameBytes.length); p=0;
    const c32=v=>{central[p++]=v&255;central[p++]=(v>>>8)&255;central[p++]=(v>>>16)&255;central[p++]=(v>>>24)&255;};
    const c16=v=>{central[p++]=v&255;central[p++]=(v>>>8)&255;};
    c32(0x02014b50); c16(20); c16(20); c16(0); c16(0); c16(time); c16(date); c32(crc); c32(sz); c32(sz);
    c16(nameBytes.length); c16(0); c16(0); c16(0); c16(0); c32(0); c32(offset); central.set(nameBytes,p);
    centralParts.push(central); offset += local.length;
  }
  const centralSize=centralParts.reduce((a,b)=>a+b.length,0);
  const localSize=localParts.reduce((a,b)=>a+b.length,0);
  const end=new Uint8Array(22); let q=0;
  const e32=v=>{end[q++]=v&255;end[q++]=(v>>>8)&255;end[q++]=(v>>>16)&255;end[q++]=(v>>>24)&255;};
  const e16=v=>{end[q++]=v&255;end[q++]=(v>>>8)&255;};
  e32(0x06054b50); e16(0); e16(0); e16(files.length); e16(files.length); e32(centralSize); e32(localSize); e16(0);
  const out=new Uint8Array(localSize+centralSize+end.length); let pos=0;
  for(const part of localParts){ out.set(part,pos); pos+=part.length; }
  for(const part of centralParts){ out.set(part,pos); pos+=part.length; }
  out.set(end,pos); return out;
}
function escapeXml(str){
  return String(str ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;")
    .replace(/"/g,"&quot;").replace(/'/g,"&apos;");
}
// DOCX
function buildDOCX({ title="", subtitle="", sections=[] } = {}){
  const para = (t)=>`<w:p><w:r><w:t>${escapeXml(t)}</w:t></w:r></w:p>`;
  const docXml =
`<?xml version="1.0" encoding="UTF-8"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${para(title ? `Memoria técnica: ${title}` : "Memoria técnica")}
    ${subtitle ? para(subtitle) : ""}
    ${sections.map(s => para(`** ${s.heading} **  ${s.body}`)).join("")}
    <w:sectPr/>
  </w:body>
</w:document>`;
  const files=[
    {name:"[Content_Types].xml",data:u8(
`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>` )},
    {name:"_rels/.rels",data:u8(
`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>` )},
    {name:"word/document.xml",data:u8(docXml)}
  ];
  return zipStore(files);
}
// XLSX
function colName(n){ let s=""; while(n>0){ const m=(n-1)%26; s=String.fromCharCode(65+m)+s; n=Math.floor((n-1)/26);} return s; }
function buildXLSX({ rows=[] } = {}){
  const sheetData = rows.map((r,i) =>
    `<row r="${i+1}">${r.map((c,j)=>`<c r="${colName(j+1)}${i+1}" t="inlineStr"><is><t>${escapeXml(String(c ?? ""))}</t></is></c>`).join("")}</row>`
  ).join("");
  const files=[
    {name:"[Content_Types].xml",data:u8(
`<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
</Types>` )},
    {name:"_rels/.rels",data:u8(
`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>` )},
    {name:"xl/workbook.xml",data:u8(
`<?xml version="1.0" encoding="UTF-8"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets><sheet name="Sheet1" sheetId="1" r:id="rId1"/></sheets>
</workbook>` )},
    {name:"xl/_rels/workbook.xml.rels",data:u8(
`<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
</Relationships>` )},
    {name:"xl/worksheets/sheet1.xml",data:u8(
`<?xml version="1.0" encoding="UTF-8"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetData>${sheetData}</sheetData>
</worksheet>` )}
  ];
  return zipStore(files);
}
// CSV
function buildCSV({ rows=[] } = {}){
  const esc=v=>{ const s=v==null?"":String(v); return /[",;\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; };
  return u8(rows.map(r=>r.map(esc).join(";")).join("\n"));
}
// DXF ASCII mínimo
function buildDXF({ title="MEMORIA", subtitle="", sections=[] } = {}){
  const txt = [
    "0","SECTION","2","HEADER","9","$ACADVER","1","AC1027","0","ENDSEC",
    "0","SECTION","2","ENTITIES",
    "0","TEXT","8","0","10","0","20","0","30","0","40","10","1", `${title}${subtitle?(" - "+subtitle):""}`,
    "0","ENDSEC","0","EOF"
  ].join("\n");
  return u8(txt);
}

/***** Handler *****/
export default async function handler(req, res) {
  if (handlePreflight(req, res)) return;
  if (req.method !== "POST") return bad(res, "Use POST /api/export con JSON válido", 405);

  const body = await readBody(req);
  const format = String(body.format || "").toLowerCase();
  let filename = body.filename || `export.${format || "bin"}`;

  let contentType = "application/octet-stream";
  let bin;

  try {
    switch (format) {
      case "pdf": {
        bin = makePDF({
          title: body.title,
          subtitle: body.subtitle,
          date: body.date,
          sections: body.sections || [],
          footer: body.footer || ""
        });
        contentType = "application/pdf";
        if (!filename.endsWith(".pdf")) filename += ".pdf";
        break;
      }
      case "bc3": {
        // Si ya te llega un BC3 textual, lo respetamos; si no, generamos uno básico.
        if (typeof body.bc3 === "string") {
          bin = Buffer.from(body.bc3, "latin1");
        } else {
          bin = makeBC3(body.project || {});
        }
        contentType = "text/plain; charset=ISO-8859-1";
        if (!filename.endsWith(".bc3")) filename += ".bc3";
        break;
      }
      case "docx": {
        bin = buildDOCX({ title: body.title, subtitle: body.subtitle, sections: body.sections || [] });
        contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
        if (!filename.endsWith(".docx")) filename += ".docx";
        break;
      }
      case "xlsx": {
        bin = buildXLSX({ rows: body.rows || [] });
        contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        if (!filename.endsWith(".xlsx")) filename += ".xlsx";
        break;
      }
      case "csv": {
        bin = buildCSV({ rows: body.rows || [] });
        contentType = "text/csv; charset=utf-8";
        if (!filename.endsWith(".csv")) filename += ".csv";
        break;
      }
      case "dxf": {
        bin = buildDXF({ title: body.title, subtitle: body.subtitle, sections: body.sections || [] });
        contentType = "application/dxf";
        if (!filename.endsWith(".dxf")) filename += ".dxf";
        break;
      }
      default:
        return bad(res, "format debe ser uno de: pdf, bc3, docx, xlsx, csv, dxf");
    }
  } catch (e) {
    console.error("Export error:", e);
    return bad(res, `Error generando ${format}: ${e.message || e}`);
  }

  return okFileJSON(res, {
    filename,
    contentType,
    base64: toBase64(bin),
  });
}
