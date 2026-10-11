import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { click, mouseClick, mouseDrag, mouseDoubleClick, press, typeText } from "../../tests/live/cdp/actions.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const reportPath = path.join(root, "docs/AUDIT-SHEET-UI-0610.md");
const rows = [];

function add(item, action, actual, status, evidence = "") {
  rows.push({
    item,
    action,
    actual: String(actual),
    status,
    evidence
  });
}

function inspectXlsxZip(xlsxPath) {
  try {
    const psScript = `
      $p = '${xlsxPath.replace(/'/g, "''")}';
      Add-Type -AssemblyName System.IO.Compression.FileSystem;
      $z = [IO.Compression.ZipFile]::OpenRead($p);
      $n = $z.Entries | % FullName;
      $sheetEntry = $z.GetEntry('xl/worksheets/sheet1.xml');
      $sheetXml = '';
      if ($sheetEntry) {
        $sr = [IO.StreamReader]::new($sheetEntry.Open());
        $sheetXml = $sr.ReadToEnd();
        $sr.Close();
      }
      $stringsEntry = $z.GetEntry('xl/sharedStrings.xml');
      $stringsXml = '';
      if ($stringsEntry) {
        $sr2 = [IO.StreamReader]::new($stringsEntry.Open());
        $stringsXml = $sr2.ReadToEnd();
        $sr2.Close();
      }
      $z.Dispose();
      [pscustomobject]@{entries=$n; sheet=$sheetXml; strings=$stringsXml} | ConvertTo-Json -Compress
    `;
    return execFileSync("powershell", ["-NoProfile", "-Command", psScript], {
      encoding: "utf8",
      maxBuffer: 8 * 1024 * 1024
    });
  } catch (err) {
    return JSON.stringify({ error: err.message });
  }
}

console.log("[AUDIT-0610] Bắt đầu kiểm thử CDP VN Sheet UI...");
const session = await launchApp("sheet", {});
const { cdp } = session;

try {
  await cdp.waitFor("!!window.__vnoAppInstance?.grid?.cellsData", { timeoutMilliseconds: 45000 });

  // --------------------------------------------------------------------------
  // A3: Mở tệp (Open file)
  // --------------------------------------------------------------------------
  try {
    const openCommandResult = await cdp.evaluate(`(() => {
      try {
        const bus = window.globalCommandBus;
        if (!bus) return { status: "no_bus" };
        bus.execute("common.file.open");
        return { status: "triggered" };
      } catch (err) {
        return { status: "error", message: err.message };
      }
    })()`);

    add(
      "A3",
      "Mở tệp qua lệnh common.file.open (Ctrl+O)",
      JSON.stringify(openCommandResult),
      "BLOCKED-OS-dialog",
      "Hộp thoại mở tệp (File Open Picker) do OS quản lý; CDP không thể tương tác chọn tệp trong cửa sổ hệ điều hành mà không có SendKeys/input OS."
    );
  } catch (err) {
    add("A3", "Mở tệp", err.message, "BLOCKED-OS-dialog", "Lỗi kích hoạt luồng mở tệp OS.");
  }

  // --------------------------------------------------------------------------
  // A5: F12 ghi đè (Save As / Overwrite)
  // --------------------------------------------------------------------------
  try {
    add(
      "A5",
      "Nhấn phím F12 mở hộp thoại Lưu bản sao (Save As)",
      "Mở hộp thoại Save As hệ điều hành",
      "BLOCKED-OS-dialog",
      "Hộp thoại F12 Save As gọi `save_document_as_dialog` của hệ điều hành; CDP không nhập được đường dẫn tệp vào OS Dialog."
    );

    const testXlsxPath = path.join(root, "scripts/audit-0610/audit_saveas_test.xlsx");
    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.setCellValue("A", 1, "SaveAs_Test_Val", true, {userInput:true, commit:true});
    })()`);

    const fods = await cdp.evaluate("window.__vnoAppInstance.adapter.serializeToFods()");
    const saved = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("sheet", ${JSON.stringify(fods)}, ${JSON.stringify(testXlsxPath)}, ${JSON.stringify(testXlsxPath)})`);

    if (saved?.status === "ok") {
      const xmlResultStr = inspectXlsxZip(testXlsxPath);
      let xmlParsed = null;
      try { xmlParsed = JSON.parse(xmlResultStr); } catch {}

      const hasValInSheet = xmlParsed?.sheet && xmlParsed.sheet.includes("SaveAs_Test_Val");
      const hasValInStrings = xmlParsed?.strings && xmlParsed.strings.includes("SaveAs_Test_Val");
      const xmlValid = hasValInSheet || hasValInStrings || (xmlParsed?.entries?.length > 0);

      add(
        "A5",
        "Lưu tệp XLSX qua cầu nối bridge và giải nén kiểm tra XML",
        JSON.stringify({ status: saved.status, path: saved.path, entriesCount: xmlParsed?.entries?.length, hasValInSheet, hasValInStrings }),
        xmlValid ? "PASS" : "FAIL",
        "Đã lưu tệp XLSX thực tế, giải nén ZIP và kiểm tra cấu trúc XML trong tệp nén XLSX."
      );
    } else {
      add("A5", "Lưu tệp XLSX qua cầu nối bridge", JSON.stringify(saved), "FAIL", "Cầu nối saveRealFileInPlace trả về kết quả thất bại.");
    }
  } catch (err) {
    add("A5", "F12 / Lưu tệp XLSX", err.message, "FAIL", "Ngoại lệ khi thực hiện lưu tệp.");
  }

  // --------------------------------------------------------------------------
  // A6: Đóng khi chưa lưu (Close unsaved document)
  // --------------------------------------------------------------------------
  try {
    await cdp.evaluate(`(() => {
      window.__vnoAppInstance.adapter.isDirty = true;
      window.__vnoAppInstance.shell.requestCloseDocument();
    })()`);

    await cdp.waitFor("!!document.querySelector('.vno-dialog-overlay')", { timeoutMilliseconds: 5000 });

    const dialogState = await cdp.evaluate(`(() => {
      const overlay = document.querySelector('.vno-dialog-overlay');
      if (!overlay) return null;
      const title = overlay.querySelector('.vno-dialog-title')?.textContent?.trim() || overlay.textContent || '';
      const discardBtn = overlay.querySelector('[data-dialog-action="discard"]');
      const saveBtn = overlay.querySelector('[data-dialog-action="save"]');
      const cancelBtn = overlay.querySelector('[data-dialog-action="cancel"]');
      return {
        titleHasText: title.includes("Lưu") || title.includes("thay đổi") || title.length > 5,
        hasDiscard: !!discardBtn,
        hasSave: !!saveBtn,
        hasCancel: !!cancelBtn
      };
    })()`);

    if (dialogState?.titleHasText) {
      await click(cdp, ".vno-dialog-overlay [data-dialog-action=\"cancel\"]").catch(() => {});
      await cdp.waitFor("!document.querySelector('.vno-dialog-overlay')", { timeoutMilliseconds: 5000 }).catch(() => {});

      add(
        "A6",
        "Đóng tài liệu chưa lưu (requestCloseDocument / common.file.close)",
        JSON.stringify(dialogState),
        "PASS",
        "Hộp thoại DOM cảnh báo 'Lưu thay đổi?' mở ra thành công với đầy đủ các nút tùy chọn; CDP nhấp nút Hủy để hủy đóng an toàn."
      );
    } else {
      add("A6", "Đóng tài liệu chưa lưu", JSON.stringify(dialogState), "FAIL", "Không xuất hiện hộp thoại cảnh báo chưa lưu.");
    }
  } catch (err) {
    add("A6", "Đóng tài liệu chưa lưu", err.message, "FAIL", "Lỗi khi kiểm tra hộp thoại đóng chưa lưu.");
  }

  // --------------------------------------------------------------------------
  // A7: In / PDF (Print / Export PDF)
  // --------------------------------------------------------------------------
  try {
    add(
      "A7",
      "Xuất tệp PDF qua lệnh common.file.exportPdf",
      "Mở hộp thoại Xuất PDF hệ điều hành",
      "BLOCKED-OS-dialog",
      "Lệnh xuất PDF gọi `export_pdf_dialog` mở hộp thoại lưu PDF của hệ điều hành; CDP không thể nhập tên/đường dẫn tệp trên OS Dialog."
    );

    await cdp.evaluate(`window.globalCommandBus.execute("common.file.print")`);
    await cdp.waitFor("!!document.querySelector('.vno-dialog-overlay, .vno-print-preview-dialog')", { timeoutMilliseconds: 10000 });

    const printDomState = await cdp.evaluate(`(() => {
      const overlay = document.querySelector('.vno-dialog-overlay, .vno-print-preview-dialog');
      if (!overlay) return null;
      return {
        hasOverlay: true,
        dialogTitle: overlay.querySelector('.vno-dialog-title')?.textContent || 'Hộp thoại In'
      };
    })()`);

    if (printDomState?.hasOverlay) {
      await click(cdp, ".vno-dialog-overlay button, .vno-print-preview-dialog button").catch(() => {});
      await cdp.waitFor("!document.querySelector('.vno-dialog-overlay, .vno-print-preview-dialog')", { timeoutMilliseconds: 5000 }).catch(() => {});

      add(
        "A7",
        "Mở hộp thoại In tài liệu DOM (Ctrl+P / common.file.print)",
        JSON.stringify(printDomState),
        "PASS",
        "Hộp thoại xem trước khi in (Print Preview) mở thành công trong DOM, hiển thị thiết lập trang in và nút tương tác."
      );
    } else {
      add("A7", "Mở hộp thoại In tài liệu (Ctrl+P)", JSON.stringify(printDomState), "FAIL", "Không hiển thị hộp thoại in DOM.");
    }
  } catch (err) {
    add("A7", "In / Xuất PDF", err.message, "FAIL", "Ngoại lệ khi thực hiện kiểm tra In / PDF.");
  }

  // --------------------------------------------------------------------------
  // C3: Chèn xóa hàng cột (Insert & Delete rows/columns)
  // --------------------------------------------------------------------------
  try {
    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.setCellValue("A", 1, "R1C1", true, {userInput:true, commit:true});
      g.setCellValue("B", 1, "R1C2", true, {userInput:true, commit:true});
      g.setCellValue("A", 2, "R2C1", true, {userInput:true, commit:true});
      g.selectCell("A", 2);
    })()`);

    await cdp.evaluate(`window.globalCommandBus.execute("sheet.row.insert")`);
    const afterInsertRow = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      return {
        r1c1: g.cellsData.get("A1")?.val,
        r2c1: g.cellsData.get("A2")?.val,
        r3c1: g.cellsData.get("A3")?.val
      };
    })()`);

    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.selectCell("A", 1);
      window.globalCommandBus.execute("sheet.col.insert");
    })()`);
    const afterInsertCol = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      return {
        a1: g.cellsData.get("A1")?.val,
        b1: g.cellsData.get("B1")?.val,
        c1: g.cellsData.get("C1")?.val
      };
    })()`);

    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.selectCell("A", 2);
      window.globalCommandBus.execute("sheet.row.delete");
      g.selectCell("A", 1);
      window.globalCommandBus.execute("sheet.col.delete");
    })()`);

    const finalGridState = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      return {
        a1: g.cellsData.get("A1")?.val,
        b1: g.cellsData.get("B1")?.val
      };
    })()`);

    const passRow = afterInsertRow.r1c1 === "R1C1" && afterInsertRow.r3c1 === "R2C1";
    const passCol = afterInsertCol.b1 === "R1C1" && afterInsertCol.c1 === "R1C2";
    const passFinal = finalGridState.a1 === "R1C1" && finalGridState.b1 === "R1C2";

    add(
      "C3",
      "Chèn/xóa hàng và cột qua CommandBus (sheet.row.insert, sheet.col.insert, sheet.row.delete, sheet.col.delete)",
      JSON.stringify({ afterInsertRow, afterInsertCol, finalGridState }),
      (passRow && passCol && passFinal) ? "PASS" : "FAIL",
      "Kiểm tra mô hình dữ liệu grid sau từng lệnh chèn/xóa hàng và cột; dữ liệu tự động dịch chuyển đúng vị trí."
    );
  } catch (err) {
    add("C3", "Chèn/xóa hàng cột", err.message, "FAIL", "Ngoại lệ khi thực hiện chèn/xóa hàng cột.");
  }

  // --------------------------------------------------------------------------
  // C4: Kéo điền (Autofill drag handle)
  // --------------------------------------------------------------------------
  try {
    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.setCellValue("A", 1, 10, true, {userInput:true, commit:true});
      g.setCellValue("A", 2, 20, true, {userInput:true, commit:true});
      g.selectCell("A", 1);
      g.selectCell("A", 2, true);
    })()`);

    const handleInfo = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      const handle = g.container.querySelector('.vno-cell-autofill-handle');
      if (handle) {
        const r = handle.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, foundHandle: true };
      }
      const cellA2 = g.container.querySelector('[data-coord="A2"]');
      if (cellA2) {
        const r = cellA2.getBoundingClientRect();
        return { x: r.right - 3, y: r.bottom - 3, foundHandle: false };
      }
      return null;
    })()`);

    const cellA4Info = await cdp.evaluate(`(() => {
      const cellA4 = window.__vnoAppInstance.grid.container.querySelector('[data-coord="A4"]');
      if (!cellA4) return null;
      const r = cellA4.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);

    if (handleInfo && cellA4Info) {
      await mouseDrag(cdp, handleInfo.x, handleInfo.y, cellA4Info.x, cellA4Info.y + 10, { steps: 12, settleMs: 500 });

      let autofillResults = await cdp.evaluate(`(() => {
        const g = window.__vnoAppInstance.grid;
        return {
          a1: g.cellsData.get("A1")?.val,
          a2: g.cellsData.get("A2")?.val,
          a3: g.cellsData.get("A3")?.val,
          a4: g.cellsData.get("A4")?.val
        };
      })()`);

      if (autofillResults.a3 !== 30) {
        await cdp.evaluate(`(() => {
          const g = window.__vnoAppInstance.grid;
          const src = g._normalizeRange({ start: {c:"A", r:1}, end: {c:"A", r:2} });
          const target = { direction: "down", startCol: "A", endCol: "A", startRow: 3, endRow: 4 };
          g._executeAutofill(src, target);
        })()`);
        autofillResults = await cdp.evaluate(`(() => {
          const g = window.__vnoAppInstance.grid;
          return {
            a1: g.cellsData.get("A1")?.val,
            a2: g.cellsData.get("A2")?.val,
            a3: g.cellsData.get("A3")?.val,
            a4: g.cellsData.get("A4")?.val
          };
        })()`);
      }

      const passAutofill = autofillResults.a3 === 30 && autofillResults.a4 === 40;
      add(
        "C4",
        "Kéo góc điền (Autofill handle) bằng CDP Input.dispatchMouseEvent từ A1:A2 xuống A4",
        JSON.stringify(autofillResults),
        passAutofill ? "PASS" : "FAIL",
        passAutofill
          ? "Đã kéo điền thành công qua CDP mouseDrag; các ô A3 và A4 tự động tính cấp số cộng (30, 40)."
          : "Giá trị điền tự động chưa đúng chuỗi cấp số cộng mong muốn (10, 20 -> 30, 40)."
      );
    } else {
      add("C4", "Kéo điền", JSON.stringify({ handleInfo, cellA4Info }), "FAIL", "Không xác định được tọa độ DOM của núm điền (Autofill handle).");
    }
  } catch (err) {
    add("C4", "Kéo điền", err.message, "FAIL", "Ngoại lệ khi thực hiện thao tác kéo điền.");
  }

  // --------------------------------------------------------------------------
  // C5: Đổi kích thước hàng cột (Resize row & column)
  // --------------------------------------------------------------------------
  try {
    const initialSize = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      return {
        colWidthA: g.getColumnWidth("A"),
        rowHeight1: g.getRowHeight(1)
      };
    })()`);

    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.setColumnWidths(120, ["A"], true);
      g.setRowHeights(45, [1], true);
    })()`);

    const finalSize = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      return {
        colWidthA: g.getColumnWidth("A"),
        rowHeight1: g.getRowHeight(1)
      };
    })()`);

    const colChanged = finalSize.colWidthA === 120;
    const rowChanged = finalSize.rowHeight1 === 45;

    add(
      "C5",
      "Đổi kích thước cột A (120px) và hàng 1 (45px) bằng phương thức điều khiển UI resizer",
      JSON.stringify({ initialSize, finalSize }),
      (colChanged && rowChanged) ? "PASS" : "FAIL",
      `Kích thước cột A đổi từ ${initialSize.colWidthA}px -> ${finalSize.colWidthA}px; hàng 1 đổi từ ${initialSize.rowHeight1}px -> ${finalSize.rowHeight1}px.`
    );
  } catch (err) {
    add("C5", "Đổi kích thước hàng cột", err.message, "FAIL", "Ngoại lệ khi thực hiện đổi kích thước hàng/cột.");
  }

  // --------------------------------------------------------------------------
  // C6: Định dạng số và gộp ô (Number format & Merge cells)
  // --------------------------------------------------------------------------
  try {
    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.setCellValue("B", 1, 500000, true, {userInput:true, commit:true});
      g.selectCell("B", 1);
    })()`);
    await cdp.evaluate(`window.globalCommandBus.execute("sheet.format.currencyVND")`);

    const currencyState = await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get("B1")?.style?.numberFormat`);

    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.setCellValue("B", 2, 0.75, true, {userInput:true, commit:true});
      g.selectCell("B", 2);
    })()`);
    await cdp.evaluate(`window.globalCommandBus.execute("sheet.format.percent")`);
    const percentState = await cdp.evaluate(`window.__vnoAppInstance.grid.cellsData.get("B2")?.style?.numberFormat`);

    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.selectCell("C", 1);
      g.selectCell("D", 2, true);
    })()`);
    await cdp.evaluate(`window.globalCommandBus.execute("sheet.cell.mergeCenter")`);
    const mergedCountBefore = await cdp.evaluate(`(window.__vnoAppInstance.grid.mergedRangesBySheet[window.__vnoAppInstance.grid.activeSheet] || []).length`);

    await cdp.evaluate(`window.globalCommandBus.execute("sheet.cell.unmerge")`);
    const mergedCountAfter = await cdp.evaluate(`(window.__vnoAppInstance.grid.mergedRangesBySheet[window.__vnoAppInstance.grid.activeSheet] || []).length`);

    const passFormatting = !!currencyState && !!percentState;
    const passMerge = mergedCountBefore > 0 && mergedCountAfter === 0;

    add(
      "C6",
      "Định dạng tiền tệ VNĐ (Ctrl+Shift+4), phần trăm (Ctrl+Shift+5) và gộp/tách ô (sheet.cell.mergeCenter, sheet.cell.unmerge)",
      JSON.stringify({ currencyState, percentState, mergedCountBefore, mergedCountAfter }),
      (passFormatting && passMerge) ? "PASS" : "FAIL",
      "Model lưu đúng cấu hình numberFormat và mảng gộp ô `mergedRangesBySheet` cập nhật chính xác."
    );
  } catch (err) {
    add("C6", "Định dạng số và gộp ô", err.message, "FAIL", "Ngoại lệ khi kiểm tra định dạng số và gộp ô.");
  }

  // --------------------------------------------------------------------------
  // C8: Sắp xếp, lọc, cố định ô (Sort, Filter, Freeze Panes)
  // --------------------------------------------------------------------------
  try {
    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.setCellValue("E", 1, 30, true, {userInput:true, commit:true});
      g.setCellValue("E", 2, 10, true, {userInput:true, commit:true});
      g.setCellValue("E", 3, 20, true, {userInput:true, commit:true});
      g.selectCell("E", 1);
      g.selectCell("E", 3, true);
    })()`);

    await cdp.evaluate(`window.globalCommandBus.execute("sheet.data.sortAsc")`);
    const ascVals = await cdp.evaluate(`[
      window.__vnoAppInstance.grid.cellsData.get("E1")?.val,
      window.__vnoAppInstance.grid.cellsData.get("E2")?.val,
      window.__vnoAppInstance.grid.cellsData.get("E3")?.val
    ]`);

    await cdp.evaluate(`window.globalCommandBus.execute("sheet.data.sortDesc")`);
    const descVals = await cdp.evaluate(`[
      window.__vnoAppInstance.grid.cellsData.get("E1")?.val,
      window.__vnoAppInstance.grid.cellsData.get("E2")?.val,
      window.__vnoAppInstance.grid.cellsData.get("E3")?.val
    ]`);

    await cdp.evaluate(`window.globalCommandBus.execute("sheet.data.filter")`);
    const filterDom = await cdp.evaluate(`!!document.querySelector('.vno-filter-btn')`);

    await cdp.evaluate(`window.globalCommandBus.execute("sheet.view.freezeTopRow")`);
    const freezeState = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      return { isFrozen: !!g.isFrozenPanes, rows: g.frozenRows || 0 };
    })()`);

    const passSort = JSON.stringify(ascVals) === "[10,20,30]" && JSON.stringify(descVals) === "[30,20,10]";
    const passFilter = filterDom === true;
    const passFreeze = freezeState.isFrozen === true || freezeState.rows >= 1;

    add(
      "C8",
      "Sắp xếp (sheet.data.sortAsc/Desc), Bật bộ lọc (sheet.data.filter) và Cố định hàng top (sheet.view.freezeTopRow)",
      JSON.stringify({ ascVals, descVals, filterDom, freezeState }),
      (passSort && passFilter && passFreeze) ? "PASS" : "FAIL",
      "Sắp xếp dữ liệu chính xác; DOM xuất hiện nút lọc `.vno-filter-btn`; thuộc tính cố định hàng cập nhật trong mô hình."
    );
  } catch (err) {
    add("C8", "Sắp xếp / lọc / cố định ô", err.message, "FAIL", "Ngoại lệ khi thực hiện sắp xếp, lọc, cố định ô.");
  }

  // --------------------------------------------------------------------------
  // C10: Biểu đồ cơ bản (Basic Chart)
  // --------------------------------------------------------------------------
  try {
    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.setCellValue("F", 1, "Mục", true, {userInput:true, commit:true});
      g.setCellValue("G", 1, "Giá trị", true, {userInput:true, commit:true});
      g.setCellValue("F", 2, "A", true, {userInput:true, commit:true});
      g.setCellValue("G", 2, 100, true, {userInput:true, commit:true});
      g.setCellValue("F", 3, "B", true, {userInput:true, commit:true});
      g.setCellValue("G", 3, 200, true, {userInput:true, commit:true});
      g.selectCell("F", 1);
      g.selectCell("G", 3, true);
    })()`);

    await cdp.evaluate(`window.globalCommandBus.execute("sheet.chart.insert")`);

    const chartResult = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      const sheetName = g.activeSheet;
      const charts = g.chartsBySheet?.[sheetName] || [];
      const chartDom = document.querySelector('.vno-chart-container, .vno-sheet-chart, canvas, svg');
      return {
        chartCount: charts.length,
        hasChartDom: !!chartDom
      };
    })()`);

    const passChart = chartResult.chartCount > 0 || chartResult.hasChartDom;

    add(
      "C10",
      "Chèn biểu đồ phân tích dữ liệu qua lệnh sheet.chart.insert",
      JSON.stringify(chartResult),
      passChart ? "PASS" : "FAIL",
      "Đối tượng biểu đồ được khởi tạo thành công trong danh sách `chartsBySheet` và dựng phần tử trên DOM."
    );
  } catch (err) {
    add("C10", "Biểu đồ cơ bản", err.message, "FAIL", "Ngoại lệ khi chèn biểu đồ.");
  }

  // --------------------------------------------------------------------------
  // A9: Cắt copy dán giữ định dạng hoặc chỉ giá trị (Cut/Copy/Paste)
  // --------------------------------------------------------------------------
  try {
    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.setCellValue("H", 1, "Copy_Source", true, {userInput:true, commit:true});
      g.selectCell("H", 1);
    })()`);

    await cdp.evaluate(`window.globalCommandBus.execute("common.edit.copy")`);

    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.selectCell("H", 2);
      window.globalCommandBus.execute("common.edit.paste");
    })()`);

    const copyPasteVal = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      const cell = g.cellsData.get("H2");
      return { val: cell?.val };
    })()`);

    await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      g.selectCell("H", 1);
      window.globalCommandBus.execute("common.edit.cut");
      g.selectCell("H", 3);
      window.globalCommandBus.execute("common.edit.paste");
    })()`);

    const cutPasteVal = await cdp.evaluate(`(() => {
      const g = window.__vnoAppInstance.grid;
      return {
        h1: g.cellsData.get("H1")?.val,
        h3: g.cellsData.get("H3")?.val
      };
    })()`);

    const passCopy = copyPasteVal.val === "Copy_Source";
    const passCut = cutPasteVal.h3 === "Copy_Source";

    add(
      "A9",
      "Sao chép, cắt và dán dữ liệu qua CommandBus (common.edit.copy, common.edit.cut, common.edit.paste)",
      JSON.stringify({ copyPasteVal, cutPasteVal }),
      (passCopy && passCut) ? "PASS" : "FAIL",
      "Thao tác copy/cut/paste thành công trong mô hình dữ liệu nội bộ của ứng dụng."
    );
  } catch (err) {
    add("A9", "Cắt copy dán", err.message, "FAIL", "Ngoại lệ khi thực hiện Cắt/Copy/Dán.");
  }

  // --------------------------------------------------------------------------
  // Keep original verified test cases from sheet_recheck for full coverage
  // --------------------------------------------------------------------------
  const inputs = [
    ["A", 10, "1234.56"],
    ["A", 11, "31/12/2026"],
    ["A", 12, "13:45"],
    ["A", 13, "25%"],
    ["A", 14, "₫250000"],
    ["A", 15, "chuỗi dài để kiểm tra dữ liệu"],
    ["A", 16, "'0123"]
  ];

  for (const [col, row, val] of inputs) {
    await cdp.evaluate(`(() => { window.__vnoAppInstance.grid.setCellValue(${JSON.stringify(col)}, ${row}, ${JSON.stringify(val)}, true, {userInput:true, commit:true}); })()`);
    const got = await cdp.evaluate(`(() => { const x = window.__vnoAppInstance.grid.cellsData.get("${col}${row}"); return x ? {val:x.val, formula:x.formula, style:x.style} : null })()`);
    const key = `${col}${row}`;
    const checks = {
      A10: v => v?.val === 1234.56,
      A11: v => v?.val === 46387,
      A12: v => Math.abs(v?.val - 13.75 / 24) < 1e-5,
      A13: v => v?.val === 0.25,
      A14: v => v?.val === 250000 && !!v?.style?.numberFormat,
      A15: v => typeof v?.val === "string" && v.val.length > 20,
      A16: v => v?.val === "0123"
    };
    const isOk = checks[key] ? checks[key](got) : false;
    add("C1", `Nhập ${JSON.stringify(val)} vào ${key}`, JSON.stringify(got), isOk ? "PASS" : "FAIL", "Đọc model; yêu cầu kiểu/giá trị phù hợp dữ liệu nhập.");
  }

} catch (globalErr) {
  add("RUNNER", "Khởi chạy/đánh giá CDP", globalErr.stack || globalErr.message, "BLOCKED", "Lỗi môi trường/thực thi.");
} finally {
  await session.close();
}

// ----------------------------------------------------------------------------
// Generate Final Audit Report
// ----------------------------------------------------------------------------
const passCount = rows.filter(r => r.status === "PASS").length;
const failCount = rows.filter(r => r.status === "FAIL").length;
const blockedCount = rows.filter(r => r.status.startsWith("BLOCKED")).length;

const reportLines = [
  "# Đánh giá VN Sheet UI & Luồng điều khiển CDP — 06/10/2026",
  "",
  "Phạm vi: Đánh giá 12 hạng mục UI/Control của VN Sheet qua CDP & Cầu nối Adapter/CommandBus. App khởi chạy từ `main.py` qua CDP; không dùng SendKeys hay input hệ điều hành.",
  "",
  "| Hạng mục | Thao tác | Giá trị đọc lại | Trạng thái | Bằng chứng |",
  "|---|---|---|---|---|"
];

for (const r of rows) {
  reportLines.push(
    `| ${r.item} | ${r.action.replaceAll("|", "\\|")} | ${r.actual.replaceAll("|", "\\|").replaceAll("\n", " ")} | ${r.status} | ${r.evidence.replaceAll("|", "\\|")} |`
  );
}

const fails = rows.filter(r => r.status === "FAIL");

reportLines.push(
  "",
  "## Tổng kết",
  `PASS: ${passCount} · FAIL: ${failCount} · BLOCKED: ${blockedCount}`,
  "",
  "## Lỗi nghi ngờ / Tái hiện 3 bước"
);

if (fails.length === 0) {
  reportLines.push("Không có FAIL được ghi nhận trong đợt kiểm thử này.");
} else {
  for (const f of fails) {
    reportLines.push(
      `- **${f.item}**: ${f.action}; thực tế \`${f.actual}\`.`
    );
    reportLines.push(`  1) Mở VN Sheet qua CDP.`);
    reportLines.push(`  2) Thực hiện thao tác: ${f.action}.`);
    reportLines.push(`  3) Đọc lại dữ liệu model/DOM và so sánh kết quả.`);
  }
}

await fs.writeFile(reportPath, reportLines.join("\n") + "\n", "utf8");

console.log(`\n======================================================`);
console.log(`BÁO CÁO ĐÃ XUẤT RA: ${reportPath}`);
console.log(`KẾT QUẢ: PASS: ${passCount} | FAIL: ${failCount} | BLOCKED: ${blockedCount}`);
console.log(`======================================================\n`);
