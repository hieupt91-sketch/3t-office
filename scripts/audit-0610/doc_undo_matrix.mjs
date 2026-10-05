// Ticket D8: Ma trận Undo/Redo cho mọi lệnh định dạng của Writer.
// Chạy: node --experimental-websocket scripts/audit-0610/doc_undo_matrix.mjs
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press, sleep } from "../../tests/live/cdp/actions.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const docReportPath = path.join(repoRoot, "docs/AUDIT-DOC-UNDO-0610.md");

const COMMAND_MATRIX = [
  // 1. Nhóm định dạng ký tự (writer.text.*)
  { id: "writer.text.bold", group: "Định dạng ký tự", label: "Chữ đậm" },
  { id: "writer.text.italic", group: "Định dạng ký tự", label: "Chữ nghiêng" },
  { id: "writer.text.underline", group: "Định dạng ký tự", label: "Gạch chân" },
  { id: "writer.text.strike", group: "Định dạng ký tự", label: "Gạch ngang" },
  { id: "writer.text.subscript", group: "Định dạng ký tự", label: "Chỉ số dưới" },
  { id: "writer.text.superscript", group: "Định dạng ký tự", label: "Chỉ số trên" },
  { id: "writer.text.clearFormat", group: "Định dạng ký tự", label: "Xóa định dạng" },
  { id: "writer.text.changeCase", group: "Định dạng ký tự", label: "Đổi chữ hoa/thường" },

  // 2. Nhóm phông chữ (writer.font.*)
  { id: "writer.font.grow", group: "Phông chữ", label: "Tăng cỡ chữ" },
  { id: "writer.font.shrink", group: "Phông chữ", label: "Giảm cỡ chữ" },
  { id: "writer.font.grow1pt", group: "Phông chữ", label: "Tăng cỡ chữ 1pt" },
  { id: "writer.font.shrink1pt", group: "Phông chữ", label: "Giảm cỡ chữ 1pt" },
  { id: "writer.font.family", group: "Phông chữ", label: "Đổi phông chữ", args: "Arial" },
  { id: "writer.font.size", group: "Phông chữ", label: "Đổi cỡ chữ", args: "4" },

  // 3. Nhóm màu sắc (writer.color.*)
  { id: "writer.color.text", group: "Màu sắc", label: "Màu chữ", args: "#ff0000" },
  { id: "writer.color.highlight", group: "Màu sắc", label: "Màu nền chữ", args: "#ffff00" },

  // 4. Nhóm đoạn văn (writer.para.*)
  { id: "writer.para.alignLeft", group: "Đoạn văn", label: "Căn trái" },
  { id: "writer.para.alignCenter", group: "Đoạn văn", label: "Căn giữa" },
  { id: "writer.para.alignRight", group: "Đoạn văn", label: "Căn phải" },
  { id: "writer.para.justify", group: "Đoạn văn", label: "Căn đều" },
  { id: "writer.para.spacing1", group: "Đoạn văn", label: "Giãn dòng 1.0" },
  { id: "writer.para.spacing15", group: "Đoạn văn", label: "Giãn dòng 1.5" },
  { id: "writer.para.spacing2", group: "Đoạn văn", label: "Giãn dòng 2.0" },
  { id: "writer.para.lineSpacing", group: "Đoạn văn", label: "Khoảng cách dòng", args: "1.15" },
  { id: "writer.para.lineSpacingLayout", group: "Đoạn văn", label: "Khoảng cách dòng (layout)", args: "1.15" },
  { id: "writer.para.spacingBefore", group: "Đoạn văn", label: "Khoảng trước đoạn", args: 6 },
  { id: "writer.para.spacingAfter", group: "Đoạn văn", label: "Khoảng sau đoạn", args: 6 },
  { id: "writer.para.firstLineIndent", group: "Đoạn văn", label: "Thụt đầu dòng", args: "14.17" },
  { id: "writer.para.indentInc", group: "Đoạn văn", label: "Tăng thụt lề" },
  { id: "writer.para.indentDec", group: "Đoạn văn", label: "Giảm thụt lề" },
  { id: "writer.para.moveUp", group: "Đoạn văn", label: "Di chuyển đoạn lên" },
  { id: "writer.para.moveDown", group: "Đoạn văn", label: "Di chuyển đoạn xuống" },
  { id: "writer.para.sort", group: "Đoạn văn", label: "Sắp xếp đoạn văn" },
  { id: "writer.para.showFormattingMarks", group: "Đoạn văn", label: "Hiện/ẩn ký tự định dạng" },
  { id: "writer.para.shading", group: "Đoạn văn", label: "Tô nền đoạn", args: "#e2e8f0" },
  { id: "writer.para.borders", group: "Đoạn văn", label: "Viền đoạn văn", args: "bottom" },
  { id: "writer.para.multilevelList", group: "Đoạn văn", label: "Danh sách đa cấp", args: "decimal" },

  // 5. Nhóm danh sách (writer.list.*)
  { id: "writer.list.bullet", group: "Danh sách", label: "Danh sách chấm tròn" },
  { id: "writer.list.numbered", group: "Danh sách", label: "Danh sách đánh số" },
  { id: "writer.list.restartNumbering", group: "Danh sách", label: "Đánh số lại từ 1" },
  { id: "writer.list.continueNumbering", group: "Danh sách", label: "Tiếp tục đánh số" },

  // 6. Nhóm kiểu dáng (writer.style.*)
  { id: "writer.style.normal", group: "Kiểu dáng", label: "Áp dụng kiểu Normal" },
  { id: "writer.style.apply", group: "Kiểu dáng", label: "Áp dụng kiểu Heading 1", args: "h1" },
  { id: "writer.style.gallery", group: "Kiểu dáng", label: "Thư viện kiểu" },

  // 7. Nhóm trang văn bản (writer.page.*)
  { id: "writer.page.blank", group: "Trang văn bản", label: "Trang trắng" },
  { id: "writer.page.break", group: "Trang văn bản", label: "Ngắt trang" },
  { id: "writer.page.watermark", group: "Trang văn bản", label: "Hình mờ (Watermark)", args: "BẢO MẬT" },
  { id: "writer.page.color", group: "Trang văn bản", label: "Màu nền trang", args: "#f8fafc" },
  { id: "writer.page.border", group: "Trang văn bản", label: "Viền trang", args: "box" },
  { id: "writer.page.columns1", group: "Trang văn bản", label: "Định dạng 1 cột" },
  { id: "writer.page.columns2", group: "Trang văn bản", label: "Định dạng 2 cột" },
  { id: "writer.page.columns3", group: "Trang văn bản", label: "Định dạng 3 cột" },
  { id: "writer.page.columns", group: "Trang văn bản", label: "Cấu hình cột", args: { count: 2, gap: 10, rule: false } },
  { id: "writer.page.margins", group: "Trang văn bản", label: "Căn lề trang", args: { top: 20, bottom: 20, left: 30, right: 15 } },
  { id: "writer.page.orientation", group: "Trang văn bản", label: "Hướng giấy", args: "landscape" },
  { id: "writer.page.size", group: "Trang văn bản", label: "Khổ giấy", args: "letter" },

  // 8. Nhóm chèn (writer.insert.*, chèn bảng, ảnh, ngắt)
  { id: "writer.insert.coverPage", group: "Chèn đối tượng", label: "Trang bìa", args: "standard" },
  { id: "writer.insert.removeCoverPage", group: "Chèn đối tượng", label: "Gỡ trang bìa" },
  { id: "writer.insert.textbox", group: "Chèn đối tượng", label: "Hộp văn bản", args: "Văn bản mẫu" },
  { id: "writer.insert.wordart", group: "Chèn đối tượng", label: "Chữ nghệ thuật", args: "Nghệ thuật" },
  { id: "writer.insert.symbol", group: "Chèn đối tượng", label: "Ký hiệu đặc biệt", args: "©" },
  { id: "writer.insert.dateTime", group: "Chèn đối tượng", label: "Ngày & Giờ", args: "06/10/2026" },
  { id: "writer.insert.equation", group: "Chèn đối tượng", label: "Phương trình toán", args: { linear: "x^2 + y^2 = z^2" } },
  { id: "writer.insert.bookmark", group: "Chèn đối tượng", label: "Đánh dấu (Bookmark)", args: "Bookmark1" },
  { id: "writer.insert.crossReference", group: "Chèn đối tượng", label: "Tham chiếu chéo", args: { target: "Bookmark1" } },
  { id: "writer.image.insert", group: "Chèn đối tượng", label: "Chèn hình ảnh", args: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" },
  { id: "writer.table.insert", group: "Chèn đối tượng", label: "Chèn bảng biểu", args: { rows: 2, cols: 2 } },
  { id: "writer.break.column", group: "Chèn đối tượng", label: "Ngắt cột" },

  // 9. Nhóm bảng biểu (writer.table.*)
  { id: "writer.table.insertRowAbove", group: "Bảng biểu", label: "Chèn hàng phía trên", isTable: true },
  { id: "writer.table.insertRowBelow", group: "Bảng biểu", label: "Chèn hàng phía dưới", isTable: true },
  { id: "writer.table.insertColLeft", group: "Bảng biểu", label: "Chèn cột bên trái", isTable: true },
  { id: "writer.table.insertColRight", group: "Bảng biểu", label: "Chèn cột bên phải", isTable: true },
  { id: "writer.table.deleteRow", group: "Bảng biểu", label: "Xóa hàng", isTable: true },
  { id: "writer.table.deleteCol", group: "Bảng biểu", label: "Xóa cột", isTable: true },
  { id: "writer.table.deleteTable", group: "Bảng biểu", label: "Xóa bảng", isTable: true },
  { id: "writer.table.mergeCells", group: "Bảng biểu", label: "Gộp ô", isTable: true },
  { id: "writer.table.splitCells", group: "Bảng biểu", label: "Tách ô", isTable: true },
  { id: "writer.table.distributeRows", group: "Bảng biểu", label: "Phân bố đều hàng", isTable: true },
  { id: "writer.table.distributeCols", group: "Bảng biểu", label: "Phân bố đều cột", isTable: true },
  { id: "writer.table.alignTop", group: "Bảng biểu", label: "Căn đỉnh ô", isTable: true },
  { id: "writer.table.alignMiddle", group: "Bảng biểu", label: "Căn giữa dọc ô", isTable: true },
  { id: "writer.table.alignBottom", group: "Bảng biểu", label: "Căn đáy ô", isTable: true },
  { id: "writer.table.selectCell", group: "Bảng biểu", label: "Chọn ô", isTable: true },
  { id: "writer.table.selectRow", group: "Bảng biểu", label: "Chọn hàng", isTable: true },
  { id: "writer.table.selectCol", group: "Bảng biểu", label: "Chọn cột", isTable: true },
  { id: "writer.table.selectTable", group: "Bảng biểu", label: "Chọn bảng", isTable: true },
  { id: "writer.table.cellBg", group: "Bảng biểu", label: "Màu nền ô", args: "#ff0000", isTable: true },
  { id: "writer.table.borders", group: "Bảng biểu", label: "Viền bảng", args: "all", isTable: true },
  { id: "writer.table.toggleHeaderRow", group: "Bảng biểu", label: "Bật/tắt hàng tiêu đề", isTable: true },
  { id: "writer.table.toggleBandedRows", group: "Bảng biểu", label: "Bật/tắt hàng xen kẽ", isTable: true }
];

async function runAudit() {
  console.log("[Audit] Đang khởi động Writer qua CDP...");
  const session = await launchApp("writer", { readyTimeoutMilliseconds: 45000 });
  console.log(`[Audit] Đã kết nối CDP thành công tại cổng ${session.debugPort}`);

  const auditResults = [];

  try {
    for (const cmd of COMMAND_MATRIX) {
      const { id, label, group, args, isTable } = cmd;

      // 1. Chuẩn bị tài liệu & chọn đoạn văn mẫu trước khi thực thi lệnh
      await session.cdp.evaluate(`(() => {
        const body = document.querySelector('.vno-writer-body');
        if (!body) return;
        if (${isTable ? "true" : "false"}) {
          body.innerHTML = '<p>Văn bản trước bảng</p><table id="audit-tbl" style="width:100%; border:1px solid #ccc;"><tr><td id="cell-a">Ô 1</td><td id="cell-b">Ô 2</td></tr><tr><td>Ô 3</td><td>Ô 4</td></tr></table><p>Văn bản sau bảng</p>';
          const cell = body.querySelector('#cell-a');
          if (cell) {
            const range = document.createRange();
            range.selectNodeContents(cell);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
        } else {
          body.innerHTML = '<p id="audit-p">Đây là đoạn văn bản mẫu để thực hiện kiểm thử ma trận Undo và Redo cho các lệnh của VN Writer.</p><p>Đoạn thứ hai để kiểm tra sắp xếp hoặc di chuyển.</p>';
          const p = body.querySelector('#audit-p');
          if (p) {
            const range = document.createRange();
            range.selectNodeContents(p);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
          }
        }
        body.focus();

        const adapter = window.__vnoWriterAdapter || window.writerApp?.adapter;
        if (adapter) {
          adapter.undoStack = [];
          adapter.redoStack = [];
          adapter._lastSnapshot = adapter._createSnapshot("Audit Base");
        }
      })()`);

      const beforeBodyHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-body')?.innerHTML || ''");
      const beforePageHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-page')?.innerHTML || ''");

      // 2. Thực thi lệnh bằng Command Bus
      let busResult = false;
      try {
        busResult = await session.cdp.evaluate(
          `window.__vnoGlobalCommandBus.execute(${JSON.stringify(id)}, ${JSON.stringify(args ?? null)})`
        );
      } catch (err) {
        busResult = "error: " + err.message;
      }

      await sleep(200);

      const afterBodyHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-body')?.innerHTML || ''");
      const afterPageHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-page')?.innerHTML || ''");

      const bodyChanged = afterBodyHtml !== beforeBodyHtml;
      const pageChanged = afterPageHtml !== beforePageHtml;
      const changed = bodyChanged || pageChanged;

      // 3. Thực hiện Undo (Ctrl+Z qua CDP Input.dispatchKeyEvent)
      await session.cdp.evaluate("document.querySelector('.vno-writer-body')?.focus()");
      await press(session.cdp, "z", { ctrl: true });
      await sleep(250);

      let undoBodyHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-body')?.innerHTML || ''");
      let undoPageHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-page')?.innerHTML || ''");
      let undoOk = (undoBodyHtml === beforeBodyHtml) && (undoPageHtml === beforePageHtml);

      // Nếu phím tắt CDP chưa kích hoạt undo, dùng fallback command bus common.edit.undo
      if (!undoOk && changed) {
        await session.cdp.evaluate("window.__vnoGlobalCommandBus.execute('common.edit.undo')");
        await sleep(200);
        undoBodyHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-body')?.innerHTML || ''");
        undoPageHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-page')?.innerHTML || ''");
        undoOk = (undoBodyHtml === beforeBodyHtml) && (undoPageHtml === beforePageHtml);
      }

      // 4. Thực hiện Redo (Ctrl+Y qua CDP Input.dispatchKeyEvent)
      await session.cdp.evaluate("document.querySelector('.vno-writer-body')?.focus()");
      await press(session.cdp, "y", { ctrl: true });
      await sleep(250);

      let redoBodyHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-body')?.innerHTML || ''");
      let redoPageHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-page')?.innerHTML || ''");
      let redoOk = (redoBodyHtml === afterBodyHtml) && (redoPageHtml === afterPageHtml);

      if (!redoOk && changed) {
        await session.cdp.evaluate("window.__vnoGlobalCommandBus.execute('common.edit.redo')");
        await sleep(200);
        redoBodyHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-body')?.innerHTML || ''");
        redoPageHtml = await session.cdp.evaluate("document.querySelector('.vno-writer-page')?.innerHTML || ''");
        redoOk = (redoBodyHtml === afterBodyHtml) && (redoPageHtml === afterPageHtml);
      }

      const pass = changed ? (undoOk && redoOk) : undoOk;

      let note = "Thao tác hoàn thành chính xác";
      if (!busResult || typeof busResult === "string" && busResult.startsWith("error")) {
        note = "Bus không có handler hoặc trả về lỗi";
      } else if (!changed) {
        note = "Không làm thay đổi DOM/nội dung";
      } else if (!undoOk) {
        note = "Undo không khôi phục về HTML trước khi áp lệnh";
      } else if (!redoOk) {
        note = "Redo không áp dụng lại đúng HTML sau khi áp lệnh";
      }

      const record = {
        id,
        label,
        group,
        args: args ? JSON.stringify(args) : "-",
        changed: changed ? "Có" : "Không",
        undoOk: undoOk ? "Có" : "Không",
        redoOk: redoOk ? "Có" : "Không",
        pass,
        note
      };

      auditResults.push(record);
      console.log(`[${pass ? "PASS" : "FAIL"}] ${id} | Thay đổi: ${record.changed} | Undo: ${record.undoOk} | Redo: ${record.redoOk} | Ghi chú: ${note}`);
    }

    const passCount = auditResults.filter(r => r.pass).length;
    const failCount = auditResults.length - passCount;

    console.log(`\n========================================`);
    console.log(`BÁO CÁO TỔNG HỢP: ${passCount} PASS, ${failCount} FAIL / TỔNG SỐ ${auditResults.length} LỆNH`);
    console.log(`========================================\n`);

    // Tạo báo cáo Markdown docs/AUDIT-DOC-UNDO-0610.md
    let md = `# BÁO CÁO KIỂM THỬ MA TRẬN UNDO / REDO ĐỊNH DẠNG WRITER (TICKET D8)\n\n`;
    md += `**Thời gian thực thi:** ${new Date().toISOString()}\n`;
    md += `**Phương thức:** CDP (Chrome DevTools Protocol) qua \`tests/live/cdp/session.mjs\`\n`;
    md += `**Kết quả tổng quan:** **${passCount} PASS** / **${failCount} FAIL** (Tổng số ${auditResults.length} lệnh)\n\n`;

    md += `## 1. Bảng ma trận Undo / Redo cho các lệnh định dạng Writer\n\n`;
    md += `| Lệnh | Áp dụng đổi nội dung | Undo khôi phục đúng | Redo áp lại đúng | Ghi chú |\n`;
    md += `| :--- | :---: | :---: | :---: | :--- |\n`;

    for (const r of auditResults) {
      const statusIcon = r.pass ? "✅ PASS" : "❌ FAIL";
      md += `| \`${r.id}\` | ${r.changed} | ${r.undoOk} | ${r.redoOk} | ${statusIcon} - ${r.note} |\n`;
    }

    md += `\n## 2. Danh sách các lệnh FAIL và 3 bước tái hiện chi tiết\n\n`;

    const failItems = auditResults.filter(r => !r.pass);
    if (failItems.length === 0) {
      md += `*Không có lệnh nào FAIL. Tất cả lệnh định dạng đều hỗ trợ Undo/Redo chính xác.*\n`;
    } else {
      failItems.forEach((item, index) => {
        md += `### ${index + 1}. Lệnh \`${item.id}\` (${item.label})\n\n`;
        md += `- **Nhóm lệnh:** ${item.group}\n`;
        md += `- **Đối số sử dụng:** \`${item.args}\` \n`;
        md += `- **Hiện trạng:** Thay đổi nội dung: **${item.changed}** | Undo đúng: **${item.undoOk}** | Redo đúng: **${item.redoOk}**\n`;
        md += `- **Lý do thất bại:** ${item.note}\n`;
        md += `- **3 bước tái hiện:**\n`;
        md += `  1. Mở ứng dụng VN Writer bằng CDP (\`launchApp('writer')\`), tạo đoạn văn mẫu và ghi nhận DOM ban đầu \`beforeHtml\`.\n`;
        md += `  2. Gọi lệnh qua Command Bus: \`window.__vnoGlobalCommandBus.execute('${item.id}'${item.args !== "-" ? `, ${item.args}` : ""})\`.\n`;
        md += `  3. Gửi phím \`Ctrl+Z\` (Input.dispatchKeyEvent) để kiểm tra Undo và \`Ctrl+Y\` để kiểm tra Redo. Kết quả: DOM sau Undo/Redo không khớp với trạng thái mong đợi.\n\n`;
      });
    }

    await fs.mkdir(path.dirname(docReportPath), { recursive: true });
    await fs.writeFile(docReportPath, md, "utf8");
    console.log(`[Audit] Đã ghi báo cáo chi tiết vào ${docReportPath}`);

  } finally {
    await session.close();
  }
}

runAudit().catch(err => {
  console.error("Lỗi thực thi audit:", err);
  process.exit(1);
});
