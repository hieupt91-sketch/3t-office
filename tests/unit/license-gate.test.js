/**
 * Test Suite: G1 — Cổng giấy phép dependency (lớp riêng, INBOX-MAC #18)
 * Phiếu: docs/sync/DIRECTIVE-MUSE-LOP-RIENG-0511.md, mục G1.
 * Cổng: scripts/audit-licenses/check-licenses.mjs + components.json.
 * Chạy qua `npm test` (suite 276). Mọi kết quả PASS/FAIL đều từ chạy thật.
 */

import { auditLicenses, runLicenseCheck } from "../../scripts/audit-licenses/check-licenses.mjs";

export async function runLicenseGateTests() {
  const results = [];

  // 1. Cổng chạy thật trên manifest hiện tại của repo.
  for (const item of runLicenseCheck()) {
    results.push(item);
  }

  // 2. Fixture âm bản: gói GPL giả phải bị cổng chặn.
  const gplFixture = {
    components: [
      { name: "gpl-gia", version: "1.0", license: "GPL-3.0", kind: "python-package", source: "fixture", via: "fixture" },
    ],
  };
  const gpl = auditLicenses({ manifest: gplFixture, requirementsText: "", packageJson: {} });
  results.push({
    name: "G1: fixture gói GPL-3.0 giả bị cổng chặn (FAIL)",
    pass: gpl.pass === false && gpl.failures.some((f) => f.includes("gpl-gia") && f.includes("GPL-3.0")),
    error: gpl.pass ? "Cổng đã PASS một gói GPL — cổng vô nghĩa." : undefined,
  });

  // 3. Fixture âm bản: thành phần thiếu giấy phép phải bị chặn.
  const noLicenseFixture = {
    components: [
      { name: "khong-giay-phep", version: "1.0", kind: "python-package", source: "fixture", via: "fixture" },
    ],
  };
  const noLicense = auditLicenses({ manifest: noLicenseFixture, requirementsText: "", packageJson: {} });
  results.push({
    name: "G1: fixture thiếu giấy phép bị cổng chặn (FAIL)",
    pass: noLicense.pass === false,
    error: noLicense.pass ? "Cổng đã PASS một thành phần không có giấy phép." : undefined,
  });

  // 4. Fixture âm bản: ngoại lệ thiếu người duyệt phải bị chặn.
  const noApproverFixture = {
    components: [
      {
        name: "ngoai-le-thieu-duyet", version: "1.0", license: "GPL-3.0", kind: "python-package",
        source: "fixture", via: "fixture", exception: { reason: "chỉ có lý do, chưa có người duyệt" },
      },
    ],
  };
  const noApprover = auditLicenses({ manifest: noApproverFixture, requirementsText: "", packageJson: {} });
  results.push({
    name: "G1: fixture ngoại lệ thiếu người duyệt bị cổng chặn (FAIL)",
    pass: noApprover.pass === false,
    error: noApprover.pass ? "Cổng đã PASS một ngoại lệ chưa có người duyệt." : undefined,
  });

  // 5. Fixture dương bản: ngoại lệ đủ lý do + người duyệt được liệt kê, cổng PASS.
  const exceptionOkFixture = {
    components: [
      {
        name: "ngoai-le-du", version: "1.0", license: "GPL-3.0", kind: "python-package",
        source: "fixture", via: "fixture",
        exception: { reason: "fixture kiểm tra", approved_by: "Lead (fixture)" },
      },
    ],
  };
  const exceptionOk = auditLicenses({ manifest: exceptionOkFixture, requirementsText: "", packageJson: {} });
  const exceptionOkPass = exceptionOk.pass === true && exceptionOk.exceptions.length === 1
    && exceptionOk.exceptions[0].approvedBy === "Lead (fixture)";
  results.push({
    name: "G1: fixture ngoại lệ đủ lý do + người duyệt được liệt kê (PASS có ghi nhận)",
    pass: exceptionOkPass,
    error: exceptionOkPass ? undefined : (exceptionOk.failures.join(" | ") || "Ngoại lệ hợp lệ không được liệt kê."),
  });

  // 6. Fixture âm bản: gói trong requirements.txt chưa khai báo trong manifest bị chặn.
  const reqMismatchFixture = {
    components: [
      { name: "cryptography", version: "50.0.2", license: "Apache-2.0", kind: "python-package", source: "fixture", via: "requirements.txt" },
    ],
  };
  const reqMismatch = auditLicenses({
    manifest: reqMismatchFixture,
    requirementsText: "cryptography>=44.0.0,<51.0.0\npypdf>=6.21,<7\n",
    packageJson: {},
  });
  results.push({
    name: "G1: fixture requirements.txt có gói chưa khai báo bị cổng chặn (FAIL)",
    pass: reqMismatch.pass === false && reqMismatch.failures.some((f) => f.includes("pypdf")),
    error: reqMismatch.pass ? "Cổng đã PASS khi requirements.txt có gói chưa khai báo." : undefined,
  });

  // 7. Fixture âm bản: dependency npm chưa khai báo bị chặn.
  const npmFixture = {
    components: [
      { name: "cryptography", version: "50.0.2", license: "Apache-2.0", kind: "python-package", source: "fixture", via: "requirements.txt" },
    ],
  };
  const npmMismatch = auditLicenses({
    manifest: npmFixture,
    requirementsText: "",
    packageJson: { dependencies: { "some-npm-pkg": "^1.0.0" } },
  });
  results.push({
    name: "G1: fixture dependency npm chưa khai báo bị cổng chặn (FAIL)",
    pass: npmMismatch.pass === false && npmMismatch.failures.some((f) => f.includes("some-npm-pkg")),
    error: npmMismatch.pass ? "Cổng đã PASS khi package.json có dependency npm chưa khai báo." : undefined,
  });

  // 8. Fixture âm bản: VNO_KEEP_LO_DICTS=1 phải bị cổng chặn (INBOX-MAC #22).
  const keepDicts = auditLicenses({ manifest: exceptionOkFixture, requirementsText: "", packageJson: {}, keepLoDicts: true });
  results.push({
    name: "G1: fixture VNO_KEEP_LO_DICTS=1 bị cổng chặn (FAIL)",
    pass: keepDicts.pass === false && keepDicts.failures.some((f) => f.includes("VNO_KEEP_LO_DICTS")),
    error: keepDicts.pass ? "Cổng đã PASS khi VNO_KEEP_LO_DICTS=1 — các dict GPL có thể lọt vào bản phát hành." : undefined,
  });

  return results;
}
