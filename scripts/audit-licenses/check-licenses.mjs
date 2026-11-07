/**
 * VN Office — Cổng giấy phép dependency (G1, DIRECTIVE-MUSE-LOP-RIENG-0511.md)
 *
 * Kiểm tra mọi thành phần đóng gói/phân phối cùng sản phẩm có giấy phép nằm
 * trong allowlist, hoặc có ngoại lệ đã khai báo (lý do + người duyệt).
 * Nguồn dữ liệu: scripts/audit-licenses/components.json (manifest) +
 * requirements.txt (gói Python yêu cầu trực tiếp) + package.json (phải không
 * có dependency npm — repo hiện tại không dùng dependency npm nào).
 *
 * Cách chạy: node scripts/audit-licenses/check-licenses.mjs
 * Thoát 0 = PASS (kể cả khi có ngoại lệ đã khai báo — chúng được in ra đầy đủ,
 * không che); thoát 1 = FAIL, kèm danh sách thành phần vi phạm.
 * CẤM bọc lệnh này bằng `|| echo warning` hay bất cứ cách nào làm cổng vô nghĩa.
 * INBOX-MAC #22: cổng FAIL khi VNO_KEEP_LO_DICTS=1 (bản phát hành không được
 * giữ các extension dict-* của LibreOffice, một số theo GPL).
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..", "..");

/** Allowlist SPDX theo phiếu G1 (DIRECTIVE-MUSE-LOP-RIENG-0511.md, mục G1). */
export const LICENSE_ALLOWLIST = new Set([
  "MIT",
  "BSD-2-Clause",
  "BSD-3-Clause",
  "ISC",
  "Apache-2.0",
  "MPL-2.0",
  "PSF-2.0",
  "Unicode-3.0",
  "Zlib",
  "OFL-1.1",
  "CC0-1.0",
]);

export const MANIFEST_PATH = path.join(__dirname, "components.json");
export const REQUIREMENTS_PATH = path.join(ROOT_DIR, "requirements.txt");
export const PACKAGE_JSON_PATH = path.join(ROOT_DIR, "package.json");

const OPERATORS = new Set(["OR", "AND", "WITH"]);

/**
 * Tách chuỗi giấy phép (SPDX expression, ví dụ "Apache-2.0 OR BSD-3-Clause")
 * thành danh sách SPDX id. Token không phải toán tử và không phải dấu ngoặc
 * được coi là một id (kể cả id không chuẩn SPDX như "Microsoft-WebView2-Terms"
 * — cổng sẽ đánh FAIL/ngoại lệ chứ không bỏ qua lặng lẽ).
 */
export function extractLicenseIds(license) {
  if (typeof license !== "string") return [];
  return license
    .split(/[\s()]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0 && !OPERATORS.has(t.toUpperCase()));
}

export function normalizePackageName(name) {
  return String(name).trim().toLowerCase().replace(/[-_.]+/g, "-");
}

/** Đọc requirements.txt, trả về danh sách tên gói (bỏ comment, version, marker). */
export function parseRequirements(text) {
  const names = [];
  for (const rawLine of String(text ?? "").split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const m = line.match(/^([A-Za-z0-9_.-]+)/);
    if (m) names.push(m[1]);
  }
  return names;
}

/**
 * Kiểm tra thuần (không đọc file): nhận manifest đã parse, nội dung
 * requirements.txt và package.json đã parse. Dùng cho test với fixture.
 * @returns {{pass: boolean, components: Array, failures: string[], exceptions: Array}}
 */
export function auditLicenses({ manifest, requirementsText = "", packageJson = {}, keepLoDicts = false }) {
  const failures = [];
  const exceptions = [];
  const checked = [];
  const components = Array.isArray(manifest?.components) ? manifest.components : [];

  // INBOX-MAC #22: VNO_KEEP_LO_DICTS=1 giữ các extension dict-* của LibreOffice
  // (một số theo GPL) trong bản phát hành — bị cấm, cổng phải FAIL.
  if (keepLoDicts) {
    failures.push("VNO_KEEP_LO_DICTS=1: ban phat hanh khong duoc giu cac extension dict-* cua LibreOffice (mot so theo GPL); tat bien nay truoc khi dong goi (INBOX-MAC #22).");
  }

  if (!Array.isArray(manifest?.components)) {
    failures.push("Manifest không có trường 'components' là mảng.");
  }

  const seenNames = new Set();
  for (const c of components) {
    const label = `${c?.name ?? "(không tên)"} ${c?.version ?? ""}`.trim();
    if (!c?.name || typeof c.name !== "string") {
      failures.push("Có thành phần thiếu trường 'name'.");
      continue;
    }
    const key = normalizePackageName(c.name);
    if (seenNames.has(key)) {
      failures.push(`Trùng tên thành phần trong manifest: ${c.name}.`);
    }
    seenNames.add(key);
    if (!c.version || typeof c.version !== "string") {
      failures.push(`${c.name}: thiếu trường 'version'.`);
    }
    if (!c.source || typeof c.source !== "string") {
      failures.push(`${c.name}: thiếu trường 'source' (nguồn giấy phép / nguồn tải).`);
    }
    if (c.kind === "python-package" && (!c.via || typeof c.via !== "string")) {
      failures.push(`${c.name}: gói Python thiếu trường 'via' (cài đặt bằng cách nào).`);
    }
    const ids = extractLicenseIds(c.license);
    if (ids.length === 0) {
      failures.push(`${c.name}: thiếu giấy phép (trường 'license' trống hoặc không đọc được).`);
      checked.push({ name: c.name, version: c.version, license: c.license ?? "", verdict: "FAIL" });
      continue;
    }
    const unknown = ids.filter((id) => !LICENSE_ALLOWLIST.has(id));
    if (unknown.length === 0) {
      checked.push({ name: c.name, version: c.version, license: c.license, verdict: "OK" });
    } else if (c.exception && typeof c.exception.reason === "string" && c.exception.reason.trim()
      && typeof c.exception.approved_by === "string" && c.exception.approved_by.trim()) {
      exceptions.push({
        name: c.name,
        version: c.version,
        license: c.license,
        unknownLicenses: unknown,
        reason: c.exception.reason,
        approvedBy: c.exception.approved_by,
      });
      checked.push({ name: c.name, version: c.version, license: c.license, verdict: "NGOẠI LỆ" });
    } else {
      failures.push(
        `${c.name}: giấy phép ${unknown.join(", ")} không nằm trong allowlist và không có ngoại lệ đầy đủ (cần cả 'reason' và 'approved_by').`,
      );
      checked.push({ name: c.name, version: c.version, license: c.license, verdict: "FAIL" });
    }
    // Giấy phép của thư viện con đi kèm (ví dụ LibreOffice): cũng phải nằm trong
    // allowlist, hoặc được ngoại lệ của chính thành phần đó bao phủ.
    const sub = Array.isArray(c.bundled_sublicenses) ? c.bundled_sublicenses : [];
    const subUnknown = sub.flatMap((s) => extractLicenseIds(s)).filter((id) => !LICENSE_ALLOWLIST.has(id));
    if (subUnknown.length > 0) {
      const covered = c.exception && typeof c.exception.reason === "string" && c.exception.reason.trim()
        && typeof c.exception.approved_by === "string" && c.exception.approved_by.trim();
      if (covered) {
        exceptions.push({
          name: `${c.name} (thư viện con đi kèm)`,
          version: c.version,
          license: subUnknown.join(", "),
          unknownLicenses: subUnknown,
          reason: c.exception.reason,
          approvedBy: c.exception.approved_by,
        });
      } else {
        failures.push(
          `${c.name}: thư viện con đi kèm có giấy phép ${subUnknown.join(", ")} ngoài allowlist và không có ngoại lệ đầy đủ.`,
        );
      }
    }
  }

  // requirements.txt: mọi gói yêu cầu trực tiếp phải có trong manifest.
  const required = parseRequirements(requirementsText);
  for (const pkg of required) {
    if (!seenNames.has(normalizePackageName(pkg))) {
      failures.push(`requirements.txt có gói '${pkg}' chưa khai báo trong manifest.`);
    }
  }

  // package.json: không được có dependency npm chưa khai báo trong manifest.
  const npmDeps = {
    ...(packageJson.dependencies ?? {}),
    ...(packageJson.devDependencies ?? {}),
  };
  for (const dep of Object.keys(npmDeps)) {
    if (!seenNames.has(normalizePackageName(dep))) {
      failures.push(`package.json có dependency npm '${dep}' chưa khai báo trong manifest.`);
    }
  }

  return { pass: failures.length === 0, components: checked, failures, exceptions };
}

/** Đọc file thật trong repo rồi chạy auditLicenses. Trả về kết quả theo quy ước test của repo. */
export function runLicenseCheck({ rootDir = ROOT_DIR } = {}) {
  const results = [];
  let manifest;
  try {
    manifest = JSON.parse(fs.readFileSync(path.join(rootDir, "scripts", "audit-licenses", "components.json"), "utf8"));
  } catch (err) {
    return [{ name: "G1: đọc được manifest scripts/audit-licenses/components.json", pass: false, error: String(err) }];
  }
  const requirementsText = fs.existsSync(path.join(rootDir, "requirements.txt"))
    ? fs.readFileSync(path.join(rootDir, "requirements.txt"), "utf8")
    : "";
  let packageJson = {};
  try {
    packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  } catch {
    packageJson = {};
  }

  const audit = auditLicenses({ manifest, requirementsText, packageJson, keepLoDicts: process.env.VNO_KEEP_LO_DICTS === "1" });

  results.push({
    name: `G1: manifest hợp lệ (${audit.components.length} thành phần, không trùng tên, đủ name/version/source)`,
    pass: !audit.failures.some((f) => f.includes("thiếu trường") || f.includes("Trùng tên") || f.includes("không có trường")),
    error: audit.failures.filter((f) => f.includes("thiếu trường") || f.includes("Trùng tên") || f.includes("không có trường")).join(" | ") || undefined,
  });
  results.push({
    name: `G1: mọi giấy phép trong allowlist hoặc có ngoại lệ đã khai báo (${audit.exceptions.length} ngoại lệ được liệt kê)`,
    pass: !audit.failures.some((f) => f.includes("giấy phép")),
    error: audit.failures.filter((f) => f.includes("giấy phép")).join(" | ") || undefined,
  });
  results.push({
    name: "G1: requirements.txt khớp manifest (mọi gói yêu cầu đều đã khai báo)",
    pass: !audit.failures.some((f) => f.includes("requirements.txt")),
    error: audit.failures.filter((f) => f.includes("requirements.txt")).join(" | ") || undefined,
  });
  results.push({
    name: "G1: package.json không có dependency npm chưa khai báo",
    pass: !audit.failures.some((f) => f.includes("package.json")),
    error: audit.failures.filter((f) => f.includes("package.json")).join(" | ") || undefined,
  });
  results.push({
    name: "G1: VNO_KEEP_LO_DICTS=1 bị cấm trong bản phát hành (INBOX-MAC #22)",
    pass: !audit.failures.some((f) => f.includes("VNO_KEEP_LO_DICTS")),
    error: audit.failures.filter((f) => f.includes("VNO_KEEP_LO_DICTS")).join(" | ") || undefined,
  });
  if (audit.failures.length > 0) {
    results.push({
      name: "G1: cổng giấy phép PASS (không có vi phạm)",
      pass: false,
      error: audit.failures.join(" | "),
    });
  } else {
    results.push({ name: "G1: cổng giấy phép PASS (không có vi phạm)", pass: true });
  }
  return results;
}

function printReport(audit) {
  console.log("Cổng giấy phép dependency (G1) — scripts/audit-licenses/components.json");
  console.log("=".repeat(76));
  for (const c of audit.components) {
    console.log(`  [${c.verdict}] ${c.name} ${c.version ?? ""} — ${c.license}`);
  }
  if (audit.exceptions.length > 0) {
    console.log("\nNgoại lệ đã khai báo (lý do + người duyệt, KHÔNG che):");
    for (const e of audit.exceptions) {
      console.log(`  - ${e.name}: ${e.license}`);
      console.log(`    Lý do: ${e.reason}`);
      console.log(`    Người duyệt: ${e.approvedBy}`);
    }
  }
  console.log("\n" + "-".repeat(76));
  if (audit.failures.length > 0) {
    console.log(`FAIL: ${audit.failures.length} vi phạm:`);
    for (const f of audit.failures) console.log(`  - ${f}`);
  } else {
    console.log(`PASS: ${audit.components.length} thành phần, ${audit.exceptions.length} ngoại lệ đã khai báo.`);
  }
}

// Chạy trực tiếp: node scripts/audit-licenses/check-licenses.mjs
const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__dirname, "check-licenses.mjs");
if (isMain) {
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  const requirementsText = fs.existsSync(REQUIREMENTS_PATH) ? fs.readFileSync(REQUIREMENTS_PATH, "utf8") : "";
  const packageJson = JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, "utf8"));
  const audit = auditLicenses({ manifest, requirementsText, packageJson, keepLoDicts: process.env.VNO_KEEP_LO_DICTS === "1" });
  printReport(audit);
  process.exit(audit.pass ? 0 : 1);
}
