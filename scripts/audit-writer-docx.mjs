#!/usr/bin/env node
/** Audit effective Writer formatting between two DOCX packages. No dependencies. */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readZipEntry } from "../adapters/libreoffice/common/ooxml-zip-patch.js";

const GROUPS = ["Text", "Font", "Size", "Bold", "Italic", "Underline", "Color", "Highlight", "CharacterSpacing", "Spacing", "Indent", "Align", "Style", "List", "PageBreak", "KeepNext", "Table", "Image"];
const decode = (s = "") => s.replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const attrs = (s = "") => Object.fromEntries([...s.matchAll(/([\w:.-]+)\s*=\s*(["'])([\s\S]*?)\2/g)].map(m => [m[1].replace(/^\w+:/, ""), decode(m[3])]));
const xml = (file, name, required = false) => { const b = readZipEntry(file, name); if (!b && required) throw new Error(`DOCX missing ${name}`); return b?.toString("utf8") || ""; };
const tag = (body, name) => body.match(new RegExp(`<w:${name}\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/w:${name}>)`, "i"));
const val = (body, name) => { const m = tag(body, name); return m ? (attrs(m[1]).val ?? "1") : undefined; };
const on = (v) => v === undefined ? undefined : !/^(0|false|off|none)$/i.test(v);
const normText = (s) => s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const stable = (v) => JSON.stringify(v, Object.keys(v || {}).sort());
const merge = (...xs) => { const out = {}; for (const x of xs.filter(Boolean)) for (const [key, value] of Object.entries(x)) { if (value === undefined) continue; out[key] = value && typeof value === "object" && !Array.isArray(value) ? merge(out[key], value) : value; } return out; };

function parseTheme(file) {
  const t = xml(file, "word/theme/theme1.xml");
  const major = t.match(/<a:majorFont\b[\s\S]*?<a:latin\b([^>]*)\/>/i);
  const minor = t.match(/<a:minorFont\b[\s\S]*?<a:latin\b([^>]*)\/>/i);
  return { major: attrs(major?.[1]).typeface || "", minor: attrs(minor?.[1]).typeface || "" };
}

function runProps(body = "", theme = {}) {
  const rf = attrs(tag(body, "rFonts")?.[1]);
  const themeFont = (key) => /major/i.test(key || "") ? theme.major : /minor/i.test(key || "") ? theme.minor : "";
  return {
    fontAscii: rf.ascii || themeFont(rf.asciiTheme), fontHAnsi: rf.hAnsi || themeFont(rf.hAnsiTheme), fontEastAsia: rf.eastAsia || themeFont(rf.eastAsiaTheme),
    size: val(body, "sz"), bold: on(val(body, "b")), italic: on(val(body, "i")), underline: val(body, "u"),
    color: val(body, "color"), highlight: val(body, "highlight"), characterSpacing: val(body, "spacing")
  };
}
function paraProps(body = "") {
  const pick = (name, keys) => { const a = attrs(tag(body, name)?.[1]); return Object.fromEntries(keys.filter(k => a[k] !== undefined).map(k => [k, a[k]])); };
  const num = tag(body, "numPr")?.[2] || "";
  return {
    align: val(body, "jc"), spacing: pick("spacing", ["before", "after", "line", "lineRule"]), indent: pick("ind", ["left", "right", "firstLine", "hanging"]),
    style: val(body, "pStyle"), list: { numId: val(num, "numId"), ilvl: val(num, "ilvl") }, pageBreakBefore: on(val(body, "pageBreakBefore")), keepNext: on(val(body, "keepNext"))
  };
}

function parseStyles(file, theme) {
  const s = xml(file, "word/styles.xml");
  const dd = tag(s, "docDefaults")?.[2] || "";
  const defaults = { run: runProps(tag(dd, "rPrDefault")?.[2], theme), para: paraProps(tag(dd, "pPrDefault")?.[2]) };
  const styles = new Map();
  for (const m of s.matchAll(/<w:style\b([^>]*)>([\s\S]*?)<\/w:style>/gi)) {
    const a = attrs(m[1]); const id = a.styleId; if (!id) continue;
    styles.set(id, { id, type: a.type, name: attrs(tag(m[2], "name")?.[1]).val || id, basedOn: val(m[2], "basedOn"), run: runProps(tag(m[2], "rPr")?.[2], theme), para: paraProps(tag(m[2], "pPr")?.[2]) });
  }
  const resolve = (id, seen = new Set()) => { const x = styles.get(id); if (!x || seen.has(id)) return { run: {}, para: {}, name: id || "" }; seen.add(id); const b = resolve(x.basedOn, seen); return { run: merge(b.run, x.run), para: merge(b.para, x.para), name: x.name }; };
  return { defaults, resolve };
}

function topLevelParagraphs(documentXml) {
  const body = tag(documentXml, "body")?.[2] || documentXml;
  const withoutTextboxes = body.replace(/<w:txbxContent\b[\s\S]*?<\/w:txbxContent>/gi, "");
  const out = []; let tableDepth = 0;
  const token = /<w:tbl\b[^>]*>|<\/w:tbl>|<w:p\b[^>]*>[\s\S]*?<\/w:p>/gi;
  for (const m of withoutTextboxes.matchAll(token)) { if (/^<w:tbl/i.test(m[0])) tableDepth++; else if (/^<\/w:tbl/i.test(m[0])) tableDepth--; else if (!tableDepth) out.push(m[0]); }
  return out;
}
function parseParagraph(p, styles, theme, index) {
  const ppr = tag(p, "pPr")?.[2] || ""; const directP = paraProps(ppr); const ps = styles.resolve(directP.style);
  const effectiveP = merge(styles.defaults.para, ps.para, directP); effectiveP.style = ps.name || directP.style; effectiveP.pageBreakBefore = Boolean(effectiveP.pageBreakBefore); effectiveP.keepNext = Boolean(effectiveP.keepNext);
  const runs = [];
  for (const m of p.matchAll(/<w:r\b[^>]*>([\s\S]*?)<\/w:r>/gi)) {
    const rpr = tag(m[1], "rPr")?.[2] || ""; const rs = styles.resolve(val(rpr, "rStyle"));
    const text = [...m[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)].map(x => decode(x[1])).join("");
    const breaks = [...m[1].matchAll(/<w:br\b([^>]*)\/?\s*>/gi)].map(x => attrs(x[1]).type || "textWrapping");
    if (text || breaks.length) { const props=merge(styles.defaults.run, ps.run, rs.run, runProps(rpr, theme)); props.bold=Boolean(props.bold); props.italic=Boolean(props.italic); props.underline=props.underline || "none"; props.highlight=props.highlight || "none"; props.characterSpacing=props.characterSpacing || "0"; runs.push({ text, breaks, props }); }
  }
  return { index, text: normText(runs.map(r => r.text).join("")), runs, props: effectiveP, pageBreak: runs.some(r => r.breaks.includes("page")) || effectiveP.pageBreakBefore };
}
function parseTables(doc) {
  const tables = [];
  for (const [i, m] of [...doc.matchAll(/<w:tbl\b[^>]*>([\s\S]*?)<\/w:tbl>/gi)].entries()) {
    const rows = [...m[1].matchAll(/<w:tr\b[^>]*>([\s\S]*?)<\/w:tr>/gi)];
    const cells = [...m[1].matchAll(/<w:tc\b[^>]*>([\s\S]*?)<\/w:tc>/gi)].map(c => { const pr = tag(c[1], "tcPr")?.[2] || ""; return { borders: (tag(pr, "tcBorders")?.[2] || "").replace(/\s+/g, " "), gridSpan: val(pr, "gridSpan"), vMerge: val(pr, "vMerge"), shading: val(pr, "shd") }; });
    tables.push({ index: i + 1, rows: rows.length, columns: Math.max(0, ...rows.map(r => [...r[1].matchAll(/<w:tc\b/gi)].length)), width: stable(attrs(tag(m[1], "tblW")?.[1])), grid: [...(tag(m[1], "tblGrid")?.[2] || "").matchAll(/<w:gridCol\b([^>]*)\/>/gi)].map(g => attrs(g[1]).w), cells });
  } return tables;
}
function parseDoc(file) { const theme = parseTheme(file); const styles = parseStyles(file, theme); const d = xml(file, "word/document.xml", true); return { paragraphs: topLevelParagraphs(d).map((p, i) => parseParagraph(p, styles, theme, i + 1)), tables: parseTables(d), images: [...d.matchAll(/<wp:inline\b[\s\S]*?<wp:extent\b([^>]*)\/>[\s\S]*?<\/wp:inline>/gi)].map((m, i) => ({ index: i + 1, ...attrs(m[1]) })) }; }

function lcs(a, b) { const n = a.length, m = b.length, dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1)); for (let i=n-1;i>=0;i--) for(let j=m-1;j>=0;j--) dp[i][j]=a[i].text===b[j].text?dp[i+1][j+1]+1:Math.max(dp[i+1][j],dp[i][j+1]); const pairs=[]; let i=0,j=0; while(i<n&&j<m){if(a[i].text===b[j].text){pairs.push([i++,j++]);}else if(dp[i+1][j]>=dp[i][j+1])i++;else j++;} return pairs; }
function add(report, group, at, before, after) { if (stable(before) === stable(after)) return; const g=report.groups[group]; g.count++; if(g.examples.length<20)g.examples.push({ paragraph: at, original: before, saved: after }); }
function compareRuns(report, a, b, at) { const ar=a.runs.filter(r=>r.text), br=b.runs.filter(r=>r.text); const pairs=lcs(ar.map(r=>({text:normText(r.text)})),br.map(r=>({text:normText(r.text)}))); for(const [i,j] of pairs){const x=ar[i].props,y=br[j].props; add(report,"Font",at,[x.fontAscii,x.fontHAnsi,x.fontEastAsia],[y.fontAscii,y.fontHAnsi,y.fontEastAsia]); add(report,"Size",at,x.size,y.size); add(report,"Bold",at,x.bold,y.bold); add(report,"Italic",at,x.italic,y.italic); add(report,"Underline",at,x.underline,y.underline); add(report,"Color",at,x.color,y.color); add(report,"Highlight",at,x.highlight,y.highlight); add(report,"CharacterSpacing",at,x.characterSpacing,y.characterSpacing); } }
export function auditWriterDocx(originalPath, savedPath) {
  const a=parseDoc(originalPath), b=parseDoc(savedPath); const report={ original:path.resolve(originalPath), saved:path.resolve(savedPath), groups:Object.fromEntries(GROUPS.map(g=>[g,{count:0,examples:[]}])) };
  const pairs=lcs(a.paragraphs,b.paragraphs), matchedA=new Set(pairs.map(x=>x[0])),matchedB=new Set(pairs.map(x=>x[1]));
  for(let i=0;i<a.paragraphs.length;i++)if(!matchedA.has(i))add(report,"Text",a.paragraphs[i].index,a.paragraphs[i].text,"<missing>"); for(let j=0;j<b.paragraphs.length;j++)if(!matchedB.has(j))add(report,"Text",`saved:${b.paragraphs[j].index}`,"<missing>",b.paragraphs[j].text);
  for(const [i,j] of pairs){const x=a.paragraphs[i],y=b.paragraphs[j],at=`${x.index} -> ${y.index}`; compareRuns(report,x,y,at); add(report,"Spacing",at,x.props.spacing,y.props.spacing); add(report,"Indent",at,x.props.indent,y.props.indent); add(report,"Align",at,x.props.align,y.props.align); add(report,"Style",at,x.props.style,y.props.style); add(report,"List",at,x.props.list,y.props.list); add(report,"PageBreak",at,x.pageBreak,y.pageBreak); add(report,"KeepNext",at,x.props.keepNext,y.props.keepNext); }
  add(report,"Table","document",a.tables,b.tables); add(report,"Image","document",a.images,b.images); report.total=Object.values(report.groups).reduce((n,g)=>n+g.count,0); report.paragraphs={original:a.paragraphs.length,saved:b.paragraphs.length,matched:pairs.length}; return report;
}
export function formatWriterAudit(report) { const lines=[`Writer DOCX audit: ${report.original} -> ${report.saved}`,`Paragraphs: ${report.paragraphs.original} -> ${report.paragraphs.saved}; LCS matched ${report.paragraphs.matched}`]; for(const [name,g] of Object.entries(report.groups)){lines.push(`${name}: ${g.count}`); for(const e of g.examples)lines.push(`  paragraph ${e.paragraph}: ${JSON.stringify(e.original)} -> ${JSON.stringify(e.saved)}`);} lines.push(`TOTAL: ${report.total}`); return lines.join("\n"); }
const self=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url); if(self){if(process.argv.length!==4){console.error("Usage: node scripts/audit-writer-docx.mjs <original.docx> <saved.docx>");process.exitCode=2;}else{try{console.log(formatWriterAudit(auditWriterDocx(process.argv[2],process.argv[3])));}catch(e){console.error(`ERROR: ${e.message}`);process.exitCode=1;}}}
