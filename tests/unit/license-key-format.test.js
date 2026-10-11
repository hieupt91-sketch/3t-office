/** Định dạng ô nhập mã kích hoạt (song sinh với adapters/license/keys.py: format_while_typing). */

import { formatLicenseKeyInput, isLicenseKeyComplete } from "../../platform/license/license-key-format.js";

function assertEq(actual, expected, message) {
  if (actual !== expected) throw new Error(`${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

export async function runLicenseKeyFormatTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  // The same cases are asserted in tests/test_license_client.py (test_format_while_typing).
  test("empty input shows the prefix", () => {
    assertEq(formatLicenseKeyInput(""), "3TO-", "empty");
    assertEq(formatLicenseKeyInput(null), "3TO-", "null");
  });
  test("groups of five are separated as the user types", () => {
    assertEq(formatLicenseKeyInput("3to12345678"), "3TO-12345-678", "partial");
    assertEq(formatLicenseKeyInput("12345 67890 abcde fghjk zz"), "3TO-12345-67890-ABCDE-FGHJK", "pasted with spaces, capped at 20");
  });
  test("pasting a full canonical key is stable (idempotent)", () => {
    const key = "3TO-01234-56789-ABCDE-FGHJK";
    assertEq(formatLicenseKeyInput(key), "3TO-01234-56789-ABCDE-FGHJK", "canonical");
    assertEq(formatLicenseKeyInput(formatLicenseKeyInput(key)), "3TO-01234-56789-ABCDE-FGHJK", "idempotent");
  });
  test("pasting a whole key onto the pre-filled prefix does not double the prefix", () => {
    assertEq(formatLicenseKeyInput("3TO-3TO-ABCDE-FGHJK-MNPQR-STVW1"), "3TO-ABCDE-FGHJK-MNPQR-STVW1", "double prefix");
    assertEq(formatLicenseKeyInput("3TO-3TO12"), "3TO-3TO12", "short text keeps what the user typed");
  });
  test("symbols and dashes are dropped", () => {
    assertEq(formatLicenseKeyInput("3TO--12-34!!5"), "3TO-12345", "noise");
  });
  test("completeness needs exactly 20 characters after the prefix", () => {
    assertEq(isLicenseKeyComplete("3TO-01234-56789-ABCDE-FGHJK"), true, "complete");
    assertEq(isLicenseKeyComplete("3TO-01234-56789-ABCDE-FGHJ"), false, "19 characters");
    assertEq(isLicenseKeyComplete("3TO-"), false, "prefix only");
  });
  return results;
}
