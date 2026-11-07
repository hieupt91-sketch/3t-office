/**
 * Unit Tests: FIX-D6-2510 — font names from documents get metric-compatible substitutes and a generic family,
 * and Calibri / Calibri Light resolve to the bundled Carlito when the real font is missing (macOS).
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { documentFontStack, genericFamilyFor, DOCUMENT_FONT_SUBSTITUTES } from "../../platform/fonts/font-stack.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SUB_DIR = path.join(ROOT, "platform", "fonts", "substitutes");

function fontFaces(css) {
  return [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map(m => {
    const body = m[1];
    return {
      family: body.match(/font-family:\s*"([^"]+)"/)[1],
      weight: body.match(/font-weight:\s*(\d+)/)[1],
      style: body.match(/font-style:\s*(\w+)/)[1],
      src: body.match(/src:\s*([^;]+);/)[1].trim(),
    };
  });
}

export async function runDocumentFontStackTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("documentFontStack: Calibri / Calibri Light → real font first, Carlito, sans-serif", () => {
    assert.equal(documentFontStack("Calibri"), "Calibri, Carlito, sans-serif");
    assert.equal(documentFontStack("Calibri Light"), "\"Calibri Light\", Carlito, sans-serif");
    assert.equal(documentFontStack("'Calibri Light'"), "\"Calibri Light\", Carlito, sans-serif");
    assert.equal(documentFontStack("calibri"), "calibri, Carlito, sans-serif");
  });

  await test("documentFontStack: Cambria, Arial, Times New Roman, Courier New get their substitutes + class", () => {
    assert.equal(documentFontStack("Cambria"), "Cambria, Caladea, serif");
    assert.equal(documentFontStack("Arial"), "Arial, \"Liberation Sans\", Arimo, sans-serif");
    assert.equal(documentFontStack("Times New Roman"), "\"Times New Roman\", \"Liberation Serif\", Tinos, serif");
    assert.equal(documentFontStack("Courier New"), "\"Courier New\", \"Liberation Mono\", Cousine, monospace");
  });

  await test("documentFontStack: every stack ends with a generic family (unknown names → sans-serif)", () => {
    for (const name of ["Segoe Print", "Be Vietnam Pro", "Consolas", "SimSun", "VNI-Times", "Tahoma", "3T Font", "Font.Name"]) {
      const stack = documentFontStack(name);
      assert.match(stack, /, (sans-serif|serif|monospace)$/, `${name} → ${stack}`);
    }
    assert.equal(genericFamilyFor("Consolas"), "monospace");
    assert.equal(genericFamilyFor("SimSun"), "serif");
    assert.equal(genericFamilyFor("Không biết"), "sans-serif");
    assert.equal(documentFontStack("3T Font"), "\"3T Font\", sans-serif");
  });

  await test("documentFontStack: lists that already end in a generic, CSS-wide keywords, var() and empty stay as they are", () => {
    for (const value of ["Calibri, Carlito, Arial, sans-serif", "\"Calibri Light\", serif", "var(--vno-font-ui)", "inherit", "monospace"]) {
      assert.equal(documentFontStack(value), value);
    }
    assert.equal(documentFontStack(""), "");
    assert.equal(documentFontStack(null), "");
    assert.equal(documentFontStack(undefined), "");
  });

  await test("documentFontStack: no duplicate substitutes; quotes in names cannot break out of the value", () => {
    assert.equal(documentFontStack("Calibri, Carlito"), "Calibri, Carlito, sans-serif");
    const stack = documentFontStack("Evil\"; color: red");
    assert.ok(!/";\s*color/.test(stack.replace(/\\"/g, "")), stack);
    assert.ok(Object.isFrozen(DOCUMENT_FONT_SUBSTITUTES));
  });

  await test("Sheet: _applyStylesToDom renders the stack, model keeps the document font name", () => {
    const dom = { style: {} };
    const styles = { fontFamily: "Calibri", fontWeight: "bold" };
    SheetGridController.prototype._applyStylesToDom.call({ _applyTextRotationToDom() {} }, dom, styles);
    assert.equal(dom.style.fontFamily, "Calibri, Carlito, sans-serif");
    assert.equal(dom.style.fontWeight, "bold");
    assert.equal(styles.fontFamily, "Calibri");
  });

  await test("substitute-fonts.css: Calibri / Calibri Light prefer the installed font (local first), then bundled Carlito", () => {
    const css = readFileSync(path.join(SUB_DIR, "substitute-fonts.css"), "utf8");
    const faces = fontFaces(css);
    const key = f => `${f.family}|${f.weight}|${f.style}`;
    const expected = {
      "Carlito|400|normal": "Carlito-Regular.ttf", "Carlito|700|normal": "Carlito-Bold.ttf",
      "Carlito|400|italic": "Carlito-Italic.ttf", "Carlito|700|italic": "Carlito-BoldItalic.ttf",
      "Calibri|400|normal": "Carlito-Regular.ttf", "Calibri|700|normal": "Carlito-Bold.ttf",
      "Calibri|400|italic": "Carlito-Italic.ttf", "Calibri|700|italic": "Carlito-BoldItalic.ttf",
      // Carlito has no light weight; only 400 faces so a bold Calibri Light is synthesised as with the real font.
      "Calibri Light|400|normal": "Carlito-Regular.ttf", "Calibri Light|400|italic": "Carlito-Italic.ttf",
    };
    assert.deepEqual(faces.map(key).sort(), Object.keys(expected).sort());
    for (const face of faces) {
      assert.ok(face.src.startsWith("local("), `${key(face)} must try an installed font first`);
      const urls = [...face.src.matchAll(/url\("([^"]+)"\)/g)].map(m => m[1]);
      assert.deepEqual(urls, [expected[key(face)]], key(face));
      assert.ok(face.src.indexOf("url(") > face.src.lastIndexOf("local("), `${key(face)}: url after every local()`);
      if (face.family !== "Carlito") assert.match(face.src, new RegExp(`local\\("${face.family}`), `${key(face)} keeps the real font`);
    }
    assert.ok(!/https?:|\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, "")), "offline: no network URL");
  });

  await test("Carlito files: present, match SOURCES.json (pinned upstream, sha256, OFL 1.1, unmodified)", () => {
    const manifest = JSON.parse(readFileSync(path.join(SUB_DIR, "SOURCES.json"), "utf8"));
    assert.equal(manifest.modified, false);
    const carlito = manifest.fonts.carlito;
    assert.equal(carlito.license, "OFL-1.1");
    assert.deepEqual(carlito.reserved_font_names, ["Carlito"]);
    assert.match(carlito.license_url, /^https:\/\/raw\.githubusercontent\.com\/google\/fonts\/[0-9a-f]{40}\//);
    assert.equal(createHash("sha256").update(readFileSync(path.join(SUB_DIR, "OFL.txt"))).digest("hex"), carlito.license_sha256);
    const ofl = readFileSync(path.join(SUB_DIR, "OFL.txt"), "utf8");
    assert.match(ofl, /SIL OPEN FONT LICENSE Version 1\.1/);
    assert.match(ofl, /Reserved Font Name "Carlito"/);
    assert.deepEqual(Object.keys(carlito.files).sort(), ["Carlito-Bold.ttf", "Carlito-BoldItalic.ttf", "Carlito-Italic.ttf", "Carlito-Regular.ttf"]);
    let total = 0;
    for (const [file, info] of Object.entries(carlito.files)) {
      assert.match(info.url, /^https:\/\/raw\.githubusercontent\.com\/google\/fonts\/[0-9a-f]{40}\/ofl\/carlito\//);
      const data = readFileSync(path.join(SUB_DIR, file));
      assert.equal(data.length, info.bytes, file);
      assert.equal(createHash("sha256").update(data).digest("hex"), info.sha256, file);
      total += data.length;
    }
    assert.ok(total < 3 * 1024 * 1024, `bundle size ${total}`);
  });

  await test("fonts.css: substitute stylesheet is @imported before any other rule (index.html unchanged)", () => {
    const theme = readFileSync(path.join(ROOT, "platform", "theme", "fonts", "fonts.css"), "utf8");
    const rules = theme.replace(/\/\*[\s\S]*?\*\//g, "").split("\n").map(s => s.trim()).filter(Boolean);
    const imports = rules.filter(r => r.startsWith("@import"));
    assert.ok(imports.includes('@import url("../../fonts/substitutes/substitute-fonts.css");'));
    assert.ok(rules.slice(0, imports.length).every(r => r.startsWith("@import")), "@import must precede other rules");
    assert.ok(existsSync(path.join(ROOT, "platform", "fonts", "substitutes", "substitute-fonts.css")));
  });

  return results;
}
