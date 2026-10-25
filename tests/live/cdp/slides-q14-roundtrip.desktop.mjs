// Q14: tạo bộ trình bày 5 trang, lưu/mở PPTX qua luồng desktop và xuất PDF qua print API.
import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const outDir = process.env.VNO_Q14_OUT || platformOutputPath("E:\\VNOffice-profiles\\q14-slides-final", { directory: true });
const pptx = path.join(outDir, "q14-five-slides.pptx");
const pdf = path.join(outDir, "q14-five-slides.pdf");
const png = path.join(outDir, "q14-real-image.png");
await fs.mkdir(outDir, { recursive: true });
await fs.writeFile(png, Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p2sAAAAASUVORK5CYII=", "base64"));

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("slides", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;
const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 180000 });
const canvas = "window.__vnoAppInstance.adapter.canvas";
try {
  await ev(`(() => {
    const c=${canvas};
    while(c.slides.length>1)c.slides.pop();
    c.slides[0].title="Kế hoạch phát triển sản phẩm số";
    c.slides[0].body="Mục tiêu và chỉ số theo dõi";
    c._renderThumbnails(); c.selectSlide(0);
    return true;
  })()`);
  const table = await ev(`(async()=>await ${canvas}.insertTable({rows:4,cols:3}))()`);
  check("Chèn bảng 4×3 qua API Slides", table?.rows === 4 && table?.cols === 3, JSON.stringify({ rows: table?.rows, cols: table?.cols }));
  await ev(`(() => { const t=${canvas}.slides[0].shapes.find(s=>s.type==='table'); t.cells=[['Hạng mục','Q3','Q4'],['Người dùng','1200','1800'],['Tốc độ','2.1s','1.5s'],['Hoàn tất','68%','85%']]; ${canvas}._renderShapesLayer(); })()`);

  await ev(`(() => { const c=${canvas}; c.addNewSlide(false); c.slides[c.currentSlideIndex].title="Tiến độ triển khai"; c.slides[c.currentSlideIndex].body="Theo dõi mục tiêu từng quý"; c._renderThumbnails(); })()`);
  const chart = await ev(`(async()=>await ${canvas}.insertChart({chartType:'bar',title:'Tiến độ triển khai',labels:['Q1','Q2','Q3','Q4'],data:[20,38,61,85]}))()`);
  check("Chèn biểu đồ cột có tiêu đề và dữ liệu", chart?.type === "chart" && chart?.title === "Tiến độ triển khai" && chart?.data?.length === 4, JSON.stringify({ type: chart?.type, title: chart?.title, data: chart?.data }));

  await ev(`(() => { const c=${canvas}; c.addNewSlide(false); c.slides[c.currentSlideIndex].title="Hình ảnh minh họa"; c._renderThumbnails(); })()`);
  await ev(`(() => { const original=HTMLInputElement.prototype.click; HTMLInputElement.prototype.click=function(){if(this.type==='file'&&!this.isConnected)document.body.appendChild(this);return original.call(this)}; })()`);
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="slides.image.insert"]');
  await cdp.waitFor('document.querySelector("input[type=file]")', { timeoutMilliseconds: 15000 });
  await ev(`(() => { const input=document.querySelector('input[type=file]'); if(!input.isConnected)document.body.appendChild(input); return true; })()`);
  const doc = await cdp.send("DOM.getDocument", { depth: -1, pierce: true });
  const inputNode = await cdp.send("DOM.querySelector", { nodeId: doc.result.root.nodeId, selector: 'input[type="file"]' });
  if (!inputNode.result.nodeId) throw new Error("Không tìm thấy input tệp ảnh trong DOM");
  await cdp.send("DOM.setFileInputFiles", { nodeId: inputNode.result.nodeId, files: [png] });
  await cdp.waitFor(`${canvas}.slides[2].shapes.some(s=>s.type==="image")`, { timeoutMilliseconds: 20000 });
  check("Chèn ảnh PNG thật qua input tệp CDP", await ev(`${canvas}.slides[2].shapes.some(s=>s.type==='image'&&s.src.startsWith('data:image/png;base64,'))`), png);

  await ev(`(() => { const c=${canvas}; c.addNewSlide(false); const s=c.slides[c.currentSlideIndex]; s.title="Ghi chú và chuyển trang"; s.notes="Nhắc: rà soát số liệu trước khi trình bày."; c.setTransition('wipe',650,false,{advanceOnClick:true},'left'); c._renderThumbnails(); })()`);
  check("Ghi chú và chuyển trang được đặt trên trang 4", await ev(`${canvas}.slides[3].notes.includes('rà soát số liệu')&&${canvas}.slides[3].transition.type==='wipe'`));

  await ev(`(() => { const c=${canvas}; c.addNewSlide(false); const s=c.slides[c.currentSlideIndex]; s.title="Bước tiếp theo"; s.body="Hoàn thiện thử nghiệm và phát hành"; c.setObjectAnimation('title',{type:'fade',duration:700,delay:0}); c._renderThumbnails(); })()`);
  check("Hiệu ứng hoạt hình được đặt trên trang 5", await ev(`${canvas}.slides[4].titleAnimation?.type==='fade'`));
  check("Bộ trình bày có đủ 5 trang", await ev(`${canvas}.slides.length===5`));

  const save = await ev(`(async()=>{const a=window.__vnoAppInstance.adapter;return await window.pywebview.api.save_document_in_place(a.serializeToFodp(),'slides',${JSON.stringify(pptx)},null)})()`);
  check("Lưu PPTX qua save_document_in_place", save?.status === "ok", JSON.stringify(save));
  await session.close();

  const reopen = await launchApp("slides", { filePath: pptx, localAppData: process.env.VNO_Q14_REOPEN_LOCALAPPDATA, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    await reopen.cdp.waitFor(`${canvas}.slides.length===5`, { timeoutMilliseconds: 30000 });
    const state = await reopen.cdp.evaluate(`JSON.stringify(${canvas}.slides.map(s=>({title:s.title,notes:s.notes,transition:s.transition?.type,animation:s.titleAnimation?.type,shapes:(s.shapes||[]).map(x=>x.type)})))`);
    const slides = JSON.parse(state);
    check("Mở lại PPTX trong phiên mới: đủ trang, bảng, biểu đồ, ảnh, ghi chú, chuyển trang, hoạt hình",
      slides.length === 5 && slides[0].shapes.includes("table") && slides[1].shapes.includes("chart") && slides[2].shapes.includes("image") && slides[3].notes.includes("rà soát số liệu") && slides[3].transition === "wipe" && slides[4].animation === "fadeIn",
      state);

    const content = await reopen.cdp.evaluate(`window.__vnoAppInstance.adapter.serializeToFodp()`, { awaitPromise: true, timeoutMilliseconds: 180000 });
    const prepared = await reopen.cdp.evaluate(`window.pywebview.api.prepare_print_document('slides',${JSON.stringify(content)},'q14-five-slides',${JSON.stringify(pptx)},true,{})`, { awaitPromise: true, timeoutMilliseconds: 600000 });
    check("Chuẩn bị luồng xuất/in báo cáo 5 trang", prepared?.status === "ok" && prepared?.pageCount === 5, JSON.stringify(prepared));
    if (prepared?.status === "ok") {
      const printed = await reopen.cdp.evaluate(`window.pywebview.api.print_document(${JSON.stringify(prepared.sessionId)},{printer:'Microsoft Print to PDF',copies:1,pageRange:'',destinationPath:${JSON.stringify(pdf)}})`, { awaitPromise: true, timeoutMilliseconds: 600000 });
      check("Gửi PDF thật tới đường dẫn đích qua API in", printed?.status === "ok", JSON.stringify(printed));
    }
  } finally { await reopen.close(); }
} catch (error) {
  check("Q14 roundtrip chạy xong", false, error.stack || error.message);
  await session.close().catch(() => {});
}
if (checks.some(ok => !ok)) process.exit(1);
console.log(`slides-q14-roundtrip: ${checks.length}/${checks.length} PASS`);
