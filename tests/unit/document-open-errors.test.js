import { getOpenErrorMessage } from "../../adapters/libreoffice/common/document-open-errors.js";
import { getHelpEntriesForApp } from "../../platform/help/help-catalog.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runDocumentOpenErrorsTests() {
  const cases = [
    ["password-protected", "password required", "mật khẩu"],
    ["locked", "sharing violation: file is in use", "bị khóa"],
    ["corrupt", "BadZipFile invalid package", "bị hỏng"]
  ];
  for (const [name, detail, expected] of cases) {
    const message = getOpenErrorMessage(detail, "Sổ làm việc");
    assert(message.includes(expected), `${name} message should identify its cause`);
    assert(message.includes("Sổ làm việc đang mở được giữ nguyên."), `${name} message should confirm prior document retention`);
  }
  for (const app of ["writer", "sheet", "slides"]) {
    const help = getHelpEntriesForApp(app).find(entry => entry.id === `${app}.help.openSaveFiles`);
    assert(help && help.steps.length >= 4, `${app} should have concrete open/save guidance in Help`);
    assert(help.steps.some(step => step.includes("Lưu bản sao")), `${app} guidance should explain Save As`);
  }
  return cases.map(([name]) => ({ name, pass: true }));
}
