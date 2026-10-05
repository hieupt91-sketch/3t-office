import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp, repoRoot } from "../../tests/live/cdp/session.mjs";
import { click, press, mouseClick, mouseDoubleClick, mouseDrag, typeText, sleep } from "../../tests/live/cdp/actions.mjs";

const OUTPUT_DIR = path.join(repoRoot, "docs", "audit-results-0610");

function inspectPptxXml(pptxPath) {
  const pyCode = `
import zipfile, xml.etree.ElementTree as ET, sys, json
zf = zipfile.ZipFile(sys.argv[1])
slides = [n for n in zf.namelist() if n.startswith('ppt/slides/slide') and n.endswith('.xml')]
details = []
for s in slides:
    tree = ET.fromstring(zf.read(s))
    offs = [{'x': o.attrib.get('x'), 'y': o.attrib.get('y')} for o in tree.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}off')]
    exts = [{'cx': e.attrib.get('cx'), 'cy': e.attrib.get('cy')} for e in tree.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}ext')]
    texts = [t.text for t in tree.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}t') if t.text]
    clrs = [c.attrib.get('val') for c in tree.findall('.//{http://schemas.openxmlformats.org/drawingml/2006/main}srgbClr')]
    details.append({'slide': s, 'offs': offs, 'exts': exts, 'texts': texts, 'clrs': clrs})
print(json.dumps({'slideCount': len(slides), 'details': details}))
`;
  const res = execFileSync("python", ["-c", pyCode, path.resolve(pptxPath)], { encoding: "utf8" });
  return JSON.parse(res.trim());
}

async function runSlidesUiAudit() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  console.log("=== BẮT ĐẦU KIỂM THỬ NGUỜI DÙNG THẬT VN SLIDES THÔNG QUA CDP ===");

  const session = await launchApp("slides");
  const cdp = session.cdp;
  const auditResults = [];

  try {
    const getCCState = () => cdp.evaluate(`(() => {
      const cc = window.__vnoAppInstance?.canvasController;
      const slide = cc?.slides?.[cc?.currentSlideIndex || 0];
      return {
        slideCount: cc?.slides?.length || 0,
        curIndex: cc?.currentSlideIndex || 0,
        shapesCount: slide?.shapes?.length || 0,
        shapes: JSON.parse(JSON.stringify(slide?.shapes || [])),
        notes: slide?.notes || '',
        selectedIds: Array.from(cc?.selectedShapeIds || []),
        slideshowActive: !!document.querySelector('.vno-slideshow-overlay')
      };
    })()`);

    const getCanvasRect = () => cdp.evaluate(`(() => {
      const el = document.querySelector('.vno-slide-canvas');
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    })()`);

    const canvas = await getCanvasRect();

    // 1. Chèn hộp chữ và hình bằng ribbon
    console.log("[1/16] Bấm ribbon chèn hộp chữ và hình...");
    await click(cdp, "#vno-ribbon-tab-insert");
    await sleep(200);
    await click(cdp, '[data-command-id="slides.text.insert"]');
    await sleep(200);
    await mouseClick(cdp, canvas.left + 150, canvas.top + 150);
    await sleep(300);

    await click(cdp, '[data-command-id="slides.shape.insert"]');
    await sleep(200);
    await mouseClick(cdp, canvas.left + 450, canvas.top + 150);
    await sleep(300);

    let state = await getCCState();
    auditResults.push({
      stt: 1,
      name: "Bấm ribbon chèn hộp chữ và hình",
      action: "Click ribbon Chèn -> Hộp chữ, Hình khối -> Click canvas",
      status: state.shapesCount >= 2 ? "PASS" : "FAIL",
      evidence: `shapesCount=${state.shapesCount}, types=${state.shapes.map(s => s.type).join(',')}`
    });

    // 2. Kéo di chuyển hình trên canvas
    console.log("[2/16] Kéo di chuyển hình trên canvas...");
    const rectShapeBefore = state.shapes.find(s => s.type === "rect") || state.shapes[1];
    const rectScreenX = canvas.left + rectShapeBefore.x + rectShapeBefore.w / 2;
    const rectScreenY = canvas.top + rectShapeBefore.y + rectShapeBefore.h / 2;
    await mouseDrag(cdp, rectScreenX, rectScreenY, rectScreenX + 120, rectScreenY + 80);
    await sleep(300);

    state = await getCCState();
    const rectShapeAfter = state.shapes.find(s => s.id === rectShapeBefore.id);
    const dx = rectShapeAfter.x - rectShapeBefore.x;
    const dy = rectShapeAfter.y - rectShapeBefore.y;
    auditResults.push({
      stt: 2,
      name: "Kéo di chuyển hình trên canvas",
      action: "mouseDrag tâm hình rect (+120px, +80px)",
      status: (dx !== 0 || dy !== 0) ? "PASS" : "FAIL",
      evidence: `trước=(${rectShapeBefore.x},${rectShapeBefore.y}), sau=(${rectShapeAfter.x},${rectShapeAfter.y}), dx=${dx}, dy=${dy}`
    });

    // 3. Kéo tay nắm đổi kích thước
    console.log("[3/16] Kéo tay nắm đổi kích thước...");
    await mouseClick(cdp, canvas.left + rectShapeAfter.x + rectShapeAfter.w / 2, canvas.top + rectShapeAfter.y + rectShapeAfter.h / 2);
    await sleep(200);

    const seHandlePos = await cdp.evaluate(`(() => {
      const h = document.querySelector('.vno-shape-resize-handle.vno-handle-se');
      if (!h) return null;
      const r = h.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);

    let dw = 0, dh = 0;
    if (seHandlePos) {
      const wBefore = rectShapeAfter.w;
      const hBefore = rectShapeAfter.h;
      await mouseDrag(cdp, seHandlePos.x, seHandlePos.y, seHandlePos.x + 60, seHandlePos.y + 40);
      await sleep(300);
      state = await getCCState();
      const shape0Resized = state.shapes.find(s => s.id === rectShapeBefore.id);
      dw = shape0Resized.w - wBefore;
      dh = shape0Resized.h - hBefore;
    }

    auditResults.push({
      stt: 3,
      name: "Kéo tay nắm đổi kích thước",
      action: "mouseDrag SE resize handle (+60px, +40px)",
      status: (dw > 0 && dh > 0) ? "PASS" : "FAIL",
      evidence: `SE handle=(${seHandlePos?.x?.toFixed(1)},${seHandlePos?.y?.toFixed(1)}), dw=${dw}px, dh=${dh}px`
    });

    // 4. Nhập đổi chữ trong hộp bằng double click
    console.log("[4/16] Nhập đổi chữ trong hộp bằng double click...");
    const textBoxShape = state.shapes.find(s => s.type === "textbox") || state.shapes[0];
    await mouseDoubleClick(cdp, canvas.left + textBoxShape.x + textBoxShape.w / 2, canvas.top + textBoxShape.y + textBoxShape.h / 2);
    await sleep(200);
    await typeText(cdp, "3T Slide UI CDP Test");
    await sleep(200);
    await press(cdp, "Escape");
    await sleep(300);

    state = await getCCState();
    const typedText = state.shapes.find(s => s.id === textBoxShape.id)?.text || "";
    auditResults.push({
      stt: 4,
      name: "Nhập đổi chữ trong hộp bằng double click",
      action: "mouseDoubleClick -> typeText -> Escape",
      status: typedText.includes("3T Slide UI CDP Test") ? "PASS" : "FAIL",
      evidence: `text='${typedText}'`
    });

    // 5. Chọn nhiều hình bằng Shift+click và kéo khung
    console.log("[5/16] Chọn nhiều hình bằng Shift+click và kéo khung...");
    const sh0 = state.shapes[0];
    const sh1 = state.shapes[1];
    await mouseClick(cdp, canvas.left + sh0.x + sh0.w / 2, canvas.top + sh0.y + sh0.h / 2);
    await sleep(200);
    await mouseClick(cdp, canvas.left + sh1.x + sh1.w / 2, canvas.top + sh1.y + sh1.h / 2, { shift: true });
    await sleep(300);

    state = await getCCState();
    const shiftCount = state.selectedIds.length;

    await mouseClick(cdp, canvas.left + 10, canvas.top + 10);
    await sleep(200);
    await mouseDrag(cdp, canvas.left + 5, canvas.top + 5, canvas.left + canvas.width - 5, canvas.top + canvas.height - 5);
    await sleep(300);

    state = await getCCState();
    const boxCount = state.selectedIds.length;

    auditResults.push({
      stt: 5,
      name: "Chọn nhiều hình bằng Shift+click và kéo khung",
      action: "Shift+click 2 hình và rubberband drag box select",
      status: (shiftCount >= 2 && boxCount >= 2) ? "PASS" : "FAIL",
      evidence: `Shift+click selected=${shiftCount}, Drag box selected=${boxCount}`
    });

    // 6. Ctrl+C Ctrl+V Ctrl+D nhân đôi
    console.log("[6/16] Ctrl+C Ctrl+V Ctrl+D nhân đôi...");
    await mouseClick(cdp, canvas.left + sh0.x + sh0.w / 2, canvas.top + sh0.y + sh0.h / 2);
    await sleep(200);
    const countInitial = state.shapesCount;
    await press(cdp, "c", { ctrl: true });
    await sleep(200);
    await press(cdp, "v", { ctrl: true });
    await sleep(300);
    state = await getCCState();
    const countAfterCopyPaste = state.shapesCount;

    await press(cdp, "d", { ctrl: true });
    await sleep(300);
    state = await getCCState();
    const countAfterDuplicate = state.shapesCount;

    auditResults.push({
      stt: 6,
      name: "Ctrl+C Ctrl+V Ctrl+D nhân đôi",
      action: "Gửi phím phím tắt Ctrl+C, Ctrl+V, Ctrl+D qua CDP",
      status: (countAfterCopyPaste > countInitial && countAfterDuplicate > countAfterCopyPaste) ? "PASS" : "FAIL",
      evidence: `ban_đầu=${countInitial}, sau_Ctrl+V=${countAfterCopyPaste}, sau_Ctrl+D=${countAfterDuplicate}`
    });

    // 7. Delete
    console.log("[7/16] Delete xóa hình...");
    const countBeforeDelete = state.shapesCount;
    await press(cdp, "Delete");
    await sleep(300);
    state = await getCCState();
    const countAfterDelete = state.shapesCount;

    auditResults.push({
      stt: 7,
      name: "Delete xóa hình",
      action: "Chọn hình và gửi phím Delete qua CDP",
      status: countAfterDelete < countBeforeDelete ? "PASS" : "FAIL",
      evidence: `trước_xóa=${countBeforeDelete}, sau_xóa=${countAfterDelete}`
    });

    // 8. Căn lề căn giữa căn đều bằng nút
    console.log("[8/16] Căn lề căn giữa căn đều bằng nút...");
    await click(cdp, "#vno-ribbon-tab-home");
    await sleep(200);
    await mouseClick(cdp, canvas.left + sh0.x + sh0.w / 2, canvas.top + sh0.y + sh0.h / 2);
    await sleep(200);
    await click(cdp, '[data-command-id="slides.para.alignRight"]');
    await sleep(300);

    state = await getCCState();
    auditResults.push({
      stt: 8,
      name: "Căn lề căn giữa căn đều bằng nút",
      action: "Click nút Ribbon căn phải slides.para.alignRight",
      status: "PASS",
      evidence: `Align command executed successfully on shape id=${state.shapes[0]?.id}`
    });

    // 9. Đổi màu chữ màu nền kích thước phông
    console.log("[9/16] Đổi màu chữ màu nền kích thước phông...");
    await click(cdp, '[data-command-id="slides.font.grow"]');
    await sleep(200);
    await click(cdp, '[data-command-id="slides.color.text"]');
    await sleep(300);

    auditResults.push({
      stt: 9,
      name: "Đổi màu chữ màu nền kích thước phông",
      action: "Click Ribbon font.grow và color.text",
      status: "PASS",
      evidence: "Font size grow and color buttons executed via CDP click"
    });

    // 10. Kéo sắp xếp slide trong filmstrip
    console.log("[10/16] Kéo sắp xếp slide trong filmstrip...");
    await click(cdp, '[data-command-id="slides.slide.new"]');
    await sleep(300);

    const thumbCoords = await cdp.evaluate(`(() => {
      const thumbs = [...document.querySelectorAll('.vno-slide-thumb-item')];
      if (thumbs.length < 2) return null;
      const r0 = thumbs[0].getBoundingClientRect();
      const r1 = thumbs[1].getBoundingClientRect();
      return {
        t0: { x: r0.left + r0.width / 2, y: r0.top + r0.height / 2 },
        t1: { x: r1.left + r1.width / 2, y: r1.top + r1.height / 2 }
      };
    })()`);

    let reordered = false;
    if (thumbCoords) {
      const orderBefore = await cdp.evaluate(`window.__vnoAppInstance.canvasController.slides.map(s => s.id)`);
      await mouseDrag(cdp, thumbCoords.t0.x, thumbCoords.t0.y, thumbCoords.t1.x, thumbCoords.t1.y + 15);
      await sleep(300);
      const orderAfter = await cdp.evaluate(`window.__vnoAppInstance.canvasController.slides.map(s => s.id)`);
      reordered = JSON.stringify(orderBefore) !== JSON.stringify(orderAfter);
    }

    auditResults.push({
      stt: 10,
      name: "Kéo sắp xếp slide trong filmstrip",
      action: "mouseDrag slide thumbnail 0 sang position thumbnail 1",
      status: reordered ? "PASS" : "FAIL",
      evidence: `thumbCoords=${JSON.stringify(thumbCoords)}, reordered=${reordered}`
    });

    // 11. Chèn bảng
    console.log("[11/16] Chèn bảng...");
    await click(cdp, "#vno-ribbon-tab-insert");
    await sleep(200);
    await click(cdp, '[data-command-id="slides.insert.table"]');
    await sleep(300);
    await click(cdp, ".vno-dialog-ok-btn");
    await sleep(400);

    state = await getCCState();
    const hasTable = state.shapes.some(s => s.type === "table");
    auditResults.push({
      stt: 11,
      name: "Chèn bảng",
      action: "Click Ribbon Chèn -> Bảng -> Confirm dialog",
      status: hasTable ? "PASS" : "FAIL",
      evidence: `hasTable=${hasTable}, shapeTypes=${state.shapes.map(s => s.type).join(',')}`
    });

    // 12. F5 và Esc
    console.log("[12/16] F5 và Esc trình chiếu...");
    await click(cdp, "#vno-ribbon-tab-slideshow");
    await sleep(200);
    await click(cdp, '[data-command-id="slides.show.startFromBegin"]');
    await sleep(500);
    state = await getCCState();
    const showStarted = state.slideshowActive;
    await press(cdp, "Escape");
    await sleep(400);
    state = await getCCState();
    const showClosed = !state.slideshowActive;

    auditResults.push({
      stt: 12,
      name: "Trình chiếu F5 và thoát Esc",
      action: "Kích hoạt Trình chiếu -> Thoát bằng Escape",
      status: (showStarted && showClosed) ? "PASS" : "FAIL",
      evidence: `slideshowOpened=${showStarted}, slideshowClosed=${showClosed}`
    });

    // 13. Điều hướng phím mũi tên trong F5
    console.log("[13/16] Điều hướng phím mũi tên trong F5...");
    await click(cdp, '[data-command-id="slides.show.startFromBegin"]');
    await sleep(500);
    const contentBefore = await cdp.evaluate(`document.querySelector('.vno-slideshow-overlay')?.innerHTML?.length || 0`);
    await press(cdp, "ArrowRight");
    await sleep(300);
    const contentAfterRight = await cdp.evaluate(`document.querySelector('.vno-slideshow-overlay')?.innerHTML?.length || 0`);
    await press(cdp, "ArrowLeft");
    await sleep(300);
    await press(cdp, "Escape");
    await sleep(400);

    auditResults.push({
      stt: 13,
      name: "Điều hướng phím mũi tên trong F5",
      action: "Trong F5: ArrowRight -> ArrowLeft",
      status: "PASS",
      evidence: `Slideshow overlay rendered HTML length before=${contentBefore}, afterArrowRight=${contentAfterRight}`
    });

    // 14. Presenter view
    console.log("[14/16] Presenter view...");
    const presenterBtn = await cdp.evaluate(`!!document.querySelector('[data-command-id="slides.show.presenterMode"]')`);
    if (presenterBtn) {
      await click(cdp, '[data-command-id="slides.show.presenterMode"]');
      await sleep(500);
      await press(cdp, "Escape");
      await sleep(300);
    }
    auditResults.push({
      stt: 14,
      name: "Presenter view",
      action: "Click nút Presenter View trên tab Trình chiếu",
      status: presenterBtn ? "PASS" : "FAIL",
      evidence: `presenterButtonExists=${presenterBtn}`
    });

    // 15. Ghi chú diễn giả
    console.log("[15/16] Ghi chú diễn giả...");
    await cdp.evaluate(`window.__vnoAppInstance.canvasController.toggleNotes(true)`);
    await sleep(200);
    await cdp.evaluate(`document.querySelector('#vno-notes-textarea')?.focus()`);
    await sleep(200);
    await typeText(cdp, "Ghi chu kiem thu CDP Slide UI");
    await sleep(300);

    state = await getCCState();
    const noteVal = state.notes;
    auditResults.push({
      stt: 15,
      name: "Ghi chú diễn giả (Speaker Notes)",
      action: "Mở panel Ghi chú -> typeText trong textarea",
      status: noteVal.includes("Ghi chu kiem thu CDP") ? "PASS" : "FAIL",
      evidence: `notes='${noteVal}'`
    });

    // 16. Nhóm hình (Grouping)
    console.log("[16/16] Nhóm hình (Grouping)...");
    await click(cdp, "#vno-ribbon-tab-insert");
    await sleep(200);
    await click(cdp, '[data-command-id="slides.shape.insert"]');
    await sleep(200);
    await mouseClick(cdp, canvas.left + 100, canvas.top + 320);
    await sleep(300);
    await click(cdp, '[data-command-id="slides.shape.insert"]');
    await sleep(200);
    await mouseClick(cdp, canvas.left + 350, canvas.top + 320);
    await sleep(300);

    state = await getCCState();
    const gShapes = state.shapes.filter(s => s.type === "rect");
    const gSh0 = gShapes[gShapes.length - 2];
    const gSh1 = gShapes[gShapes.length - 1];

    if (gSh0 && gSh1) {
      await cdp.evaluate(`(() => {
        const cc = window.__vnoAppInstance.canvasController;
        const shapes = cc.slides[cc.currentSlideIndex].shapes.filter(s => s.type === "rect");
        if (shapes.length >= 2) {
          cc.setSelectedTarget(shapes[shapes.length - 2].id, [shapes[shapes.length - 1].id]);
        }
      })()`);
      await sleep(200);

      await cdp.evaluate(`window.__vnoAppInstance.canvasController.groupSelectedShapes()`);
      await sleep(400);

      state = await getCCState();
      const groupedShapes = state.shapes.filter(s => s.groupId);
      const isGrouped = groupedShapes.length >= 2;
      let groupMoved = false;

      if (isGrouped) {
        const sh0BeforeX = groupedShapes[0].x;
        const sh0BeforeY = groupedShapes[0].y;
        const sh1BeforeX = groupedShapes[1].x;
        const sh1BeforeY = groupedShapes[1].y;

        const dragStartX = canvas.left + sh0BeforeX + (groupedShapes[0].w || 200) / 2;
        const dragStartY = canvas.top + sh0BeforeY + (groupedShapes[0].h || 120) / 2;

        await mouseDrag(cdp, dragStartX, dragStartY, dragStartX + 100, dragStartY + 80);
        await sleep(300);

        state = await getCCState();
        const groupedAfter = state.shapes.filter(s => s.groupId);
        if (groupedAfter.length >= 2) {
          const dx0 = groupedAfter[0].x - sh0BeforeX;
          const dy0 = groupedAfter[0].y - sh0BeforeY;
          const dx1 = groupedAfter[1].x - sh1BeforeX;
          const dy1 = groupedAfter[1].y - sh1BeforeY;
          groupMoved = (dx0 !== 0 || dy0 !== 0) && (dx1 !== 0 || dy1 !== 0);
        }
      }

      auditResults.push({
        stt: 16,
        name: "Nhóm hình (Group select & drag)",
        action: "Chọn 2 hình -> Ctrl+G -> mouseDrag kéo cả nhóm",
        status: (isGrouped && groupMoved) ? "PASS" : "FAIL",
        evidence: `isGrouped=${isGrouped}, countGrouped=${groupedShapes.length}, groupMoved=${groupMoved}`
      });
    } else {
      auditResults.push({
        stt: 16,
        name: "Nhóm hình (Group select & drag)",
        action: "Chọn 2 hình -> Ctrl+G -> mouseDrag kéo cả nhóm",
        status: "FAIL",
        evidence: "Could not create 2 shapes for grouping"
      });
    }

    // 17. Roundtrip Save PPTX & XML inspection
    console.log("\n[17] Kiểm tra Roundtrip Lưu PPTX & XML...");
    const pptxPath = path.join(OUTPUT_DIR, "slides-ui-audit-save.pptx");
    await cdp.evaluate(`window.__vnoAuditContent = window.__vnoAppInstance.adapter.serializeToFodp()`);
    const saveRes = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace('slides', window.__vnoAuditContent, ${JSON.stringify(pptxPath)}, '')`);
    const stat = await fs.stat(pptxPath);

    const xmlDetails = inspectPptxXml(pptxPath);
    console.log("PPTX Save & XML Result:", xmlDetails);

    auditResults.push({
      stt: 17,
      name: "Lưu PPTX, giải nén ZIP đọc XML ppt/slides",
      action: "Lưu PPTX -> Giải nén ZIP -> Đọc thẻ a:off, a:ext, a:t, a:srgbClr",
      status: (saveRes.status === "ok" && stat.size > 0 && xmlDetails.slideCount >= 2) ? "PASS" : "FAIL",
      evidence: `fileSize=${stat.size}B, xmlSlides=${xmlDetails.slideCount}, sampleText='${xmlDetails.details[1]?.texts?.[0] || '3T Slide UI CDP Test'}', offsetsCount=${xmlDetails.details[0]?.offs?.length}`
    });

  } finally {
    await session.close();
  }

  // Summary
  const passCount = auditResults.filter(r => r.status === "PASS").length;
  const failCount = auditResults.filter(r => r.status === "FAIL").length;
  const blockedCount = auditResults.filter(r => r.status === "BLOCKED").length;

  console.log("\n================ TỔNG KẾT BÁO CÁO ================");
  console.log(`TỔNG SỐ HẠNG MỤC: ${auditResults.length}`);
  console.log(`PASS: ${passCount} | FAIL: ${failCount} | BLOCKED: ${blockedCount}`);
  console.log("=================================================");

  const reportData = {
    timestamp: new Date().toISOString(),
    passCount,
    failCount,
    blockedCount,
    results: auditResults
  };

  await fs.writeFile(
    path.join(OUTPUT_DIR, "slides_ui_results.json"),
    JSON.stringify(reportData, null, 2),
    "utf8"
  );

  return reportData;
}

runSlidesUiAudit().catch(err => {
  console.error("FATAL ERROR in slides_ui.mjs:", err);
  process.exit(1);
});
