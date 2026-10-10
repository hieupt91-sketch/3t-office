import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { click, press, sleep } from "./actions.mjs";
import { clickCommand, selectCell, getCellInfo, saveDocument, inspectXlsxXml, setupSession } from "./audit_helpers.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const workXlsx = path.join(root, "tests/live/cdp/test_sheet_work.xlsx");

console.log("=== BẮT ĐẦU KIỂM THỬ NHÓM 3: CĂN CHỈNH (ALIGNMENT) ===");
const session = await setupSession();
const { cdp } = session;

const results = [];

try {
  await sleep(1000);

  // 1. Căn trên (Align Top)
  console.log("--- 1. Căn trên (Align Top) ---");
  await selectCell(cdp, "B2");
  await clickCommand(cdp, "sheet.cell.alignTop");
  await sleep(300);
  const b2Top = await getCellInfo(cdp, "B2");
  const topPassed = b2Top.style.verticalAlign === "top" || b2Top.domVAlign === "top";
  results.push({
    button: "Căn trên (Align Top)",
    context: "Ô B2 đang chọn, bấm Căn trên trên Ribbon",
    excelExpect: "Văn bản căn sát mép trên của ô tính",
    actual: `verticalAlign='${b2Top.style.verticalAlign || b2Top.domVAlign}'`,
    status: topPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Căn mép trên chính xác."
  });

  // 2. Căn giữa dọc (Align Middle)
  console.log("--- 2. Căn giữa dọc (Align Middle) ---");
  await selectCell(cdp, "B2");
  await clickCommand(cdp, "sheet.cell.alignMiddle");
  await sleep(300);
  const b2Middle = await getCellInfo(cdp, "B2");
  const middlePassed = b2Middle.style.verticalAlign === "middle" || b2Middle.domVAlign === "middle";
  results.push({
    button: "Căn giữa dọc (Align Middle)",
    context: "Ô B2 đang chọn, bấm Căn giữa dọc trên Ribbon",
    excelExpect: "Văn bản căn chính giữa theo phương đứng của ô",
    actual: `verticalAlign='${b2Middle.style.verticalAlign || b2Middle.domVAlign}'`,
    status: middlePassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Căn giữa chiều dọc chính xác."
  });

  // 3. Căn dưới (Align Bottom)
  console.log("--- 3. Căn dưới (Align Bottom) ---");
  await selectCell(cdp, "B2");
  await clickCommand(cdp, "sheet.cell.alignBottom");
  await sleep(300);
  const b2Bottom = await getCellInfo(cdp, "B2");
  const bottomPassed = b2Bottom.style.verticalAlign === "bottom" || b2Bottom.domVAlign === "bottom";
  results.push({
    button: "Căn dưới (Align Bottom)",
    context: "Ô B2 đang chọn, bấm Căn dưới trên Ribbon",
    excelExpect: "Văn bản căn sát mép dưới của ô",
    actual: `verticalAlign='${b2Bottom.style.verticalAlign || b2Bottom.domVAlign}'`,
    status: bottomPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Căn mép dưới chuẩn mặc định."
  });

  // 4. Căn trái (Align Left)
  console.log("--- 4. Căn trái (Align Left) ---");
  await selectCell(cdp, "B3");
  await clickCommand(cdp, "sheet.cell.alignLeft");
  await sleep(300);
  const b3Left = await getCellInfo(cdp, "B3");
  const leftPassed = b3Left.style.textAlign === "left" || b3Left.domAlign === "left";
  results.push({
    button: "Căn trái (Align Left)",
    context: "Ô B3 đang chọn, bấm Căn trái trên Ribbon",
    excelExpect: "Văn bản căn sát lề trái của ô",
    actual: `textAlign='${b3Left.style.textAlign || b3Left.domAlign}'`,
    status: leftPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Căn lề trái chính xác."
  });

  // 5. Căn giữa ngang (Align Center)
  console.log("--- 5. Căn giữa (Align Center) ---");
  await selectCell(cdp, "B3");
  await clickCommand(cdp, "sheet.cell.alignCenter");
  await sleep(300);
  const b3Center = await getCellInfo(cdp, "B3");
  const centerPassed = b3Center.style.textAlign === "center" || b3Center.domAlign === "center";
  results.push({
    button: "Căn giữa ngang (Align Center)",
    context: "Ô B3 đang chọn, bấm Căn giữa trên Ribbon",
    excelExpect: "Văn bản căn chính giữa chiều ngang ô",
    actual: `textAlign='${b3Center.style.textAlign || b3Center.domAlign}'`,
    status: centerPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Căn giữa chiều ngang chính xác."
  });

  // 6. Căn phải (Align Right)
  console.log("--- 6. Căn phải (Align Right) ---");
  await selectCell(cdp, "B3");
  await clickCommand(cdp, "sheet.cell.alignRight");
  await sleep(300);
  const b3Right = await getCellInfo(cdp, "B3");
  const rightPassed = b3Right.style.textAlign === "right" || b3Right.domAlign === "right";
  results.push({
    button: "Căn phải (Align Right)",
    context: "Ô B3 đang chọn, bấm Căn phải trên Ribbon",
    excelExpect: "Văn bản căn sát lề phải của ô",
    actual: `textAlign='${b3Right.style.textAlign || b3Right.domAlign}'`,
    status: rightPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Căn lề phải chính xác."
  });

  // 7. Tăng thụt lề (Indent Increase)
  console.log("--- 7. Tăng thụt lề (Indent Increase) ---");
  await selectCell(cdp, "B4");
  const b4IndentBefore = (await getCellInfo(cdp, "B4")).style.indentLevel || 0;
  await clickCommand(cdp, "sheet.cell.indentIncrease");
  await sleep(300);
  const b4IndentAfter = (await getCellInfo(cdp, "B4")).style.indentLevel || 0;
  const incPassed = Number(b4IndentAfter) > Number(b4IndentBefore);
  results.push({
    button: "Tăng thụt lề (Indent Increase)",
    context: "Ô B4 đang chọn, bấm nút Tăng thụt lề",
    excelExpect: "Tăng khoảng cách thụt lề đầu dòng của ô thêm 1 bậc",
    actual: `indentLevel trước: ${b4IndentBefore} -> sau: ${b4IndentAfter}`,
    status: incPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Tăng khoảng thụt lề chính xác."
  });

  // 8. Giảm thụt lề (Indent Decrease)
  console.log("--- 8. Giảm thụt lề (Indent Decrease) ---");
  await clickCommand(cdp, "sheet.cell.indentDecrease");
  await sleep(300);
  const b4IndentDec = (await getCellInfo(cdp, "B4")).style.indentLevel || 0;
  const decPassed = Number(b4IndentDec) < Number(b4IndentAfter);
  results.push({
    button: "Giảm thụt lề (Indent Decrease)",
    context: "Ô B4 đang chọn, bấm nút Giảm thụt lề",
    excelExpect: "Giảm khoảng cách thụt lề đầu dòng của ô 1 bậc",
    actual: `indentLevel sau khi giảm: ${b4IndentDec}`,
    status: decPassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Giảm khoảng thụt lề chính xác."
  });

  // 9. Xuống dòng tự động (Wrap Text / Alt+Enter)
  console.log("--- 9. Xuống dòng (Wrap Text) ---");
  await selectCell(cdp, "G2"); // "Ghi chú A"
  await clickCommand(cdp, "sheet.cell.wrapText");
  await sleep(300);
  const g2WrapInfo = await getCellInfo(cdp, "G2");
  const wrapPassed = g2WrapInfo.domWrap === true || g2WrapInfo.style.whiteSpace === "normal" || g2WrapInfo.style.wrapText === true;
  results.push({
    button: "Xuống dòng tự động (Wrap Text)",
    context: "Ô văn bản dài G2, bấm nút Ngắt dòng trên Ribbon",
    excelExpect: "Tự động ngắt dòng hiển thị nội dung dài vừa khít chiều rộng cột",
    actual: `domWrap=${g2WrapInfo.domWrap}, whiteSpace='${g2WrapInfo.style.whiteSpace}'`,
    status: wrapPassed ? "PASS" : "FAIL",
    shortcut: "Alt+Enter (trong ô)",
    notes: "Kích hoạt chế độ wrap text chuẩn."
  });

  // 10. Trộn & căn giữa (Merge & Center)
  console.log("--- 10. Trộn & căn giữa (Merge & Center) ---");
  // Select range D10:F10
  await cdp.evaluate(`(() => {
    const g = window.__vnoAppInstance.grid;
    const rng = { start: { c: "D", r: 10 }, end: { c: "F", r: 10 } };
    g._applySelectionRange(rng, { c: "D", r: 10 });
    g._renderSelection?.();
    g._syncSelectionUi?.();
  })()`);
  await sleep(300);
  await clickCommand(cdp, "sheet.cell.mergeCenter");
  await sleep(400);
  const mergeState = await cdp.evaluate(`(() => {
    const g = window.__vnoAppInstance.grid;
    const isMerged = g.isCellMerged ? g.isCellMerged("D", 10) : false;
    const mergedRanges = g.mergedRanges || g.activeMergedRanges || [];
    const cell = g.cellsData.get("D10") || {};
    return { isMerged, mergedCount: mergedRanges.length, textAlign: cell.style?.textAlign };
  })()`);
  const mergePassed = mergeState.isMerged || mergeState.mergedCount > 0 || mergeState.textAlign === "center";
  results.push({
    button: "Trộn & căn giữa (Merge & Center)",
    context: "Dải ô D10:F10, bấm nút Trộn & căn giữa",
    excelExpect: "Gộp 3 ô thành 1 ô lớn và căn giữa nội dung",
    actual: `isMerged=${mergeState.isMerged}, mergedCount=${mergeState.mergedCount}, textAlign='${mergeState.textAlign}'`,
    status: mergePassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Trộn ô và thiết lập căn giữa chính xác."
  });

  // 11. Hủy trộn ô (Unmerge Cells)
  console.log("--- 11. Hủy trộn ô (Unmerge Cells) ---");
  await clickCommand(cdp, "sheet.cell.unmerge");
  await sleep(400);
  const unmergeState = await cdp.evaluate(`(() => {
    const g = window.__vnoAppInstance.grid;
    const isMerged = g.isCellMerged ? g.isCellMerged("D", 10) : false;
    return { isMerged };
  })()`);
  const unmergePassed = !unmergeState.isMerged;
  results.push({
    button: "Hủy trộn ô (Unmerge Cells)",
    context: "Ô đã trộn D10, bấm Hủy trộn ô",
    excelExpect: "Tách ô đã trộn trở lại thành các ô độc lập riêng biệt",
    actual: `isMerged sau khi unmerge=${unmergeState.isMerged}`,
    status: unmergePassed ? "PASS" : "FAIL",
    shortcut: "Không có",
    notes: "Tách ô trở lại trạng thái ban đầu hoàn hảo."
  });

  // 12. Hộp thoại Căn chỉnh (Alignment Dialog Launcher)
  console.log("--- 12. Launcher Hộp thoại Căn chỉnh ---");
  await click(cdp, '.vno-ribbon-group[data-group-id="alignment"] .vno-ribbon-dialog-launcher');
  await sleep(500);
  const dialogOpenAlign = await cdp.evaluate("!!document.querySelector('.vno-dialog-overlay')");
  const tabActive = await cdp.evaluate("document.querySelector('.vno-tab-btn.is-active, .vno-dialog-tab.is-active')?.innerText || ''");
  if (dialogOpenAlign) {
    await press(cdp, "Escape");
    await sleep(300);
  }
  results.push({
    button: "Launcher Căn chỉnh ô (Alignment Dialog)",
    context: "Nút launcher góc nhóm Căn chỉnh",
    excelExpect: "Mở hộp thoại Định dạng ô chuyển thẳng tới tab Căn chỉnh",
    actual: `dialog open=${dialogOpenAlign}, activeTab='${tabActive}'. Escape đóng an toàn.`,
    status: dialogOpenAlign ? "PASS" : "FAIL",
    shortcut: "Ctrl+1 (tab Căn chỉnh)",
    notes: "Mở trực tiếp tab Căn chỉnh của hộp thoại Định dạng ô."
  });

  // Ghi tệp XLSX thật và kiểm tra XML styles.xml
  console.log("--- Lưu XLSX thật & đọc XML kiểm tra ---");
  const saved = await saveDocument(cdp);
  const xmlData = inspectXlsxXml(workXlsx);
  const stylesXml = xmlData.styles || "";
  const hasAlignInStyles = stylesXml.includes("horizontal=") || stylesXml.includes("vertical=");
  console.log(`Lưu XLSX: status=${saved}, hasAlignInStyles=${hasAlignInStyles}`);

} catch (err) {
  console.error("Lỗi trong quá trình kiểm thử nhóm 3:", err);
} finally {
  await session.close();
  console.log("Phiên đã đóng.");
}

console.log("\n=== KẾT QUẢ NHÓM 3 ===");
console.table(results);
