// MAC-3-2610: hộp thoại Mở / Lưu thành trên macOS — app desktop thật (Qt, CDP), không AppleScript/phím hệ thống.
// Hộp thoại native không điều khiển được qua CDP: biến test-only VNO_CDP_FILE_DIALOG_STUB khiến main.py trả lời
// create_file_dialog từ hàng đợi JSON (sau khi kiểm chuỗi lọc bằng parse_file_type của pywebview) và ghi lại đối số.
// Mọi xử lý sau hộp thoại (tên mặc định, thư mục, sửa đuôi, NFD→NFC, lưu thật qua LibreOffice, mở lại) là mã thật.
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { launchApp, repoRoot } from "./session.mjs";
import { sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

const profileRoot = await mkdtemp(path.join(os.tmpdir(), "vno-cdp-filedialog-"));
const home = path.join(profileRoot, "home");
const documents = path.join(home, "Documents");
const work = path.join(profileRoot, "Thư mục lưu");
const stubPath = path.join(profileRoot, "dialog-stub.json");
await mkdir(documents, { recursive: true });
await mkdir(work, { recursive: true });

const NAME_NFC = "Báo cáo quý";
const typedNfd = path.join(work, NAME_NFC).normalize("NFD");
const savedNfc = path.join(work, `${NAME_NFC}.docx`).normalize("NFC");

async function queue(...responses) {
  await writeFile(stubPath, JSON.stringify({ responses }), "utf8");
}

async function calls() {
  try {
    const text = await readFile(stubPath + ".calls.jsonl", "utf8");
    return text.split("\n").filter(Boolean).map((line) => JSON.parse(line));
  } catch {
    return [];
  }
}

async function runCommand(cdp, commandId) {
  return cdp.evaluate(`(async () => {
    const { globalCommandBus } = await import('/platform/commands/command-bus.js');
    const result = await globalCommandBus.execute(${JSON.stringify(commandId)});
    return result === undefined ? null : result;
  })()`, { awaitPromise: true, timeoutMilliseconds: 120000 });
}

const dialogOpen = (cdp) => cdp.evaluate("!!document.querySelector('.vno-dialog-overlay')");
const titleText = (cdp) => cdp.evaluate("document.title");

process.env.VNO_CDP_FILE_DIALOG_STUB = stubPath;
await queue();
let session = null;
try {
  session = await launchApp("writer", { profileRoot });
  const { cdp } = session;

  // The QtWebEngine disk cache is shared by every worktree (same localhost port): never trust cached modules.
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Page.reload", { ignoreCache: true });
  await sleep(1500);
  await cdp.waitFor("!!document.querySelector('.vno-writer-body') && !!window.pywebview?.api", { timeoutMilliseconds: 45000 });
  const served = await cdp.evaluate(`(async () => {
    const source = await (await fetch('/platform/recent/recent-manager.js', { cache: 'no-store' })).text();
    const module = await import('/platform/recent/recent-manager.js');
    return { source: source.includes('isSameRecentPath'), module: typeof module.isSameRecentPath === 'function' };
  })()`, { awaitPromise: true });
  check("tệp giao diện phục vụ từ worktree này (không lấy từ bộ đệm chung)", served?.source && served?.module,
    JSON.stringify(served));
  check("phiên dùng đúng mã nguồn worktree", session.root === repoRoot, session.root);

  // 1. Save As cancelled: nothing written, no error dialog.
  await queue(null);
  const titleBefore = await titleText(cdp);
  await runCommand(cdp, "common.file.saveAs");
  await sleep(500);
  let log = await calls();
  const cancelSave = log.at(-1);
  check("Lưu thành: hộp thoại lưu được mở", cancelSave?.type === "save", JSON.stringify(cancelSave));
  check("Lưu thành: tên mặc định có dấu và đuôi (Tài liệu N.docx)",
    /^Tài liệu \d+\.docx$/.test(cancelSave?.save_filename || ""), cancelSave?.save_filename);
  check("Lưu thành: tài liệu mới bắt đầu ở thư mục Tài liệu (~/Documents)", cancelSave?.directory === documents,
    cancelSave?.directory);
  check("Lưu thành: định dạng hiện tại (.docx) đứng đầu bộ lọc",
    cancelSave?.file_types?.[0] === "Tài liệu Word (*.docx)", cancelSave?.file_types?.[0]);
  check("Hủy Lưu thành: không có hộp thoại lỗi", !(await dialogOpen(cdp)));
  check("Hủy Lưu thành: tiêu đề không đổi", (await titleText(cdp)) === titleBefore, await titleText(cdp));

  // 2. Save As with a decomposed (NFD) name typed without extension.
  await cdp.evaluate(`(() => { const body = document.querySelector('.vno-writer-body'); body.focus();
    document.execCommand('insertText', false, 'Xin chào thế giới'); return true; })()`);
  await queue(typedNfd);
  await runCommand(cdp, "common.file.saveAs");
  await cdp.waitFor(`document.title.startsWith(${JSON.stringify(`${NAME_NFC}.docx`)})`, { timeoutMilliseconds: 90000 })
    .catch(() => null);
  const names = await readdir(work);
  check("Lưu thành: tự thêm đuôi .docx cho tên gõ thiếu đuôi", existsSync(savedNfc), names.join(","));
  check("Lưu thành: tên tệp trên đĩa ở dạng dựng sẵn (NFC)",
    names.includes(`${NAME_NFC}.docx`) && !names.some((name) => name !== name.normalize("NFC")), names.join(","));
  const titleAfterSave = await titleText(cdp);
  check("Lưu thành: thanh tiêu đề hiện «Báo cáo quý.docx» dạng NFC",
    titleAfterSave.startsWith(`${NAME_NFC}.docx`) && titleAfterSave === titleAfterSave.normalize("NFC"), titleAfterSave);
  check("Lưu thành: không có hộp thoại lỗi", !(await dialogOpen(cdp)));

  // 3. Open cancelled: no error.
  await queue(null);
  await runCommand(cdp, "common.file.open");
  await sleep(500);
  log = await calls();
  const cancelOpen = log.at(-1);
  check("Mở: «Tất cả tệp được hỗ trợ» đứng đầu bộ lọc",
    String(cancelOpen?.file_types?.[0] || "").startsWith("Tất cả tệp được hỗ trợ (*.docx;*.doc;*.dotx"),
    cancelOpen?.file_types?.[0]);
  check("Mở: cho phép chọn nhiều tệp", cancelOpen?.allow_multiple === true, String(cancelOpen?.allow_multiple));
  check("Hủy Mở: không có hộp thoại lỗi", !(await dialogOpen(cdp)));
  check("Hủy Mở: tài liệu giữ nguyên", (await titleText(cdp)) === titleAfterSave, await titleText(cdp));

  // 4. Open the same file, reported by macOS in decomposed form (NFD).
  await queue([savedNfc.normalize("NFD")]);
  await runCommand(cdp, "common.file.open");
  await sleep(1500);
  await cdp.waitFor("!document.querySelector('.vno-open-progress, .vno-document-loading')", { timeoutMilliseconds: 60000 })
    .catch(() => null);
  const reopened = await cdp.evaluate(`(() => ({
    title: document.title,
    body: document.querySelector('.vno-writer-body')?.innerText || '',
    recent: JSON.parse(localStorage.getItem('vno_recent_documents') || '[]')
      .filter((item) => item.app === 'writer').map((item) => ({ name: item.name, path: item.path }))
  }))()`);
  check("Mở lại: thanh tiêu đề NFC", reopened.title.startsWith(`${NAME_NFC}.docx`)
    && reopened.title === reopened.title.normalize("NFC"), reopened.title);
  check("Mở lại: nội dung đã lưu được đọc lại", reopened.body.includes("Xin chào thế giới"), reopened.body.slice(0, 80));
  const recentForFile = reopened.recent.filter((item) => item.path.normalize("NFC") === savedNfc);
  check("Gần đây: một mục duy nhất cho tệp, đường dẫn NFC",
    recentForFile.length === 1 && recentForFile[0].path === savedNfc && recentForFile[0].name === `${NAME_NFC}.docx`,
    JSON.stringify(reopened.recent));
  check("Mở lại: không có hộp thoại lỗi", !(await dialogOpen(cdp)));
} catch (error) {
  check("Phiên CDP hộp thoại tệp macOS không phát sinh ngoại lệ", false, error.stack || error.message);
  if (session) console.error(session.output.slice(-4000));
} finally {
  if (session) await session.close().catch(() => {});
  await rm(profileRoot, { recursive: true, force: true }).catch(() => {});
}

console.log(`MAC-3-2610 CDP: ${checks.filter(Boolean).length}/${checks.length} PASS`);
if (checks.some((value) => !value)) process.exit(1);
