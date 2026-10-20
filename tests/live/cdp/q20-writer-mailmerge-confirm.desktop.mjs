import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a fresh profile path.");
const session = await launchApp("writer", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const results = [];
const check = (name, pass, detail = "") => {
  results.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
try {
  const cdp = session.cdp;
  await cdp.waitFor("window.__vnoAppInstance?.adapter?.editorDom", { timeoutMilliseconds: 60000 });
  const setup = await cdp.evaluate(`(() => {
    const a = window.__vnoAppInstance.adapter;
    a._initZones();
    a.bodyDom.innerHTML = '<p>Kính gửi <span class="vno-merge-field" data-field="HoTen">«HoTen»</span></p>';
    a.mailMergeData = { fields: ["HoTen"], records: [{ HoTen: "Nguyen An" }, { HoTen: "Tran Binh" }] };
    a._updateMailMergeCommandStates?.();
    return a.finishMailMerge();
  })()`);
  check("Mở hộp thoại Hoàn tất trộn", setup === true);
  await cdp.waitFor("document.querySelector('.vno-merge-replace-confirm-checkbox')", { timeoutMilliseconds: 15000 });
  const initial = await cdp.evaluate(`(() => ({
    label: document.querySelector('input[name="vno-merge-mode"][value="document"]')?.parentElement?.innerText || "",
    confirmation: document.querySelector('.vno-merge-replace-confirm')?.innerText || "",
    disabled: document.querySelector('.vno-merge-submit-btn, .vno-dialog-submit-btn')?.disabled ?? null
  }))()`);
  check("Nhãn nói rõ tài liệu đang mở sẽ bị thay", /tài liệu đang mở/i.test(initial.label));
  check("Cảnh báo có ô xác nhận và chặn Hoàn tất khi chưa chọn", /thay nội dung hiện tại/i.test(initial.confirmation) && initial.disabled === true, JSON.stringify(initial));
  await cdp.evaluate(`document.querySelector('.vno-merge-replace-confirm-checkbox').click()`);
  const enabled = await cdp.evaluate(`!document.querySelector('.vno-dialog-submit-btn').disabled`);
  check("Cho phép tiếp tục sau khi xác nhận", enabled);
  await cdp.evaluate(`document.querySelector('.vno-dialog-submit-btn').click()`);
  await sleep(300);
  const merged = await cdp.evaluate(`(() => ({
    names: ["Nguyen An", "Tran Binh"].map(name => document.querySelector('.vno-writer-body')?.innerText.includes(name) || false),
    fieldCount: document.querySelectorAll('.vno-writer-body .vno-merge-field').length
  }))()`);
  check("Sau xác nhận, thay tài liệu hiện tại bằng kết quả trộn", merged.names.every(Boolean) && merged.fieldCount === 0, JSON.stringify(merged));
} catch (error) {
  check("CDP không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
console.log(`SUMMARY ${results.filter(Boolean).length}/${results.length} PASS | ${results.filter(x => !x).length} FAIL`);
if (results.some(x => !x)) process.exitCode = 1;
