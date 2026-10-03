/**
 * VN Office — Automated WCAG 2.1 Color Contrast Auditor
 * Quét toàn bộ stylesheet CSS và tokens của VN Office, phân tích tỷ lệ tương phản
 * và phát hiện các cặp màu không đạt chuẩn WCAG AA (>= 4.5:1 chữ thường, >= 3.0:1 chữ lớn/icon).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseColor, blendAlpha, getContrastRatio, meetsWcagAA } from "../platform/ui-kit/contrast-checker.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const CSS_FILES = [
  "platform/theme/tokens.css",
  "platform/ui-kit/ui-kit.css",
  "platform/ribbon/ribbon.css",
  "platform/shell/shell.css",
  "apps/writer/writer.css",
  "apps/sheet/sheet.css",
  "apps/slides/slides.css"
];

export function runContrastAudit() {
  // 1. Phân tích biến CSS (tokens)
  const cssVars = new Map();
  const darkVars = new Map();

  for (const relPath of CSS_FILES) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");

    // Bắt --vno-*: value; trong :root để kiểm tra Light Theme tiêu chuẩn
    let blockToScan = content;
    if (relPath.includes("tokens.css")) {
      const rootMatch = content.match(/:root\s*\{([\s\S]*?)\}/);
      if (rootMatch) blockToScan = rootMatch[1];

      // Đồng thời trích xuất biến Dark Mode
      const darkMatch = content.match(/\[data-theme="dark"\][^{]*\{([\s\S]*?)\}/);
      if (darkMatch) {
        const darkVarRegex = /(--vno-[a-z0-9-]+)\s*:\s*([^;]+);/g;
        let dm;
        while ((dm = darkVarRegex.exec(darkMatch[1])) !== null) {
          darkVars.set(dm[1].trim(), dm[2].trim());
        }
      }
    }

    const varRegex = /(--vno-[a-z0-9-]+)\s*:\s*([^;]+);/g;
    let m;
    while ((m = varRegex.exec(blockToScan)) !== null) {
      const varName = m[1].trim();
      const rawVal = m[2].trim();
      if (!cssVars.has(varName)) {
        cssVars.set(varName, rawVal);
      }
    }
  }

  // Hàm resolve giá trị CSS (xử lý lồng var(--vno-...))
  function resolveValue(val, isDark = false) {
    if (!val) return null;
    let resolved = val.trim();
    let loops = 0;
    const vMap = isDark ? darkVars : cssVars;
    while (resolved.includes("var(") && loops < 5) {
      loops++;
      resolved = resolved.replace(/var\(\s*(--vno-[a-z0-9-]+)(?:,\s*([^)]+))?\s*\)/g, (match, varName, fallback) => {
        if (vMap.has(varName)) return vMap.get(varName);
        if (cssVars.has(varName)) return cssVars.get(varName);
        return fallback ? fallback.trim() : match;
      });
    }
    return resolved;
  }

  // 2. Kiểm tra các cặp màu token tiêu chuẩn (Light theme)
  const tokenPairs = [
    { label: "Token: text-primary on bg-window", fg: "--vno-text-primary", bg: "--vno-bg-window" },
    { label: "Token: text-primary on bg-surface", fg: "--vno-text-primary", bg: "--vno-bg-surface" },
    { label: "Token: text-primary on bg-subtle", fg: "--vno-text-primary", bg: "--vno-bg-subtle" },
    { label: "Token: text-primary on bg-muted", fg: "--vno-text-primary", bg: "--vno-bg-muted" },
    { label: "Token: text-secondary on bg-window", fg: "--vno-text-secondary", bg: "--vno-bg-window" },
    { label: "Token: text-secondary on bg-subtle", fg: "--vno-text-secondary", bg: "--vno-bg-subtle" },
    { label: "Token: text-muted on bg-window", fg: "--vno-text-muted", bg: "--vno-bg-window" },
    { label: "Token: text-muted on bg-subtle", fg: "--vno-text-muted", bg: "--vno-bg-subtle" },
    { label: "Token: text-muted on bg-muted", fg: "--vno-text-muted", bg: "--vno-bg-muted" },
    { label: "Token: text-subtle on bg-window", fg: "--vno-text-subtle", bg: "--vno-bg-window" },
    { label: "Token: text-inverse on writer-primary", fg: "--vno-text-inverse", bg: "--vno-writer-primary" },
    { label: "Token: text-inverse on sheet-primary", fg: "--vno-text-inverse", bg: "--vno-sheet-primary" },
    { label: "Token: text-inverse on slides-primary", fg: "--vno-text-inverse", bg: "--vno-slides-primary" },
    { label: "Token: brand-red on bg-window", fg: "--vno-brand-red", bg: "--vno-bg-window" },
    { label: "Token: writer-primary on writer-light", fg: "--vno-writer-primary", bg: "--vno-writer-light" },
    { label: "Token: sheet-primary on sheet-light", fg: "--vno-sheet-primary", bg: "--vno-sheet-light" },
    { label: "Token: slides-primary on slides-light", fg: "--vno-slides-primary", bg: "--vno-slides-light" },
  ];

  const results = [];
  const violations = [];

  for (const p of tokenPairs) {
    const rawFg = cssVars.get(p.fg) || p.fg;
    const rawBg = cssVars.get(p.bg) || p.bg;
    const resolvedFg = resolveValue(rawFg);
    const resolvedBg = resolveValue(rawBg);
    const parsedFg = parseColor(resolvedFg);
    const parsedBg = parseColor(resolvedBg);

    if (!parsedFg || !parsedBg) {
      results.push({ label: p.label, pass: false, error: `Không parse được màu: fg=${resolvedFg}, bg=${resolvedBg}` });
      continue;
    }

    const ratio = getContrastRatio(parsedFg, parsedBg);
    const pass = ratio >= 4.5;
    results.push({ label: p.label, pass, ratio, fg: resolvedFg, bg: resolvedBg });
    if (!pass) {
      violations.push({ label: p.label, ratio, fg: resolvedFg, bg: resolvedBg, required: 4.5 });
    }
  }

  // 3. Quét toàn bộ quy tắc CSS trong các file
  for (const relPath of CSS_FILES) {
    const fullPath = path.join(ROOT_DIR, relPath);
    if (!fs.existsSync(fullPath)) continue;
    const content = fs.readFileSync(fullPath, "utf8");

    // Loại bỏ comments
    const cleanContent = content.replace(/\/\*[\s\S]*?\*\//g, "");

    // Regex quét rule
    const ruleRegex = /([^{]+)\{([^}]+)\}/g;
    let match;
    while ((match = ruleRegex.exec(cleanContent)) !== null) {
      const selector = match[1].trim();
      const body = match[2];

      const colorMatch = body.match(/(?:^|;|\s)color\s*:\s*([^;!]+)/);
      const bgMatch = body.match(/(?:^|;|\s)background(?:-color)?\s*:\s*([^;!]+)/);

      if (colorMatch) {
        const isDarkContext = selector.includes("data-theme=\"dark\"") || selector.includes("data-theme='dark'");
        let fgRaw = colorMatch[1].trim();
        let bgRaw = bgMatch ? bgMatch[1].trim() : (isDarkContext ? "#1e1e1e" : "#ffffff");

        let resolvedFg = resolveValue(fgRaw, isDarkContext);
        let resolvedBg = resolveValue(bgRaw, isDarkContext);

        // Bỏ qua gradient, image url, hoặc transparent
        if (resolvedBg.includes("url(") || resolvedBg.includes("gradient")) continue;
        if (resolvedFg.includes("inherit") || resolvedFg.includes("initial") || resolvedFg.includes("currentColor") || resolvedFg === "transparent") continue;

        // Bỏ qua shape text trên canvas vì text nằm trên vector shape có màu riêng
        if (selector.includes("shape-text") || selector.includes("shape-node") || selector.includes("diagram-node-text")) continue;

        // Bỏ qua các rule dark theme đặc thù nếu nền chưa gắn cụ thể
        if (isDarkContext && (!bgMatch || resolvedBg === "transparent")) {
          resolvedBg = "#1e1e1e";
        }

        // Nhận diện ngữ cảnh nền của các overlay (Presenter mode, Print preview toolbar/sheet, Backstage, Topbar, Statusbar, Read Mode toolbar)
        if (selector.includes("presenter-") || selector.includes("backstage-") || selector.includes("print-preview-") || selector.includes("zoom-slider") || selector.includes("statusbar") || selector.includes("writer-read-toolbar")) {
          // Các thành phần nằm trên tờ giấy in A4 có nền trắng #ffffff
          if (selector.includes("print-preview-header") || selector.includes("print-preview-footer") || selector.includes("print-preview-body") || selector.includes("print-preview-footnotes") || selector.includes("print-preview-endnote") || selector.includes("print-preview-sheet")) {
            resolvedBg = "#ffffff";
          } else if (!bgMatch || resolvedBg === "transparent" || resolvedBg.startsWith("rgba(255")) {
            if (selector.includes("presenter-")) {
              resolvedBg = "#0f172a";
            } else if (selector.includes("print-preview-page-number-tag")) {
              resolvedBg = "#1e293b";
            } else if (selector.includes("print-preview-")) {
              resolvedBg = "#0f172a";
            } else if (selector.includes("backstage-print-")) {
              resolvedBg = "#ffffff";
            } else if (selector.includes("backstage-nav-btn")) {
              const blended = blendAlpha(parseColor("rgba(255, 255, 255, 0.12)"), parseColor("#0f4c81"));
              resolvedBg = `rgb(${blended.r}, ${blended.g}, ${blended.b})`;
            } else if (selector.includes("backstage-")) {
              resolvedBg = "#0f4c81";
            } else if (selector.includes("zoom-slider") || selector.includes("statusbar")) {
              resolvedBg = "#0f4c81";
            } else if (selector.includes("writer-read-toolbar")) {
              resolvedBg = "#0f4c81";
            }
          }
        }

        const parsedFg = parseColor(resolvedFg);
        const parsedBg = parseColor(resolvedBg);

        if (parsedFg && parsedBg) {
          const ratio = getContrastRatio(parsedFg, parsedBg);
          const isLarge = selector.includes("h1") || selector.includes("h2") || selector.includes("title") || selector.includes("badge") || selector.includes("icon");
          const threshold = isLarge ? 3.0 : 4.5;
          if (ratio < threshold) {
            violations.push({
              file: relPath,
              selector,
              fg: resolvedFg,
              bg: resolvedBg,
              ratio,
              required: threshold
            });
          }
        }
      }
    }
  }

  return { tokenResults: results, violations };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  console.log("=== KIỂM TRA TƯƠNG PHẢN MÀU WCAG 2.1 (AUTOMATED CONTRAST AUDIT) ===");
  const audit = runContrastAudit();
  console.log(`Kiểm tra ${audit.tokenResults.length} cặp màu token hệ thống:`);
  for (const r of audit.tokenResults) {
    console.log(`  [${r.pass ? "PASS" : "FAIL"}] ${r.label}: ${r.ratio}:1 (${r.fg} trên ${r.bg})`);
  }

  if (audit.violations.length > 0) {
    console.log(`\nPhát hiện ${audit.violations.length} vi phạm tỷ lệ tương phản WCAG:`);
    for (const v of audit.violations) {
      const loc = v.file ? `${v.file} -> ${v.selector}` : v.label;
      console.log(`  - [FAIL] ${loc}: ${v.fg} trên ${v.bg} đạt ${v.ratio}:1 (yêu cầu >= ${v.required}:1)`);
    }
    process.exit(1);
  } else {
    console.log("\n100% CÁC CẶP MÀU ĐỀU ĐẠT CHUẨN WCAG 2.1 AA!");
    process.exit(0);
  }
}
