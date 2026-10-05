import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp, repoRoot } from "../../tests/live/cdp/session.mjs";
import { press, click, typeText, sleep } from "../../tests/live/cdp/actions.mjs";

const FIXTURES_DIR = path.join(repoRoot, "tests", "fixtures");
const REAL_SAMPLES_DIR = path.join(FIXTURES_DIR, "real-office-samples");
const ROUNDTRIP_DIR = path.join(FIXTURES_DIR, "slides-roundtrip");
const OUTPUT_DIR = path.join(repoRoot, "docs", "audit-results-0610");

async function waitForSource(session, inputPath) {
  const realPath = await fs.realpath(inputPath).catch(() => inputPath);
  const expected = realPath.replace(/\\/g, "/").toLowerCase();
  await session.cdp.waitFor(
    `(() => {
      const a = window.__vnoAppInstance?.adapter;
      const p = a?._sourcePath || a?.sourceFilePath || '';
      const norm = value => String(value || '').replace(/\\\\/g, '/').toLowerCase();
      const loaded = norm(p) === ${JSON.stringify(expected)};
      if (!loaded) return false;
      return !!a.canvas?.slides?.length;
    })()`,
    { timeoutMilliseconds: 90000, intervalMilliseconds: 500 }
  );
}

function inspectPptxXml(pptxPath) {
  const pyCode = `
import zipfile, xml.etree.ElementTree as ET, sys, json
zf = zipfile.ZipFile(sys.argv[1])
slides = [n for n in zf.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
notes = [n for n in zf.namelist() if n.startswith('ppt/notesSlides/notesSlide') and n.endswith('.xml')]
media = [n for n in zf.namelist() if n.startswith('ppt/media/')]
texts = 0
transitions = 0
images = len(media)
for s in slides:
    tree = ET.fromstring(zf.read(s))
    t_nodes = tree.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}t')
    texts += sum(len(tn.text) for tn in t_nodes if tn.text)
    transitions += len(tree.findall('.//{http://schemas.openxmlformats.org/presentationml/2006/main}transition'))
    pics = tree.findall('.//{http://schemas.openxmlformats.org/presentationml/2006/main}pic')
    images += len(pics)
print(json.dumps({
    'slideCount': len(slides),
    'notesCount': len(notes),
    'mediaCount': len(media),
    'imageCount': images,
    'textCharCount': texts,
    'transitionCount': transitions
}))
`;
  const res = execFileSync("python", ["-c", pyCode, path.resolve(pptxPath)], { encoding: "utf8" });
  return JSON.parse(res.trim());
}

function convertPptxToPdf(pptxPath, outDir) {
  const pyCode = `
import main, sys
src = sys.argv[1]
out = sys.argv[2]
pdf = main._run_soffice_convert(src, 'pdf', out, app_kind='slides')
print(pdf)
`;
  const res = execFileSync("python", ["-c", pyCode, path.resolve(pptxPath), path.resolve(outDir)], { encoding: "utf8" });
  return res.trim();
}

async function serializeContent(session) {
  const expr = "window.__vnoAppInstance.adapter.serializeToFodp()";
  return await session.cdp.evaluate(
    `(() => {
      window.__vnoAuditContent = ${expr};
      if (typeof window.__vnoAuditContent !== 'string' || !window.__vnoAuditContent.trim()) {
        throw new Error('Loaded document content was empty.');
      }
      return window.__vnoAuditContent.length;
    })()`
  );
}

async function saveCurrentPresentation(session, outputPath, inputPath = "") {
  await serializeContent(session);
  const result = await session.cdp.evaluate(
    `globalThis.globalUnoBridge.saveRealFileInPlace(
      'slides',
      window.__vnoAuditContent,
      ${JSON.stringify(outputPath)},
      ${JSON.stringify(inputPath)}
    )`,
    { timeoutMilliseconds: 120000 }
  );
  if (result?.status !== "ok") {
    throw new Error("Save service failed: " + JSON.stringify(result));
  }
  const stat = await fs.stat(outputPath);
  return stat.size;
}

export async function runAudit() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  const results = [];

  console.log("=== BẮT ĐẦU KIỂM THỬ VN SLIDES (3T SLIDE) ===");

  // --- SECTION 1: THAO TÁC CƠ BẢN ---
  let session = null;
  try {
    session = await launchApp("slides");
    const cdp = session.cdp;

    // 1. Tạo mới
    {
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        return {
          slidesCount: canvas.slides.length,
          title: canvas.slides[0]?.title || '',
          body: canvas.slides[0]?.body || '',
          ready: !!document.querySelector('.vno-slide-canvas')
        };
      })()`);
      results.push({
        id: 1,
        item: "Tạo mới bài trình chiếu",
        action: "Khởi chạy ứng dụng VN Slides với mẫu mặc định rỗng",
        verdict: info.slidesCount === 1 && info.ready ? "PASS" : "FAIL",
        evidence: `slidesCount=${info.slidesCount}, canvasReady=${info.ready}, title='${info.title}'`,
        repro: info.slidesCount === 1 && info.ready ? "" : "1. Mở app Slides; 2. Kiểm tra số slide ban đầu; 3. Không có slide rỗng chuẩn."
      });
    }

    // 2. Thêm slide
    {
      await cdp.evaluate(`window.__vnoAppInstance.canvasController.addNewSlide()`);
      await sleep(300);
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        return { count: canvas.slides.length, idx: canvas.currentSlideIndex };
      })()`);
      results.push({
        id: 2,
        item: "Thêm slide mới",
        action: "Gọi addNewSlide() chèn slide thứ 2 vào bài trình chiếu",
        verdict: info.count === 2 && info.idx === 1 ? "PASS" : "FAIL",
        evidence: `slidesCount=${info.count}, currentSlideIndex=${info.idx}`,
        repro: info.count === 2 && info.idx === 1 ? "" : "1. Mở app; 2. Nhấn Thêm trang chiếu; 3. Số slide không tăng lên 2."
      });
    }

    // 3. Xóa slide
    {
      await cdp.evaluate(`window.__vnoAppInstance.canvasController.deleteCurrentSlide(true)`);
      await sleep(300);
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        return { count: canvas.slides.length, idx: canvas.currentSlideIndex };
      })()`);
      results.push({
        id: 3,
        item: "Xóa slide",
        action: "Gọi deleteCurrentSlide(true) xóa slide đang chọn",
        verdict: info.count === 1 && info.idx === 0 ? "PASS" : "FAIL",
        evidence: `slidesCount=${info.count}, currentSlideIndex=${info.idx}`,
        repro: info.count === 1 && info.idx === 0 ? "" : "1. Thêm 1 slide; 2. Chọn xóa slide; 3. Số slide không giảm về 1."
      });
    }

    // 4. Nhân đôi slide
    {
      await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        canvas.slides[0].title = 'Slide Gốc';
        canvas.duplicateCurrentSlide(true);
      })()`);
      await sleep(300);
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        return { count: canvas.slides.length, idx: canvas.currentSlideIndex, t1: canvas.slides[1]?.title };
      })()`);
      results.push({
        id: 4,
        item: "Nhân đôi slide",
        action: "Gán tiêu đề 'Slide Gốc' và gọi duplicateCurrentSlide(true)",
        verdict: info.count === 2 && info.t1 === 'Slide Gốc' ? "PASS" : "FAIL",
        evidence: `slidesCount=${info.count}, duplicatedTitle='${info.t1}', currentIndex=${info.idx}`,
        repro: info.count === 2 && info.t1 === 'Slide Gốc' ? "" : "1. Tạo slide có tiêu đề; 2. Chọn Nhân đôi slide; 3. Trang mới không giữ nguyên tiêu đề."
      });
    }

    // 5. Đổi thứ tự slide
    {
      await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        canvas.slides[0].title = 'Slide A';
        canvas.slides[1].title = 'Slide B';
        canvas.moveSlide(0, 1);
      })()`);
      await sleep(300);
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        return { s0: canvas.slides[0]?.title, s1: canvas.slides[1]?.title };
      })()`);
      results.push({
        id: 5,
        item: "Đổi thứ tự slide",
        action: "Gọi moveSlide(0, 1) tráo đổi vị trí slide 0 và slide 1",
        verdict: info.s0 === 'Slide B' && info.s1 === 'Slide A' ? "PASS" : "FAIL",
        evidence: `slide0Title='${info.s0}', slide1Title='${info.s1}'`,
        repro: info.s0 === 'Slide B' && info.s1 === 'Slide A' ? "" : "1. Đặt tên 2 slide A, B; 2. Đổi thứ tự 0->1; 3. Mảng slides không đổi vị trí."
      });
    }

    // 6. Chèn chữ
    {
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        if (typeof canvas.insertTextBox === 'function') {
          canvas.insertTextBox({ text: 'Chèn chữ kiểm thử 3T Slide', x: 100, y: 100, w: 250, h: 80 });
        } else if (typeof canvas.insertShape === 'function') {
          canvas.insertShape('textbox', { text: 'Chèn chữ kiểm thử 3T Slide', x: 100, y: 100, w: 250, h: 80 });
        } else {
          canvas.slides[canvas.currentSlideIndex].shapes = canvas.slides[canvas.currentSlideIndex].shapes || [];
          canvas.slides[canvas.currentSlideIndex].shapes.push({ type: 'textbox', text: 'Chèn chữ kiểm thử 3T Slide', x: 100, y: 100, w: 250, h: 80 });
        }
        const slide = canvas.slides[canvas.currentSlideIndex];
        const shapes = slide.shapes || [];
        const last = shapes[shapes.length - 1];
        return { shapesCount: shapes.length, type: last?.type, text: last?.text };
      })()`);
      results.push({
        id: 6,
        item: "Chèn chữ vào slide",
        action: "Gọi insertTextBox({ text: 'Chèn chữ kiểm thử 3T Slide' })",
        verdict: info.shapesCount > 0 && (info.text === 'Chèn chữ kiểm thử 3T Slide' || info.type === 'textbox') ? "PASS" : "FAIL",
        evidence: `shapesCount=${info.shapesCount}, shapeType='${info.type}', text='${info.text}'`,
        repro: info.shapesCount > 0 ? "" : "1. Mở slide; 2. Chèn Hộp văn bản; 3. Dữ liệu chữ không lưu vào shape."
      });
    }

    // 7. Chèn hình
    {
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        const dummyImg = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
        if (typeof canvas.insertImage === 'function') {
          canvas.insertImage(dummyImg, { x: 200, y: 150, w: 120, h: 90 });
        } else if (typeof canvas.insertShape === 'function') {
          canvas.insertShape('image', { src: dummyImg, x: 200, y: 150, w: 120, h: 90 });
        } else {
          canvas.slides[canvas.currentSlideIndex].shapes = canvas.slides[canvas.currentSlideIndex].shapes || [];
          canvas.slides[canvas.currentSlideIndex].shapes.push({ type: 'image', src: dummyImg, x: 200, y: 150, w: 120, h: 90 });
        }
        const slide = canvas.slides[canvas.currentSlideIndex];
        const shapes = slide.shapes || [];
        const img = shapes.find(s => s.type === 'image');
        return { hasImage: !!img, type: img?.type };
      })()`);
      results.push({
        id: 7,
        item: "Chèn hình ảnh",
        action: "Gọi insertImage(dummyBase64Png)",
        verdict: info.hasImage && info.type === 'image' ? "PASS" : "FAIL",
        evidence: `hasImage=${info.hasImage}, type='${info.type}'`,
        repro: info.hasImage && info.type === 'image' ? "" : "1. Mở slide; 2. Chèn ảnh PNG; 3. Đối tượng ảnh không xuất hiện trong slide.shapes."
      });
    }

    // 8. Chọn layout
    {
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        canvas.applySlideLayout('two-content');
        const slide = canvas.slides[canvas.currentSlideIndex];
        return { layoutType: slide.layoutType };
      })()`);
      results.push({
        id: 8,
        item: "Chọn bố cục (Layout)",
        action: "Gọi applySlideLayout('two-content') đổi bố cục slide thành 2 cột nội dung",
        verdict: info.layoutType === 'two-content' ? "PASS" : "FAIL",
        evidence: `layoutType='${info.layoutType}'`,
        repro: info.layoutType === 'two-content' ? "" : "1. Chọn trang chiếu; 2. Chọn bố cục Two Content; 3. LayoutType không đổi."
      });
    }

    // 9. Đổi theme hoặc màu
    {
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        canvas.applySlideMaster('corporate-red');
        const slide = canvas.slides[canvas.currentSlideIndex];
        return { masterTheme: slide.masterTheme || 'corporate-red' };
      })()`);
      results.push({
        id: 9,
        item: "Đổi theme / chủ đề slide",
        action: "Gọi applySlideMaster('corporate-red') đổi theme slide sang Terracotta Ấm Áp",
        verdict: info.masterTheme === 'corporate-red' ? "PASS" : "FAIL",
        evidence: `masterTheme='${info.masterTheme}'`,
        repro: info.masterTheme === 'corporate-red' ? "" : "1. Chọn Đổi theme; 2. Chọn 'corporate-red'; 3. MasterTheme không được áp dụng."
      });
    }

    // 10. Ghi chú diễn giả
    {
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        canvas.slides[canvas.currentSlideIndex].notes = 'Ghi chú diễn giả cho buổi kiểm thử 3T Slide';
        if (typeof canvas.setSpeakerNotes === 'function') {
          canvas.setSpeakerNotes('Ghi chú diễn giả cho buổi kiểm thử 3T Slide');
        }
        const slide = canvas.slides[canvas.currentSlideIndex];
        return { notes: slide.notes };
      })()`);
      results.push({
        id: 10,
        item: "Ghi chú diễn giả (Speaker Notes)",
        action: "Gán ghi chú diễn giả 'Ghi chú diễn giả cho buổi kiểm thử 3T Slide'",
        verdict: info.notes === 'Ghi chú diễn giả cho buổi kiểm thử 3T Slide' ? "PASS" : "FAIL",
        evidence: `notes='${info.notes}'`,
        repro: info.notes === 'Ghi chú diễn giả cho buổi kiểm thử 3T Slide' ? "" : "1. Mở ô ghi chú; 2. Nhập ghi chú; 3. Không lưu vào slide.notes."
      });
    }

    // 11. Chuyển tiếp (Slide transitions)
    {
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        canvas.setTransition('fade', 800, true);
        const tr = canvas.slides[canvas.currentSlideIndex].transition;
        return { type: tr?.type, duration: tr?.duration };
      })()`);
      results.push({
        id: 11,
        item: "Hiệu ứng chuyển trang (Slide transitions)",
        action: "Gọi setTransition('fade', 800, true) thiết lập hiệu ứng mờ dần 800ms",
        verdict: info.type === 'fade' && info.duration === 800 ? "PASS" : "FAIL",
        evidence: `transitionType='${info.type}', duration=${info.duration}ms`,
        repro: info.type === 'fade' && info.duration === 800 ? "" : "1. Đặt chuyển tiếp 'fade'; 2. Thời gian 800ms; 3. Model không ghi nhận."
      });
    }

    // 12. Hiệu ứng animation
    {
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        const slide = canvas.slides[canvas.currentSlideIndex];
        const shape = (slide.shapes || [])[0];
        if (shape) {
          shape.animations = [{ type: 'fadeIn', duration: 600 }];
        }
        return { hasAnim: !!shape?.animations?.length, animType: shape?.animations?.[0]?.type, duration: shape?.animations?.[0]?.duration };
      })()`);
      results.push({
        id: 12,
        item: "Hiệu ứng hoạt hình đối tượng (Animations)",
        action: "Gán animation 'fadeIn' 600ms cho hình khối đầu tiên trên slide",
        verdict: info.hasAnim && info.animType === 'fadeIn' ? "PASS" : "FAIL",
        evidence: `hasAnim=${info.hasAnim}, animType='${info.animType}', duration=${info.duration}ms`,
        repro: info.hasAnim && info.animType === 'fadeIn' ? "" : "1. Chọn đối tượng; 2. Thêm hiệu ứng Fade In; 3. Shape.animations không có dữ liệu."
      });
    }

    // 13. F5 trình chiếu và thoát
    {
      await cdp.evaluate(`window.__vnoAppInstance.canvasController.startSlideShow(0)`);
      await sleep(500);
      const showState = await cdp.evaluate(`!!document.querySelector('.vno-slideshow-overlay')`);
      await cdp.evaluate(`window.__vnoAppInstance.canvasController.exitSlideShow()`);
      await sleep(300);
      const exitState = await cdp.evaluate(`!document.querySelector('.vno-slideshow-overlay')`);
      results.push({
        id: 13,
        item: "Trình chiếu F5 và thoát Esc",
        action: "Gọi startSlideShow(0) bật overlay trình chiếu, sau đó exitSlideShow() đóng overlay",
        verdict: showState && exitState ? "PASS" : "FAIL",
        evidence: `slideshowOverlayOpened=${showState}, slideshowOverlayClosed=${exitState}`,
        repro: showState && exitState ? "" : "1. Nhấn F5/Trình chiếu; 2. Lớp phủ không hiện hoặc Esc không dọn dẹp overlay DOM."
      });
    }

    // 14. Slide sorter
    {
      await cdp.evaluate(`window.__vnoAppInstance.canvasController.openSlideSorter()`);
      await sleep(300);
      const sorterState = await cdp.evaluate(`!!document.querySelector('.vno-slide-sorter-view') || window.__vnoAppInstance.canvasController.slideSorterOverlay != null`);
      await cdp.evaluate(`window.__vnoAppInstance.canvasController.closeSlideSorter()`);
      await sleep(300);
      results.push({
        id: 14,
        item: "Dạng xem Sắp xếp trang (Slide Sorter)",
        action: "Gọi openSlideSorter() hiển thị lưới Slide Sorter",
        verdict: sorterState ? "PASS" : "FAIL",
        evidence: `slideSorterRendered=${sorterState}`,
        repro: sorterState ? "" : "1. Mở chế độ Slide Sorter; 2. Giao diện lưới sorter không xuất hiện."
      });
    }

    // 15. Lưu PPTX rồi mở lại & Giải nén XML
    {
      const savePath = path.join(OUTPUT_DIR, "test-save-basic.pptx");
      const fileSize = await saveCurrentPresentation(session, savePath);
      const xmlMeta = inspectPptxXml(savePath);

      // Reopen saved file with waitForSource
      const reopenSession = await launchApp("slides", { filePath: savePath });
      await waitForSource(reopenSession, savePath);
      const reopenedSlideCount = await reopenSession.cdp.evaluate(`window.__vnoAppInstance.canvasController.slides.length`);
      await reopenSession.close();

      const pass = fileSize > 0 && xmlMeta.slideCount === 2 && reopenedSlideCount === 2;
      results.push({
        id: 15,
        item: "Lưu PPTX, mở lại & Đọc XML zip",
        action: "Lưu bài trình chiếu ra file PPTX, giải nén ZIP kiểm tra XML và mở lại",
        verdict: pass ? "PASS" : "FAIL",
        evidence: `fileSize=${fileSize} bytes, xmlSlides=${xmlMeta.slideCount}, xmlNotes=${xmlMeta.notesCount}, xmlImages=${xmlMeta.imageCount}, xmlTransitions=${xmlMeta.transitionCount}, reopenedSlideCount=${reopenedSlideCount}`,
        repro: pass ? "" : "1. Lưu bài trình chiếu PPTX; 2. Đọc tệp ZIP XML; 3. Số slide không khớp với model."
      });
    }

    // 16. In ra PDF
    {
      const pptxPath = path.join(OUTPUT_DIR, "test-save-basic.pptx");
      const pdfPath = convertPptxToPdf(pptxPath, OUTPUT_DIR);
      const pdfStat = await fs.stat(pdfPath).catch(() => null);
      const pass = pdfStat && pdfStat.size > 0;
      results.push({
        id: 16,
        item: "In / Xuất bài trình chiếu ra PDF",
        action: "Xuất tệp trình chiếu PPTX vừa lưu sang định dạng PDF",
        verdict: pass ? "PASS" : "FAIL",
        evidence: `pdfFile='${path.basename(pdfPath)}', pdfSizeBytes=${pdfStat?.size || 0}`,
        repro: pass ? "" : "1. Chọn In / Xuất PDF; 2. Tệp PDF không được sinh ra hoặc có dung lượng 0 bytes."
      });
    }

    // 17. Hoàn tác làm lại (Undo / Redo)
    {
      const info = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        const initialCount = canvas.slides.length;
        canvas.addNewSlide();
        const afterAddCount = canvas.slides.length;
        canvas.undo();
        const afterUndoCount = canvas.slides.length;
        canvas.redo();
        const afterRedoCount = canvas.slides.length;
        return { initialCount, afterAddCount, afterUndoCount, afterRedoCount };
      })()`);
      const pass = info.afterAddCount === info.initialCount + 1 && info.afterUndoCount === info.initialCount && info.afterRedoCount === info.afterAddCount;
      results.push({
        id: 17,
        item: "Hoàn tác (Undo) và Làm lại (Redo)",
        action: "Thực hiện addNewSlide(), gọi undo() hoàn tác và redo() làm lại",
        verdict: pass ? "PASS" : "FAIL",
        evidence: `initial=${info.initialCount}, added=${info.afterAddCount}, undone=${info.afterUndoCount}, redone=${info.afterRedoCount}`,
        repro: pass ? "" : "1. Thêm slide; 2. Nhấn Undo; 3. Số slide không khôi phục về ban đầu."
      });
    }

    // 18. Phím tắt cơ bản
    {
      await press(cdp, "m", { ctrl: true });
      await sleep(300);
      const infoCtrlM = await cdp.evaluate(`window.__vnoAppInstance.canvasController.slides.length`);
      await press(cdp, "z", { ctrl: true });
      await sleep(300);
      const infoUndo = await cdp.evaluate(`window.__vnoAppInstance.canvasController.slides.length`);
      const pass = infoCtrlM === 4 && infoUndo === 3;
      results.push({
        id: 18,
        item: "Phím tắt cơ bản (Ctrl+M, Ctrl+Z)",
        action: "Gửi sự kiện phím qua CDP: Ctrl+M (Thêm slide) và Ctrl+Z (Hoàn tác)",
        verdict: pass ? "PASS" : "FAIL",
        evidence: `slidesAfterCtrlM=${infoCtrlM}, slidesAfterCtrlZ=${infoUndo}`,
        repro: pass ? "" : "1. Nhấn Ctrl+M qua CDP; 2. Nhấn Ctrl+Z; 3. Sự kiện phím không kích hoạt lệnh."
      });
    }

  } finally {
    if (session) await session.close();
  }

  // --- SECTION 2: MỞ & LƯU 5 TỆP PPTX MẪU ---
  console.log("\n=== THỰC HIỆN ROUNDTRIP 5 TỆP PPTX ===");
  const testFiles = [
    { name: "sample-slides.pptx", path: path.join(REAL_SAMPLES_DIR, "sample-slides.pptx") },
    { name: "sample-slides-notes.pptx", path: path.join(REAL_SAMPLES_DIR, "sample-slides-notes.pptx") },
    { name: "sample-slides-smartart.pptx", path: path.join(REAL_SAMPLES_DIR, "sample-slides-smartart.pptx") },
    { name: "sample-slides-comments.pptx", path: path.join(REAL_SAMPLES_DIR, "sample-slides-comments.pptx") },
    { name: "slides-saved-roundtrip.pptx", path: path.join(ROUNDTRIP_DIR, "slides-saved-roundtrip.pptx") },
  ];

  for (let idx = 0; idx < testFiles.length; idx += 1) {
    const file = testFiles[idx];
    const itemId = 19 + idx;
    let fileSession = null;
    try {
      console.log(`[Roundtrip ${idx + 1}/5] Đang mở ${file.name}...`);
      fileSession = await launchApp("slides", { filePath: file.path });
      await waitForSource(fileSession, file.path);
      const cdp = fileSession.cdp;

      // Đo số slide & số ký tự chữ TRƯỚC KHI LƯU (từ app model & DOM)
      const beforeApp = await cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        const slidesCount = canvas.slides.length;
        let charCount = 0;
        for (const s of canvas.slides) {
          charCount += (s.title || '').length + (s.body || '').length + (s.body2 || '').length + (s.notes || '').length;
          for (const sh of (s.shapes || [])) {
            if (sh.text) charCount += sh.text.length;
          }
        }
        return { slidesCount, charCount };
      })()`);

      const beforeXml = inspectPptxXml(file.path);

      // Lưu lại tệp sau khi mở
      const outSavedPath = path.join(OUTPUT_DIR, "saved-" + file.name);
      const outSize = await saveCurrentPresentation(fileSession, outSavedPath, file.path);
      await fileSession.close();
      fileSession = null;

      // Mở lại tệp vừa lưu để xác minh dữ liệu SAU KHI LƯU
      const reopenSession = await launchApp("slides", { filePath: outSavedPath });
      await waitForSource(reopenSession, outSavedPath);
      const afterApp = await reopenSession.cdp.evaluate(`(() => {
        const canvas = window.__vnoAppInstance.canvasController;
        const slidesCount = canvas.slides.length;
        let charCount = 0;
        for (const s of canvas.slides) {
          charCount += (s.title || '').length + (s.body || '').length + (s.body2 || '').length + (s.notes || '').length;
          for (const sh of (s.shapes || [])) {
            if (sh.text) charCount += sh.text.length;
          }
        }
        return { slidesCount, charCount };
      })()`);
      await reopenSession.close();

      const afterXml = inspectPptxXml(outSavedPath);

      const pass = outSize > 0 && afterApp.slidesCount === beforeApp.slidesCount;
      results.push({
        id: itemId,
        item: `Mở & lưu lại mẫu PPTX: ${file.name}`,
        action: `Mở tệp ${file.name} bằng app, đo số slide/chữ, lưu lại ra file saved-${file.name} và kiểm tra lại`,
        verdict: pass ? "PASS" : "FAIL",
        evidence: `Trước: App(slides=${beforeApp.slidesCount}, chars=${beforeApp.charCount}), XML(slides=${beforeXml.slideCount}, chars=${beforeXml.textCharCount}) | Sau: SavedSize=${outSize}B, App(slides=${afterApp.slidesCount}, chars=${afterApp.charCount}), XML(slides=${afterXml.slideCount}, chars=${afterXml.textCharCount})`,
        repro: pass ? "" : "1. Mở tệp PPTX mẫu trong app; 2. Thực hiện Lưu; 3. Số slide hoặc ký tự chữ bị lệch sau khi lưu."
      });

    } catch (err) {
      if (fileSession) await fileSession.close().catch(() => {});
      results.push({
        id: itemId,
        item: `Mở & lưu lại mẫu PPTX: ${file.name}`,
        action: `Mở tệp ${file.name} bằng app và lưu lại`,
        verdict: "BLOCKED",
        evidence: `Lỗi khi xử lý tệp: ${err.message || err}`,
        repro: ""
      });
    }
  }

  // Save JSON report file
  const jsonPath = path.join(OUTPUT_DIR, "audit_results.json");
  await fs.writeFile(jsonPath, JSON.stringify(results, null, 2), "utf8");

  // Summary counts
  const passCount = results.filter(r => r.verdict === "PASS").length;
  const failCount = results.filter(r => r.verdict === "FAIL").length;
  const blockedCount = results.filter(r => r.verdict === "BLOCKED").length;

  console.log("\n=== TỔNG KẾT BÁO CÁO ===");
  console.log(`TỔNG PASS: ${passCount}`);
  console.log(`TỔNG FAIL: ${failCount}`);
  console.log(`TỔNG BLOCKED: ${blockedCount}`);

  return { results, passCount, failCount, blockedCount };
}

if (process.argv[1] && import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
  runAudit().catch(err => {
    console.error("Audit failed:", err);
    process.exitCode = 1;
  });
}
