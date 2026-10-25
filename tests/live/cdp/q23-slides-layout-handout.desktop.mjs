import path from "node:path";
import { execFileSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { launchApp } from "./session.mjs";
import { platformOutputPath } from "./output-path.mjs";

const outDir = process.env.VNO_Q23_OUT || platformOutputPath("E:\\VNOffice-profiles\\q23-slides-layout-handout", { directory: true });
const pptx = path.join(outDir, "q23-layouts.pptx");
const localAppData = process.env.VNO_CDP_LOCALAPPDATA;
const reopenLocalAppData = process.env.VNO_Q23_REOPEN_LOCALAPPDATA;
const session = await launchApp("slides", { localAppData });
const canvas = "window.__vnoAppInstance.adapter.canvas";
const evaluate = (cdp, expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 180000 });
const inspectPdf = pdfPath => JSON.parse(execFileSync("python", ["-c", "import json,sys; from pypdf import PdfReader; r=PdfReader(sys.argv[1]); print(json.dumps({'pages':len(r.pages),'width':float(r.pages[0].mediabox.width),'height':float(r.pages[0].mediabox.height),'text':[p.extract_text() or '' for p in r.pages]}))", pdfPath], { encoding: "utf8" }));
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

try {
  await evaluate(session.cdp, `(() => {
    const c=${canvas};
    while (c.slides.length > 1) c.slides.pop();
    c.slides[0].title = "Bìa";
    for (let i=1;i<4;i++) c.addNewSlide(false);
    c.slides[1].layoutType = "title-content";
    c.slides[1].title = "Bố cục tiêu đề và nội dung";
    c.slides[1].body = "Nội dung 1";
    c.slides[1].notes = "Ghi chú thuyết trình trang 2.";
    c.slides[2].layoutType = "two-content";
    c.slides[2].title = "Bố cục hai cột";
    c.slides[2].body = "Cột trái";
    c.slides[2].body2 = "Cột phải";
    c.slides[2].notes = "Ghi chú thuyết trình trang 3.";
    c.slides[3].layoutType = "blank";
    c.slides[3].title = "";
    c.slides[3].body = "";
    c._renderThumbnails();
    return c.slides.slice(1,4).map(s=>s.layoutType);
  })()`);
  const sourceFodp = await evaluate(session.cdp, `window.__vnoAppInstance.adapter.serializeToFodp()`);
  const saved = await evaluate(session.cdp, `(async()=>{
    return await window.pywebview.api.save_document_in_place(${JSON.stringify(sourceFodp)},"slides",${JSON.stringify(pptx)},null)
  })()`);
  check("Tạo và lưu ba bố cục tùy chỉnh", saved?.status === "ok", JSON.stringify(saved));
  await writeFile(path.join(outDir, "q23-source.fodp"), sourceFodp, "utf8");
  await session.close();

  const reopened = await launchApp("slides", { filePath: pptx, localAppData: reopenLocalAppData });
  try {
    await reopened.cdp.waitFor(`${canvas}.slides.length===4`, { timeoutMilliseconds: 45000 });
    const layouts = await evaluate(reopened.cdp, `${canvas}.slides.slice(1,4).map(s=>s.layoutType)`);
    check("Giữ đúng tên ba bố cục sau lưu và mở lại", JSON.stringify(layouts) === JSON.stringify(["title-content","two-content","blank"]), JSON.stringify(layouts));

    await evaluate(reopened.cdp, `window.__vnoAppInstance.adapter.print()`);
    await reopened.cdp.waitFor(`document.querySelector(".vno-print-dialog")`, { timeoutMilliseconds: 30000 });
    const printOptions = await evaluate(reopened.cdp, `(() => {
      const d=document.querySelector(".vno-print-dialog");
      return {
        modes:[...d.querySelectorAll("[name='slidesPrintMode']")].map(x=>x.value),
        choices:[...d.querySelectorAll("[name='slidesPerPage'] option")].map(x=>x.value),
        preview:!!d.querySelector(".vno-print-preview-image")
      };
    })()`);
    check("Dialog in có chế độ trang chiếu, handout 3/6/9, ghi chú và xem trước", ["slides","handout","notes"].every(value=>printOptions.modes.includes(value)) && ["3","6","9"].every(value=>printOptions.choices.includes(value)) && printOptions.preview, JSON.stringify(printOptions));
    await evaluate(reopened.cdp, `document.querySelector("[name='slidesPrintMode'][value='notes']").click()`);
    await reopened.cdp.waitFor(`document.querySelector(".vno-print-total")?.textContent==="4" && !document.querySelector(".vno-print-dialog-status")?.textContent.includes("Đang tạo lại")`, { timeoutMilliseconds: 180000 });
    check("Chế độ trang ghi chú xem trước đủ bốn trang", await evaluate(reopened.cdp, `document.querySelector(".vno-print-total")?.textContent` ) === "4");
    await evaluate(reopened.cdp, `document.querySelector("[name='slidesPrintMode'][value='handout']").click()`);
    await reopened.cdp.waitFor(`document.querySelector(".vno-print-total")?.textContent==="2" || document.querySelector(".vno-print-dialog-status")?.classList.contains("is-error")`, { timeoutMilliseconds: 180000 });
    check("Handout 3 trang chiếu mỗi tờ xem trước hai trang", await evaluate(reopened.cdp, `document.querySelector(".vno-print-total")?.textContent` ) === "2");
    await evaluate(reopened.cdp, `document.querySelector("select[name='slidesPerPage']").value="6"; document.querySelector("select[name='slidesPerPage']").dispatchEvent(new Event("change",{bubbles:true}))`);
    await reopened.cdp.waitFor(`document.querySelector(".vno-print-total")?.textContent==="1" || document.querySelector(".vno-print-dialog-status")?.classList.contains("is-error")`, { timeoutMilliseconds: 180000 });
    check("Handout sáu trang chiếu mỗi tờ gộp thành một trang", await evaluate(reopened.cdp, `document.querySelector(".vno-print-total")?.textContent` ) === "1");
    await evaluate(reopened.cdp, `document.querySelector("select[name='slidesPerPage']").value="9"; document.querySelector("select[name='slidesPerPage']").dispatchEvent(new Event("change",{bubbles:true}))`);
    await reopened.cdp.waitFor(`document.querySelector(".vno-print-total")?.textContent==="1" || document.querySelector(".vno-print-dialog-status")?.classList.contains("is-error")`, { timeoutMilliseconds: 180000 });
    check("Handout chín trang chiếu mỗi tờ gộp thành một trang", await evaluate(reopened.cdp, `document.querySelector(".vno-print-total")?.textContent` ) === "1");

    const exportPdf = async (mode, slidesPerPage, fileName) => evaluate(reopened.cdp, `(async()=>{
      const a=window.__vnoAppInstance.adapter;
      const prepared=await window.pywebview.api.prepare_print_document("slides",a.serializeToFodp(),"q23-handout",${JSON.stringify(pptx)},false,{slidesPrintMode:${JSON.stringify(mode)},slidesPerPage:${slidesPerPage}});
      if(prepared?.status!=="ok") return {prepared};
      const printed=await window.pywebview.api.print_document(prepared.sessionId,{printer:"Microsoft Print to PDF",copies:1,pageRange:"",destinationPath:${JSON.stringify(path.join(outDir, fileName))}});
      await window.pywebview.api.cancel_print_document(prepared.sessionId);
      return {prepared,printed};
    })()`);
    for (const [slidesPerPage, expectedPages] of [[3,2],[6,1],[9,1]]) {
      const fileName = `q23-handout-${slidesPerPage}.pdf`;
      const result = await exportPdf("handout", slidesPerPage, fileName);
      const pdf = result?.printed?.status === "ok" ? inspectPdf(path.join(outDir, fileName)) : null;
      const hasFirstThreeSlides = pdf?.text[0]?.includes("Bìa") && pdf.text[0].includes("Bố cục tiêu đề và nội dung") && pdf.text[0].includes("Bố cục hai cột");
      check(`PDF handout ${slidesPerPage}-up có đúng trang và giữ nội dung`, pdf?.pages === expectedPages && Math.abs(pdf.width / pdf.height - 841.89 / 595.28) < 0.01 && hasFirstThreeSlides, JSON.stringify({ result, pdf }));
    }
    const notesFile = "q23-speaker-notes.pdf";
    const notesResult = await exportPdf("notes", 3, notesFile);
    const notesPdf = notesResult?.printed?.status === "ok" ? inspectPdf(path.join(outDir, notesFile)) : null;
    check("PDF trang ghi chú có đúng bốn trang và giữ văn bản ghi chú", notesPdf?.pages === 4 && notesPdf.text.some(text=>text.includes("Ghi chú thuyết trình trang 2")), JSON.stringify({ notesResult, notesPdf }));
  } finally {
    await reopened.close();
  }
} finally {
  await session.close();
}

console.log(`q23-slides-layout-handout: ${checks.filter(Boolean).length}/${checks.length} PASS`);
if (checks.some(pass=>!pass)) process.exitCode = 1;
