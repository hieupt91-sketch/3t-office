import assert from "node:assert/strict";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { saveInPlaceCheckingExternalChange } from "../../adapters/libreoffice/common/save-conflict.js";
import { showExternalChangeDialog } from "../../platform/ui-kit/dialogs.js";
import { setLocale, getLocale, t } from "../../platform/i18n/i18n.js";
import { getHelpEntryById } from "../../platform/help/help-catalog.js";

const CONFLICT = { status: "external_change", path: "C:\\docs\\Báo cáo.docx", fingerprint: "11:22", message: "x" };

async function run(sequence, choices, saveCopyResult = true) {
  const calls = { saves: 0, acknowledged: [], asked: [], copies: 0 };
  const original = {
    save: globalUnoBridge.saveRealFileInPlace,
    acknowledge: globalUnoBridge.acknowledgeExternalChange,
  };
  globalUnoBridge.saveRealFileInPlace = async () => sequence[calls.saves++];
  globalUnoBridge.acknowledgeExternalChange = async (path, fingerprint) => {
    calls.acknowledged.push([path, fingerprint]);
    return { status: "ok" };
  };
  try {
    const result = await saveInPlaceCheckingExternalChange(
      "writer", "<p>x</p>", CONFLICT.path, CONFLICT.path,
      async () => { calls.copies++; return saveCopyResult; },
      async ({ fileName }) => { calls.asked.push(fileName); return choices.shift(); },
    );
    return { result, calls };
  } finally {
    globalUnoBridge.saveRealFileInPlace = original.save;
    globalUnoBridge.acknowledgeExternalChange = original.acknowledge;
  }
}

export async function runSaveExternalChangeTests() {
  const results = [];
  try {
    await checkAll();
    results.push({ name: "save-conflict: hỏi người dùng, không ghi đè âm thầm; i18n VI/EN đủ khóa", pass: true });
  } catch (error) {
    results.push({ name: "save-conflict: hỏi người dùng, không ghi đè âm thầm; i18n VI/EN đủ khóa", pass: false, error: error.message });
  }
  return results;
}

async function checkAll() {
  const plain = await run([{ status: "ok", path: "a" }], []);
  assert.equal(plain.result.status, "ok");
  assert.equal(plain.calls.asked.length, 0, "no prompt when the file did not change");

  const failed = await run([{ status: "error", message: "khoá" }], []);
  assert.equal(failed.result.status, "error", "other errors pass through unchanged");

  const cancelled = await run([CONFLICT], ["cancel"]);
  assert.equal(cancelled.result.status, "cancelled");
  assert.deepEqual(cancelled.calls.asked, ["Báo cáo.docx"]);
  assert.equal(cancelled.calls.saves, 1, "cancel never writes");
  assert.equal(cancelled.calls.acknowledged.length, 0);

  const overwritten = await run([CONFLICT, { status: "ok", path: "a" }], ["overwrite"]);
  assert.equal(overwritten.result.status, "ok");
  assert.deepEqual(overwritten.calls.acknowledged, [[CONFLICT.path, "11:22"]]);
  assert.equal(overwritten.calls.saves, 2);

  const changedAgain = await run([CONFLICT, { ...CONFLICT, fingerprint: "33:44" }, { status: "ok" }], ["overwrite", "overwrite"]);
  assert.equal(changedAgain.calls.asked.length, 2, "a newer external change asks again");
  assert.deepEqual(changedAgain.calls.acknowledged.at(-1), [CONFLICT.path, "33:44"]);

  const copied = await run([CONFLICT], ["copy"], true);
  assert.equal(copied.result.status, "saved_copy");
  assert.equal(copied.calls.copies, 1);
  assert.equal(copied.calls.saves, 1, "save a copy never writes to the changed file");

  const copyCancelled = await run([CONFLICT], ["copy"], false);
  assert.equal(copyCancelled.result.status, "cancelled");

  // Ctrl+S while the dialog is open does not start another save or stack a second dialog.
  let release;
  const originalSave = globalUnoBridge.saveRealFileInPlace;
  let saves = 0;
  globalUnoBridge.saveRealFileInPlace = async () => { saves += 1; return CONFLICT; };
  try {
    const first = saveInPlaceCheckingExternalChange("writer", "x", "a", "a", async () => true, () => new Promise((resolve) => { release = resolve; }));
    while (!release) await new Promise((resolve) => setTimeout(resolve, 1));
    const second = await saveInPlaceCheckingExternalChange("writer", "x", "a", "a", async () => true, async () => assert.fail("stacked dialog"));
    assert.equal(second.status, "cancelled");
    assert.equal(saves, 1, "the second Ctrl+S does not write");
    release("cancel");
    assert.equal((await first).status, "cancelled");
  } finally {
    globalUnoBridge.saveRealFileInPlace = originalSave;
  }

  // No DOM (headless): the safe answer is cancel, never overwrite.
  assert.equal(await showExternalChangeDialog({ fileName: "a.docx" }), "cancel");

  for (const app of ["writer", "sheet", "slides"]) {
    const conflict = getHelpEntryById(`${app}.file.externalChange`);
    const backup = getHelpEntryById(`${app}.file.saveBackup`);
    assert.ok(conflict && backup, `${app}: help entries are registered`);
    assert.equal(conflict.app, app);
    const text = conflict.steps.join(" ");
    for (const label of ["Lưu bản sao", "Ghi đè", "Hủy", "Esc"]) assert.ok(text.includes(label), `${app}: help names ${label}`);
    assert.ok(backup.steps.join(" ").includes("save-backups"), `${app}: help gives the backup folder`);
  }

  const previous = getLocale();
  try {
    for (const locale of ["vi", "en"]) {
      setLocale(locale);
      for (const key of ["title", "message", "saveCopy", "overwrite", "cancel"]) {
        assert.notEqual(t(`saveConflict.${key}`), `saveConflict.${key}`, `${locale}: ${key}`);
      }
      assert.ok(t("saveConflict.message", { fileName: "Z.docx" }).includes("Z.docx"));
    }
  } finally {
    setLocale(previous);
  }
}
