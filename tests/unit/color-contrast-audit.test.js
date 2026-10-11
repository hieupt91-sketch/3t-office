/**
 * Test Suite: WCAG 2.1 Automated Color Contrast Audit
 * Kiểm tra toán học công thức độ chói tương đối, tỷ lệ tương phản,
 * và quét tự động toàn bộ Design Tokens & Stylesheet CSS của VN Office Suite.
 */

import {
  parseColor,
  blendAlpha,
  getRelativeLuminance,
  getContrastRatio,
  meetsWcagAA,
  meetsWcagAAA
} from "../../platform/ui-kit/contrast-checker.js";
import { runContrastAudit } from "../../scripts/audit-contrast.js";

function assert(condition, message) {
  if (!condition) throw new Error(message || "Assertion failed");
}

export async function runColorContrastAuditTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  // 1. Kiểm tra tính đúng đắn toán học của W3C WCAG 2.1 Relative Luminance
  test("WCAG Luminance: Độ chói chuẩn của Pure White = 1.0 và Pure Black = 0.0", () => {
    const lumWhite = getRelativeLuminance(255, 255, 255);
    const lumBlack = getRelativeLuminance(0, 0, 0);
    assert(Math.abs(lumWhite - 1.0) < 0.0001, `Độ chói trắng phải là 1.0, nhận: ${lumWhite}`);
    assert(Math.abs(lumBlack - 0.0) < 0.0001, `Độ chói đen phải là 0.0, nhận: ${lumBlack}`);
  });

  test("WCAG Contrast Ratio: Tỷ lệ trắng/đen đạt chuẩn tối đa 21:1 và cùng màu đạt 1:1", () => {
    const maxRatio = getContrastRatio("#ffffff", "#000000");
    const minRatio = getContrastRatio("#ffffff", "#ffffff");
    assert(Math.abs(maxRatio - 21.0) < 0.01, `Tỷ lệ trắng/đen phải là 21:1, nhận: ${maxRatio}`);
    assert(Math.abs(minRatio - 1.0) < 0.01, `Tỷ lệ cùng màu phải là 1:1, nhận: ${minRatio}`);
  });

  test("WCAG Thresholds: Phân biệt chính xác chuẩn AA (4.5:1 / 3.0:1) và AAA (7.0:1 / 4.5:1)", () => {
    // #475569 trên #ffffff đạt ~7.58:1 -> đạt cả AA và AAA
    assert(meetsWcagAA("#475569", "#ffffff", false), "#475569 trên trắng phải đạt AA");
    assert(meetsWcagAAA("#475569", "#ffffff", false), "#475569 trên trắng phải đạt AAA");

    // #64748b trên #ffffff đạt ~4.76:1 -> đạt AA (>= 4.5), không đạt AAA (< 7.0)
    assert(meetsWcagAA("#64748b", "#ffffff", false), "#64748b trên trắng phải đạt AA");
    assert(!meetsWcagAAA("#64748b", "#ffffff", false), "#64748b trên trắng không thể đạt AAA");

    // #94a3b8 trên #ffffff đạt ~2.56:1 -> không đạt AA chữ thường
    assert(!meetsWcagAA("#94a3b8", "#ffffff", false), "#94a3b8 trên trắng không đạt AA");
  });

  test("Alpha Compositing: Hòa trộn kênh trong suốt chính xác trên nền sáng và tối", () => {
    const blended = blendAlpha(parseColor("rgba(0, 0, 0, 0.5)"), parseColor("#ffffff"));
    assert(blended.r === 128 && blended.g === 128 && blended.b === 128, "Hòa trộn 50% đen trên trắng phải là xám 128");

    const ratio = getContrastRatio("rgba(0, 0, 0, 0.7)", "#ffffff");
    assert(ratio >= 4.5, `rgba(0,0,0,0.7) trên trắng phải đạt >= 4.5:1, nhận: ${ratio}`);
  });

  // 2. Kiểm tra toàn bộ Design Tokens trong tokens.css
  test("Tokens Audit: 100% cặp màu token cốt lõi của VN Office Suite đạt chuẩn WCAG AA", () => {
    const audit = runContrastAudit();
    const failedTokens = audit.tokenResults.filter(t => !t.pass);
    if (failedTokens.length > 0) {
      throw new Error(`Phát hiện ${failedTokens.length} token vi phạm WCAG AA: ${failedTokens.map(f => f.label).join(", ")}`);
    }
  });

  test("Tokens Audit: Màu thương hiệu 3 app (Writer #0f4c81, Sheet #0f6d38, Slides #b53818) đều đạt chuẩn WCAG AA", () => {
    assert(meetsWcagAA("#ffffff", "#0f4c81"), "Writer primary (#0f4c81) trên trắng phải đạt WCAG AA");
    assert(meetsWcagAA("#ffffff", "#0f6d38"), "Sheet primary (#0f6d38) trên trắng phải đạt WCAG AA");
    assert(meetsWcagAA("#ffffff", "#b53818"), "Slides primary (#b53818) trên trắng phải đạt WCAG AA");
  });

  // 3. Quét toàn diện Stylesheet CSS của toàn bộ ứng dụng
  test("Automated CSS Audit: 0 vi phạm tỷ lệ tương phản màu WCAG AA trên toàn bộ hệ thống CSS", () => {
    const audit = runContrastAudit();
    if (audit.violations.length > 0) {
      const details = audit.violations.map(v => `${v.file} [${v.selector}]: ${v.fg} trên ${v.bg} (${v.ratio}:1 < ${v.required}:1)`).join("; ");
      throw new Error(`Phát hiện ${audit.violations.length} vi phạm tỷ lệ tương phản trong CSS: ${details}`);
    }
  });

  return results;
}
