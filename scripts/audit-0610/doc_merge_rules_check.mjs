// D17: CDP audit for Writer mail merge IF rules. Run with node --experimental-websocket.
import { launchApp } from "../../tests/live/cdp/session.mjs";
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 180)); };
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (source) => session.cdp.evaluate(source);
  const seed = await ev(`(()=>{const a=window.__vnoAppInstance.adapter,b=document.querySelector('.vno-writer-body');a.setMailMergeData('Name,City\\nAn,Hà Nội\\nBình,Đà Nẵng');b.innerHTML='<p><span class="vno-merge-if" data-merge-if="City" data-op="equals" data-value="Hà Nội" data-then="Xin chào" data-else="Kính gửi">Nếu City bằng Hà Nội thì Xin chào ngược lại Kính gửi</span> <span class="vno-merge-field" data-field="Name">«Name»</span></p>';return true})()`);
  rec("Khởi tạo mẫu có IF và nguồn nhận", seed === true, seed);
  await ev(`window.__vnoAppInstance.adapter.toggleMailMergePreview({force:true,recordIndex:0}); true`);
  const first = await ev(`document.querySelector('.vno-writer-body').innerText`);
  rec("Preview khớp điều kiện theo bản ghi 1", /Xin chào An/.test(first), first);
  await ev(`window.__vnoAppInstance.adapter.nextMailMergeRecord(); true`);
  const second = await ev(`document.querySelector('.vno-writer-body').innerText`);
  rec("Preview nhánh ngược lại theo bản ghi 2", /Kính gửi Bình/.test(second), second);
  await ev(`window.__vnoAppInstance.adapter.toggleMailMergePreview({force:false}); true`);
  await ev(`window.__vnoAppInstance.adapter.finishMailMerge({mode:'document'}); true`);
  const merged = await ev(`document.querySelector('.vno-writer-body').innerText`);
  rec("Hoàn tất trộn đánh giá IF trên mỗi bản ghi", /Xin chào An/.test(merged) && /Kính gửi Bình/.test(merged), merged);
  console.log("DOCX IF field XML: NOT RUN (lưu IF field chưa được triển khai trong D17).");
} catch (error) { rec("Lỗi CDP", false, String(error?.stack || error)); }
finally { await session.close(); }
console.log(failed ? `TỔNG: ${failed} FAIL` : "TỔNG: tất cả PASS (DOCX IF field NOT RUN)");
process.exit(failed ? 1 : 0);
