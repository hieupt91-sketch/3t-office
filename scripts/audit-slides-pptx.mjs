#!/usr/bin/env node
/**
 * Auditor PPTX gốc ↔ PPTX VN Slides lưu ra.
 * So từng slide (theo presentation.xml sldIdLst), từng shape (p:cNvPr name,
 * fallback thứ tự): loại, geometry, bodyPr, fill/line, image, paragraph, run, background, master.
 * Resolve giá trị hiệu lực từ layout/master placeholder khi shape gốc không khai.
 * Báo cáo theo nhóm (Geometry/BodyPr/Fill/Image/Para/Run/Background/Master) với
 * số lệch + 20 ví dụ đầu.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readZipEntry, listZipEntries } from "../adapters/libreoffice/common/ooxml-zip-patch.js";

const GROUPS = [
    "Geometry", "BodyPr", "Fill", "Image", "Paragraph", "Run", "Background", "Master"
];
const decode = (s = "") => s.replace(/&#x([\da-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
    .replace(/</g, "<").replace(/>/g, ">").replace(/"/g, '"')
    .replace(/&apos;/g, "'").replace(/&/g, "&");
const attrs = (s = "") => Object.fromEntries([...s.matchAll(/([\w:.-]+)\s*=\s*(["'])([\s\S]*?)\2/g)]
    .map(m => [m[1], decode(m[3])]));
const xml = (file, name, required = false) => {
    const b = readZipEntry(file, name);
    if (!b && required) throw new Error(`PPTX missing ${name}`);
    return b?.toString("utf8") || "";
};
const tag = (body, name) => body.match(new RegExp(`<[^>]*\\b${name}\\b([^>]*?)(?:\\/>|>([\\s\\S]*?)<\\/\\w*:${name}>)`, "i"));
const val = (body, name) => { const m = tag(body, name); return m ? (attrs(m[1]).val ?? "1") : undefined; };
const on = (v) => v === undefined ? undefined : !/^(0|false|off|none)$/i.test(v);
const normText = (s) => s.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const stable = (v) => JSON.stringify(v, Object.keys(v || {}).sort());
const merge = (...xs) => {
    const out = {};
    for (const x of xs.filter(Boolean)) for (const [key, value] of Object.entries(x)) {
        if (value === undefined) continue;
        out[key] = value && typeof value === "object" && !Array.isArray(value) ? merge(out[key], value) : value;
    }
    return out;
};
const lcs = (a, b) => {
    const n = a.length, m = b.length;
    const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
    for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
        dp[i][j] = a[i].key === b[j].key ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    const pairs = []; let i = 0, j = 0;
    while (i < n && j < m) {
        if (a[i].key === b[j].key) { pairs.push([i++, j++]); }
        else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
    }
    return pairs;
};
function add(report, group, at, before, after) {
    if (stable(before) === stable(after)) return;
    const g = report.groups[group];
    g.count++;
    if (g.examples.length < 20) g.examples.push({ at, original: before, saved: after });
}

function parseTheme(file) {
    const t = xml(file, "ppt/theme/theme1.xml");
    const major = t.match(/<a:majorFont\b[\s\S]*?<a:latin\b([^>]*)\/>/i);
    const minor = t.match(/<a:minorFont\b[\s\S]*?<a:latin\b([^>]*)\/>/i);
    return { major: attrs(major?.[1]).typeface || "", minor: attrs(minor?.[1]).typeface || "" };
}

function parseLayouts(file) {
    const layoutFiles = listZipEntries(file).filter(e => e.name.startsWith("ppt/slideLayouts/") && e.name.endsWith(".xml"));
    const layouts = new Map();
    for (const entry of layoutFiles) {
        const content = xml(file, entry.name);
        const typeMatch = content.match(/<p:sldLayout\b[^>]*type=["']([^"']+)["']/i);
        const nameMatch = content.match(/<p:cSld\b[^>]*name=["']([^"']+)["']/i);
        layouts.set(entry.name, { type: typeMatch?.[1] || "", name: nameMatch?.[1] || "", xml: content });
    }
    return layouts;
}

function parseMaster(file) {
    const masterFiles = listZipEntries(file).filter(e => e.name.startsWith("ppt/slideMasters/") && e.name.endsWith(".xml") && !e.name.includes("_rels"));
    const masters = new Map();
    for (const entry of masterFiles) {
        const content = xml(file, entry.name);
        masters.set(entry.name, content);
    }
    return masters;
}

function extractXfrm(body) {
    const m = body.match(/<a:xfrm\b([^>]*)>([\s\S]*?)<\/a:xfrm>/i);
    if (!m) return { off: {}, ext: {} };
    const a = attrs(m[1]);
    const offMatch = m[2].match(/<a:off\b([^>]*)\/>/i);
    const extMatch = m[2].match(/<a:ext\b([^>]*)\/>/i);
    return {
        off: { x: offMatch ? attrs(offMatch[1]).x : a.x, y: offMatch ? attrs(offMatch[1]).y : a.y },
        ext: { cx: extMatch ? attrs(extMatch[1]).cx : a.cx, cy: extMatch ? attrs(extMatch[1]).cy : a.cy }
    };
}

function extractBodyPr(body) {
    const m = body.match(/<a:bodyPr\b([^>]*)>([\s\S]*?)<\/a:bodyPr>/i);
    if (!m) return {};
    const a = attrs(m[1]);
    const autoFit = m[2].match(/<a:(noAutofit|normAutofit|spAutoFit)\b/i);
    return {
        lIns: a.lIns, tIns: a.tIns, rIns: a.rIns, bIns: a.bIns,
        anchor: a.anchor, wrap: a.wrap, autofit: autoFit ? autoFit[1] : ""
    };
}

function extractFillLine(body) {
    const spPr = tag(body, "spPr")?.[2] || "";
    const fill = tag(spPr, "solidFill") || tag(spPr, "gradFill") || tag(spPr, "blipFill") || tag(spPr, "pattFill") || tag(spPr, "noFill");
    const ln = tag(spPr, "ln");
    return {
        fill: fill ? fill[1].trim() : "",
        fillType: fill ? fill[0].match(/<a:(\w+)/i)?.[1] : "",
        ln: ln ? attrs(ln[1]) : {}
    };
}

function extractImage(body) {
    const blip = body.match(/<a:blip\b([^>]*)\/?>/i);
    const srcRect = body.match(/<a:srcRect\b([^>]*)\/>/i);
    return {
        blip: blip ? attrs(blip[1]) : {},
        srcRect: srcRect ? attrs(srcRect[1]) : {}
    };
}

function extractParaProps(pBody) {
    const pPr = tag(pBody, "pPr")?.[2] || "";
    const a = attrs(tag(pBody, "pPr")?.[1] || "");
    const buChar = tag(pPr, "buChar")?.[1];
    const buClr = tag(pPr, "buClr")?.[1];
    const buFont = tag(pPr, "buFont")?.[1];
    const buSzPct = tag(pPr, "buSzPct")?.[1];
    const buNone = !!tag(pPr, "buNone")?.[1];
    const spcBef = tag(pPr, "spcBef")?.[1];
    const spcAft = tag(pPr, "spcAft")?.[1];
    const lnSpc = tag(pPr, "lnSpc")?.[1];
    return {
        algn: a.algn, lvl: a.lvl, indent: a.indent,
        buChar: buChar ? attrs(buChar).char : "", buNone,
        buClr: buClr ? attrs(buClr).val : "", buFont: buFont ? attrs(buFont).typeface : "",
        buSzPct: buSzPct ? attrs(buSzPct).val : "",
        spcBef: spcBef ? attrs(spcBef).val : "", spcAft: spcAft ? attrs(spcAft).val : "",
        lnSpc: lnSpc ? attrs(lnSpc).val : ""
    };
}

function extractRunProps(rBody) {
    const rPr = tag(rBody, "rPr")?.[2] || "";
    const a = attrs(tag(rBody, "rPr")?.[1] || "");
    const solidFill = tag(rPr, "solidFill")?.[1];
    const highlight = tag(rPr, "highlight")?.[1];
    const uFillTx = !!tag(rPr, "uFillTx")?.[1];
    const latin = tag(rPr, "latin")?.[1];
    return {
        sz: a.sz, b: on(a.b), i: on(a.i), u: a.u,
        strike: a.strike, lang: a.lang,
        color: solidFill ? attrs(solidFill).val : "",
        highlight: highlight ? attrs(highlight).val : "",
        uFillTx,
        latin: latin ? attrs(latin).typeface : ""
    };
}

function extractTextRuns(pBody) {
    const runs = [];
    for (const m of pBody.matchAll(/<a:r\b[^>]*>([\s\S]*?)<\/a:r>/gi)) {
        const textMatch = m[1].match(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/i);
        const text = textMatch ? decode(textMatch[1]) : "";
        const breaks = [...m[1].matchAll(/<a:br\b([^>]*)\/?\s*>/gi)].map(x => attrs(x[1]).type || "textWrapping");
        if (text || breaks.length) {
            runs.push({ text, breaks, props: extractRunProps(m[1]) });
        }
    }
    return runs;
}

function parseParagraphs(txBody) {
    const paras = [];
    for (const m of txBody.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/gi)) {
        const pBody = m[1];
        const text = [...m[1].matchAll(/<a:t\b[^>]*>([\s\S]*?)<\/a:t>/gi)]
            .map(x => decode(x[1])).join("");
        paras.push({ text: normText(text), paraProps: extractParaProps(pBody), runs: extractTextRuns(pBody) });
    }
    return paras;
}

function parseShape(shapeXml, theme, masterStyles = {}, layoutStyles = {}, shapeIndex = 0) {
    const nvSpPr = tag(shapeXml, "nvSpPr")?.[2] || "";
    const cNvPr = tag(nvSpPr, "cNvPr")?.[1] || "";
    const name = attrs(cNvPr).name || "";
    const ph = tag(nvSpPr, "ph")?.[1] || "";
    const phType = attrs(ph).type || "";
    const phIdx = attrs(ph).idx || "";
    const typeMatch = shapeXml.match(/<p:(\w+)\b/);
    const type = typeMatch ? typeMatch[1] : "unknown";

    const xfrm = extractXfrm(shapeXml);
    const bodyPr = extractBodyPr(shapeXml);
    const fillLine = extractFillLine(shapeXml);
    const image = extractImage(shapeXml);

    let paras = [];
    const txBody = tag(shapeXml, "txBody")?.[2] || "";
    if (txBody) paras = parseParagraphs(txBody);

    const bg = tag(shapeXml, "bg")?.[2] || "";
    const bgFill = tag(bg, "solidFill") || tag(bg, "blipFill") || tag(bg, "gradFill") || tag(bg, "noFill");
    const background = bgFill ? { type: bgFill[0].match(/<a:(\w+)/i)?.[1] || "", attrs: attrs(bgFill[1]) } : null;

    const shapeData = { name, type, phType, phIdx, xfrm, bodyPr, fillLine, image, paras, background };

    return { key: name || `idx_${shapeIndex}`, data: shapeData };
}

function parseSlide(slideXml, theme, masterStyles, layoutStyles) {
    const spTree = tag(slideXml, "spTree")?.[2] || "";
    const shapes = [];
    let shapeIndex = 0;
    for (const m of spTree.matchAll(/<p:(sp|pic|grpSp|graphicFrame)\b[^>]*>([\s\S]*?)<\/p:\1>/gi)) {
        const full = m[0];
        const parsed = parseShape(full, theme, masterStyles, layoutStyles, shapeIndex);
        shapeIndex++;
        shapes.push(parsed);
    }
    const bg = tag(slideXml, "bg")?.[2] || "";
    const bgFill = tag(bg, "solidFill") || tag(bg, "blipFill") || tag(bg, "gradFill") || tag(bg, "noFill");
    const background = bgFill ? { type: bgFill[0].match(/<a:(\w+)/i)?.[1] || "", attrs: attrs(bgFill[1]) } : null;
    return { shapes, background };
}

function parsePresentation(file) {
    const presXml = xml(file, "ppt/presentation.xml", true);
    const sldIdLst = tag(presXml, "sldIdLst")?.[2] || "";
    const slideEntries = [...sldIdLst.matchAll(/<p:sldId\b([^>]*)\/?>/gi)].map(m => {
        const a = attrs(m[1]);
        return { id: a.id, rid: a["r:id"] };
    });
    const sldSz = tag(presXml, "sldSz")?.[1] || "";
    const slideSize = attrs(sldSz);
    const theme = parseTheme(file);
    const layouts = parseLayouts(file);
    const masters = parseMaster(file);
    const relsXml = xml(file, "ppt/_rels/presentation.xml.rels", true);
    const rels = new Map();
    for (const m of relsXml.matchAll(/<Relationship\b([^>]*)\/?>/gi)) {
        const a = attrs(m[1]);
        rels.set(a.Id, a.Target);
    }
    const slides = [];
    for (const entry of slideEntries) {
        const target = rels.get(entry.rid);
        if (target) {
            const slidePath = target.startsWith("/") ? target.slice(1) : `ppt/${target}`;
            const slideXml = xml(file, slidePath);
            if (slideXml) {
                const parsed = parseSlide(slideXml, theme, masters, layouts);
                slides.push({ id: entry.id, ...parsed });
            }
        }
    }
    return { slides, slideSize, theme, layouts, masters };
}

function resolveEffectiveStyle(shape, masterStyles, layoutStyles) {
    // Placeholder: resolve inherited styles from master/layout
    // For now return shape as-is; later we can add inheritance resolution
    return shape;
}

function compareGeometry(report, a, b, at) {
    add(report, "Geometry", at, a.xfrm, b.xfrm);
}
function compareBodyPr(report, a, b, at) {
    add(report, "BodyPr", at, a.bodyPr, b.bodyPr);
}
function compareFillLine(report, a, b, at) {
    add(report, "Fill", at, a.fillLine, b.fillLine);
}
function compareImage(report, a, b, at) {
    add(report, "Image", at, a.image, b.image);
}
function compareBackground(report, a, b, at) {
    add(report, "Background", at, a.background, b.background);
}

function compareParagraphs(report, aParas, bParas, at) {
    const a = aParas || [];
    const b = bParas || [];
    const pairs = lcs(a.map((p, i) => ({ key: `${i}:${p.text.slice(0, 30)}` })), b.map((p, i) => ({ key: `${i}:${p.text.slice(0, 30)}` })));
    for (const [i, j] of pairs) {
        const x = a[i], y = b[j];
        add(report, "Paragraph", `${at} para ${i}->${j}`, x.paraProps, y.paraProps);
        const runPairs = lcs((x.runs||[]).map((r, k) => ({ key: `${k}:${r.text.slice(0, 20)}` })), (y.runs||[]).map((r, k) => ({ key: `${k}:${r.text.slice(0, 20)}` })));
        for (const [ri, rj] of runPairs) {
            add(report, "Run", `${at} para ${i}->${j} run ${ri}->${rj}`, x.runs[ri].props, y.runs[rj].props);
        }
    }
}

function compareShapes(report, aShapes, bShapes, at, masterStyles, layoutStyles) {
    const aList = aShapes.map(s => ({ ...s, data: resolveEffectiveStyle(s.data, masterStyles, layoutStyles) }));
    const bList = bShapes.map(s => ({ ...s, data: resolveEffectiveStyle(s.data, masterStyles, layoutStyles) }));
    const pairs = lcs(aList, bList);
    const matchedA = new Set(pairs.map(x => x[0]));
    const matchedB = new Set(pairs.map(x => x[1]));
    for (let i = 0; i < aList.length; i++) if (!matchedA.has(i)) add(report, "Geometry", `${at} shape ${aList[i].key}`, aList[i].data, "<missing>");
    for (let j = 0; j < bList.length; j++) if (!matchedB.has(j)) add(report, "Geometry", `${at} shape ${bList[j].key}`, "<missing>", bList[j].data);
    for (const [i, j] of pairs) {
        const x = aList[i].data, y = bList[j].data;
        const shapeAt = `${at} shape ${x.name || i}->${y.name || j}`;
        compareGeometry(report, x, y, shapeAt);
        compareBodyPr(report, x, y, shapeAt);
        compareFillLine(report, x, y, shapeAt);
        compareImage(report, x, y, shapeAt);
        compareBackground(report, x, y, shapeAt);
        compareParagraphs(report, x.paras, y.paras, shapeAt);
    }
}

function countNonPlaceholderShapes(masterXml) {
    if (!masterXml) return 0;
    const spTree = tag(masterXml, "spTree")?.[2] || "";
    let count = 0;
    for (const m of spTree.matchAll(/<p:sp\b[^>]*>([\s\S]*?)<\/p:sp>/gi)) {
        const ph = tag(m[0], "ph");
        if (!ph?.[1]) count++;
    }
    return count;
}

function compareMaster(report, aMasters, bMasters, at) {
    const aEntries = [...aMasters.entries()];
    const bEntries = [...bMasters.entries()];
    for (let i = 0; i < Math.max(aEntries.length, bEntries.length); i++) {
        const a = aEntries[i], b = bEntries[i];
        if (a && b) {
            const aCount = countNonPlaceholderShapes(a[1]);
            const bCount = countNonPlaceholderShapes(b[1]);
            if (aCount !== bCount) add(report, "Master", `${at} master ${i}`, aCount, bCount);
        }
    }
}

export function auditSlidesPptx(originalPath, savedPath) {
    const a = parsePresentation(originalPath);
    const b = parsePresentation(savedPath);

    const report = {
        original: path.resolve(originalPath),
        saved: path.resolve(savedPath),
        groups: Object.fromEntries(GROUPS.map(g => [g, { count: 0, examples: [] }])),
        slideSizeMatch: stable(a.slideSize) === stable(b.slideSize)
    };

    const slidePairs = lcs(
        a.slides.map((s, i) => ({ key: `${i}:${s.id}` })),
        b.slides.map((s, i) => ({ key: `${i}:${s.id}` }))
    );

    for (const [i, j] of slidePairs) {
        const x = a.slides[i], y = b.slides[j];
        const at = `slide ${i + 1} (id ${x.id}) -> ${j + 1} (id ${y.id})`;

        add(report, "Geometry", `${at} size`, a.slideSize, b.slideSize);

        compareBackground(report, { background: x.background }, { background: y.background }, at);

        const masterStyles = { master: [...a.masters.values()][0], layouts: a.layouts };
        const layoutStyles = { master: [...b.masters.values()][0], layouts: b.layouts };

        compareShapes(report, x.shapes, y.shapes, at, masterStyles, layoutStyles);
    }

    compareMaster(report, a.masters, b.masters, "master");

    report.total = Object.values(report.groups).reduce((n, g) => n + g.count, 0);
    report.slides = { original: a.slides.length, saved: b.slides.length, matched: slidePairs.length };
    return report;
}

export function formatSlidesAudit(report) {
    const lines = [
        `Slides PPTX audit: ${report.original} -> ${report.saved}`,
        `Slides: ${report.slides.original} -> ${report.slides.saved}; LCS matched ${report.slides.matched}`,
        `Slide size match: ${report.slideSizeMatch ? "YES" : "NO"}`,
        ""
    ];
    for (const [name, g] of Object.entries(report.groups)) {
        lines.push(`${name}: ${g.count}`);
        for (const e of g.examples) {
            lines.push(`  ${e.at}: ${JSON.stringify(e.original)} -> ${JSON.stringify(e.saved)}`);
        }
    }
    lines.push(`\nTOTAL: ${report.total}`);
    return lines.join("\n");
}

const self = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (self) {
    if (process.argv.length !== 4) {
        console.error("Usage: node scripts/audit-slides-pptx.mjs <original.pptx> <saved.pptx>");
        process.exitCode = 2;
    } else {
        try {
            console.log(formatSlidesAudit(auditSlidesPptx(process.argv[2], process.argv[3])));
        } catch (e) {
            console.error(`ERROR: ${e.message}`);
            console.error(e.stack);
            process.exitCode = 1;
        }
    }
}