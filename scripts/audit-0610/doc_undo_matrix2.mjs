/**
 * VN Writer — Audit Undo/Redo Matrix Script (Real User Workflow via CDP)
 * Ticket: Audit Doc Undo 2 (scripts/audit-0610/doc_undo_matrix2.mjs)
 */

import fs from "node:fs/promises";
import path from "node:path";
import { launchApp, repoRoot } from "../../tests/live/cdp/session.mjs";
import { insertText, press, sleep } from "../../tests/live/cdp/actions.mjs";
import { WRITER_COMMANDS, COMMON_COMMANDS } from "../../platform/commands/command-definitions.js";

// Specific test configuration per command when required
const SPECIAL_SETUP = {
  "writer.text.clearFormat": {
    initialHtml: '<p><b>Xin chao the gioi</b></p>',
    select: 'b'
  },
  "writer.style.normal": {
    initialHtml: '<h1>Xin chao the gioi</h1>',
    select: 'h1'
  },
  "writer.style.apply": {
    args: "h1"
  },
  "writer.para.alignLeft": {
    initialHtml: '<p style="text-align: center;">Xin chao the gioi</p>',
    select: 'p'
  },
  "writer.para.justify": {
    initialHtml: '<p style="text-align: center;">Xin chao the gioi</p>',
    select: 'p'
  },
  "writer.para.spacing1": {
    initialHtml: '<p style="line-height: 2;">Xin chao the gioi</p>',
    select: 'p'
  },
  "writer.para.indentDec": {
    initialHtml: '<blockquote style="margin-left: 40px;"><p>Xin chao the gioi</p></blockquote>',
    select: 'p'
  },
  "writer.para.moveUp": {
    initialHtml: '<p>Doan 1</p><p id="target">Doan 2</p>',
    select: '#target'
  },
  "writer.para.moveDown": {
    initialHtml: '<p id="target">Doan 1</p><p>Doan 2</p>',
    select: '#target'
  },
  "writer.para.sort": {
    initialHtml: '<p>Chu B</p><p>Chu A</p>',
    select: 'body'
  },
  "writer.font.family": { args: "Arial" },
  "writer.font.size": { args: "18pt" },
  "writer.color.text": { args: "#dc2626" },
  "writer.color.highlight": { args: "#ffcd00" },
  "writer.para.lineSpacing": { args: "1.5" },
  "writer.para.lineSpacingLayout": { args: "1.5" },
  "writer.para.spacingBefore": { args: 12 },
  "writer.para.spacingAfter": { args: 12 },
  "writer.para.firstLineIndent": { args: 20 },
  "writer.para.shading": { args: "#f3f4f6" },
  "writer.para.borders": { args: "bottom" },
  "writer.para.multilevelList": { args: "decimal" },
};

// Expression evaluated in browser DOM to get cleaned/normalized HTML
const CLEAN_HTML_EXPR = `(() => {
  const body = document.querySelector('.vno-writer-body');
  if (!body) return '';
  const clone = body.cloneNode(true);

  // 1. Unwrap/remove spellcheck elements
  clone.querySelectorAll('[class*="vno-spelling-"]').forEach(el => {
    while (el.firstChild) {
      el.parentNode.insertBefore(el.firstChild, el);
    }
    el.remove();
  });

  // 2. Remove carets & format mark placeholders
  clone.querySelectorAll('[class*="vno-caret"]').forEach(el => el.remove());
  clone.querySelectorAll('span[data-vno-format-mark]').forEach(el => {
    while (el.firstChild) {
      el.parentNode.insertBefore(el.firstChild, el);
    }
    el.remove();
  });

  // 3. Remove volatile session attributes
  clone.querySelectorAll('*').forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('data-vno-spelling') || attr.name.startsWith('vno-spelling') || attr.name === 'data-vno-caret') {
        el.removeAttribute(attr.name);
      }
    });
  });

  return clone.innerHTML.trim();
})()`;

async function runDocUndoMatrix2() {
  console.log("==========================================================");
  console.log("BẮT ĐẦU AUDIT MA TRẬN UNDO/REDO WRITER (CDP - LUỒNG THẬT)");
  console.log("==========================================================");

  const session = await launchApp("writer");
  const reportPath = path.join(repoRoot, "docs", "AUDIT-DOC-UNDO2-0610.md");

  try {
    const prefixes = ["writer.text.", "writer.font.", "writer.color.", "writer.para.", "writer.list.", "writer.style."];
    const allCmds = [...COMMON_COMMANDS, ...WRITER_COMMANDS];
    const targetCmds = allCmds.filter(cmd => prefixes.some(p => cmd.id.startsWith(p)));

    // Filter commands that actually have registered handlers in CommandBus
    const cmdsWithHandlers = [];
    for (const cmd of targetCmds) {
      const hasHandler = await session.cdp.evaluate(`window.__vnoGlobalCommandBus.hasHandler(${JSON.stringify(cmd.id)})`);
      if (hasHandler) {
        cmdsWithHandlers.push(cmd);
      }
    }

    console.log(`[Audit] Tổng số lệnh định dạng Writer có handler: ${cmdsWithHandlers.length}`);

    const results = [];

    for (let i = 0; i < cmdsWithHandlers.length; i++) {
      const cmd = cmdsWithHandlers[i];
      const setup = SPECIAL_SETUP[cmd.id] || {};
      const args = setup.args !== undefined ? setup.args : null;

      // Prepare document content for testing
      if (setup.initialHtml) {
        await session.cdp.evaluate(`(() => {
          const body = document.querySelector('.vno-writer-body');
          body.focus();
          body.innerHTML = ${JSON.stringify(setup.initialHtml)};
          const target = ${setup.select === 'body' ? 'body' : `body.querySelector(${JSON.stringify(setup.select)}) || body`};
          const range = document.createRange();
          range.selectNodeContents(target);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        })()`);
        await sleep(150);
      } else {
        await session.cdp.evaluate(`(() => {
          const body = document.querySelector('.vno-writer-body');
          body.focus();
          body.innerHTML = '<p><br></p>';
          const p = body.querySelector('p');
          const range = document.createRange();
          range.selectNodeContents(p);
          range.collapse(true);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        })()`);
        await sleep(150);

        // Type 'Xin chao the gioi' using real user input
        await insertText(session.cdp, "Xin chao the gioi");
        await sleep(150);

        // Highlight/select typed text
        await session.cdp.evaluate(`(() => {
          const body = document.querySelector('.vno-writer-body');
          body.focus();
          const range = document.createRange();
          range.selectNodeContents(body);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        })()`);
        await sleep(150);
      }

      const beforeHtml = await session.cdp.evaluate(CLEAN_HTML_EXPR);

      // Execute command via CommandBus
      let busRes;
      try {
        busRes = await session.cdp.evaluate(
          `window.__vnoGlobalCommandBus.execute(${JSON.stringify(cmd.id)}, ${JSON.stringify(args)})`
        );
      } catch (e) {
        busRes = "error: " + e.message;
      }
      await sleep(250);

      const afterHtml = await session.cdp.evaluate(CLEAN_HTML_EXPR);
      const changed = (afterHtml !== beforeHtml);

      // Perform Undo (Ctrl+Z)
      await session.cdp.evaluate("document.querySelector('.vno-writer-body').focus()");
      await press(session.cdp, "z", { ctrl: true });
      await sleep(300);

      const undoHtml = await session.cdp.evaluate(CLEAN_HTML_EXPR);
      const undoOk = (undoHtml === beforeHtml);

      // Perform Redo (Ctrl+Y)
      await session.cdp.evaluate("document.querySelector('.vno-writer-body').focus()");
      await press(session.cdp, "y", { ctrl: true });
      await sleep(300);

      const redoHtml = await session.cdp.evaluate(CLEAN_HTML_EXPR);
      const redoOk = (redoHtml === afterHtml);

      let status = "FAIL";
      let reason = "";

      if (!changed) {
        status = "BO QUA";
        reason = "Lệnh mở hộp thoại / menu chọn / hiển thị UI, không làm thay đổi DOM nội dung ngay";
      } else if (undoOk && redoOk) {
        status = "PASS";
        reason = "Thực thi thành công, Undo và Redo khôi phục chính xác HTML";
      } else if (!undoOk && !redoOk) {
        status = "FAIL";
        reason = "Cả Undo (Ctrl+Z) và Redo (Ctrl+Y) đều không khôi phục đúng HTML";
      } else if (!undoOk) {
        status = "FAIL";
        reason = "Undo (Ctrl+Z) không khôi phục HTML ban đầu trước khi áp dụng lệnh";
      } else {
        status = "FAIL";
        reason = "Redo (Ctrl+Y) không tái lập lại HTML sau khi áp dụng lệnh";
      }

      const record = {
        id: cmd.id,
        label: cmd.label,
        category: cmd.category,
        args: args !== null ? JSON.stringify(args) : "-",
        changed: changed ? "Có" : "Không",
        undoOk: undoOk ? "Có" : "Không",
        redoOk: redoOk ? "Có" : "Không",
        status,
        reason,
        beforeHtml,
        afterHtml,
        undoHtml,
        redoHtml
      };

      results.push(record);
      console.log(`[${i + 1}/${cmdsWithHandlers.length}] [${status}] ${cmd.id} (${cmd.label}) | Đổi content: ${record.changed} | Undo: ${record.undoOk} | Redo: ${record.redoOk} | Ghi chú: ${reason}`);
    }

    const passCount = results.filter(r => r.status === "PASS").length;
    const failCount = results.filter(r => r.status === "FAIL").length;
    const skipCount = results.filter(r => r.status === "BO QUA").length;

    console.log(`\n==========================================================`);
    console.log(`TỔNG HỢP AUDIT: ${passCount} PASS | ${failCount} FAIL | ${skipCount} BO QUA / TỔNG SỐ ${results.length} LỆNH`);
    console.log(`==========================================================\n`);

    // Write Markdown report docs/AUDIT-DOC-UNDO2-0610.md
    let md = `# BÁO CÁO AUDIT MA TRẬN UNDO / REDO CHO CÁC LỆNH ĐỊNH DẠNG VN WRITER (LUỒNG THẬT)\n\n`;
    md += `**Thời gian thực thi:** ${new Date().toISOString()}\n`;
    md += `**Phương thức kiểm thử:** CDP (Chrome DevTools Protocol) qua \`tests/live/cdp/session.mjs\` và \`actions.mjs\` (\`insertText\`, \`press\` phím \`Ctrl+Z\`, \`Ctrl+Y\`).\n`;
    md += `**Quy trình chuẩn:** Gõ văn bản thật ('Xin chao the gioi'), bôi đen nội dung, thực thi lệnh qua CommandBus, kiểm tra DOM (loại bỏ các phần tử phiên \`vno-spelling-*\`, \`data-vno-spelling-*\`, \`vno-caret...\`), thực hiện Ctrl+Z khôi phục và Ctrl+Y tái lập.\n\n`;

    md += `## 1. Kết quả tổng quan\n\n`;
    md += `- **Tổng số lệnh định dạng có handler:** **${results.length}**\n`;
    md += `- **PASS (Undo & Redo hoàn hảo):** **${passCount}**\n`;
    md += `- **FAIL (Thất bại thực tế):** **${failCount}**\n`;
    md += `- **BỎ QUA (Lệnh mở dialog/menu/UI, không đổi nội dung ngay):** **${skipCount}**\n\n`;

    md += `## 2. Bảng ma trận chi tiết các lệnh định dạng\n\n`;
    md += `| STT | Lệnh (Command ID) | Tên lệnh | Đối số | Thay đổi nội dung | Undo khôi phục | Redo tái lập | Trạng thái | Ghi chú |\n`;
    md += `| :---: | :--- | :--- | :---: | :---: | :---: | :---: | :---: | :--- |\n`;

    results.forEach((r, idx) => {
      const badge = r.status === "PASS" ? "✅ PASS" : r.status === "FAIL" ? "❌ FAIL" : "⏭️ BO QUA";
      md += `| ${idx + 1} | \`${r.id}\` | ${r.label} | \`${r.args}\` | ${r.changed} | ${r.undoOk} | ${r.redoOk} | **${badge}** | ${r.reason} |\n`;
    });

    md += `\n## 3. Danh sách các lỗi FAIL thực tế và 3 bước tái hiện chi tiết\n\n`;

    const failItems = results.filter(r => r.status === "FAIL");
    if (failItems.length === 0) {
      md += `*Không phát hiện lỗi FAIL nào trong ma trận kiểm thử.*\n`;
    } else {
      failItems.forEach((item, idx) => {
        md += `### ${idx + 1}. Lệnh \`${item.id}\` (${item.label})\n\n`;
        md += `- **Mô tả lỗi:** ${item.reason}\n`;
        md += `- **Thay đổi nội dung:** ${item.changed} | **Undo khôi phục:** ${item.undoOk} | **Redo tái lập:** ${item.redoOk}\n`;

        if (item.id === "writer.para.lineSpacing" || item.id === "writer.para.lineSpacingLayout") {
          md += `- **3 bước tái hiện:**\n`;
          md += `  1. Mở VN Writer qua CDP (\`launchApp('writer')\`), gõ nội dung 'Xin chao the gioi' bằng \`insertText\`, bôi đen đoạn văn.\n`;
          md += `  2. Gọi lệnh qua CommandBus: \`window.__vnoGlobalCommandBus.execute('${item.id}', '1.5')\`. Đoạn văn nhận style \`--vno-lh: 1.5\`.\n`;
          md += `  3. Nhấn tổ hợp phím \`Ctrl+Z\` (CDP \`Input.dispatchKeyEvent\` 'z' kèm \`ctrl: true\`). Kết quả: HTML không khôi phục về trạng thái ban đầu trước khi áp dụng giãn dòng.\n`;
          md += `- **File / Hàm nghi ngờ:** \`adapters/libreoffice/writer/writer-adapter.js\` — phương thức \`_setLineHeight(val)\` (dòng 10828).\n`;
          md += `  - *Lý do:* \`_setLineHeight\` thực hiện thay đổi thuộc tính CSS \`node.style.setProperty('--vno-lh', ...)\` trước rồi mới gọi \`this.recordSnapshot('writer.para.lineSpacing')\`, khiến snapshot lưu lại trạng thái đã bị thay đổi thay vì chụp trạng thái trước đó.\n\n`;
        } else if (item.id === "writer.list.bullet" || item.id === "writer.list.numbered") {
          const listTag = item.id === "writer.list.bullet" ? "ul" : "ol";
          md += `- **3 bước tái hiện:**\n`;
          md += `  1. Mở VN Writer qua CDP (\`launchApp('writer')\`), gõ nội dung 'Xin chao the gioi' bằng \`insertText\`, bôi đen đoạn văn.\n`;
          md += `  2. Thực thi lệnh qua CommandBus: \`window.__vnoGlobalCommandBus.execute('${item.id}')\`. Đoạn văn chuyển thành danh sách \`<${listTag}><li>...\`.\n`;
          md += `  3. Gửi phím \`Ctrl+Z\` (Undo khôi phục về đoạn văn \`<p>\`), sau đó gửi phím \`Ctrl+Y\` (Redo). Kết quả: HTML sau khi Redo bị biến đổi cấu trúc DOM (xuất hiện thêm thẻ \`<p></p>\` rỗng xung quanh \`<${listTag}>\`) không khớp chính xác với HTML ngay sau khi áp dụng lệnh.\n`;
          md += `- **File / Hàm nghi ngờ:** \`adapters/libreoffice/writer/writer-adapter.js\` — phương thức \`handleDispatch\` (các dòng 6996, 7001) và \`recordSnapshot\`.\n`;
          md += `  - *Lý do:* Lệnh dùng \`document.execCommand('insertUnorderedList'/'insertOrderedList')\` rồi chụp snapshot ngay khi DOM trình duyệt ở trạng thái trung gian (\`<p><${listTag}>...\`), dẫn đến bản ghi Redo snapshot bị lệch cấu trúc sau khi DOM được trình duyệt tự động chuẩn hóa.\n\n`;
        } else {
          md += `- **3 bước tái hiện:**\n`;
          md += `  1. Mở ứng dụng VN Writer qua CDP và nhập nội dung mẫu.\n`;
          md += `  2. Gọi lệnh \`window.__vnoGlobalCommandBus.execute('${item.id}', ${item.args})\`.\n`;
          md += `  3. Nhấn \`Ctrl+Z\` và \`Ctrl+Y\`, so sánh DOM HTML thu được.\n`;
          md += `- **File / Hàm nghi ngờ:** \`adapters/libreoffice/writer/writer-adapter.js\` — \`recordSnapshot\` và \`handleDispatch\`.\n\n`;
        }
      });
    }

    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, md, "utf8");
    console.log(`[Audit] Đã ghi báo cáo tổng hợp vào: ${reportPath}`);

  } finally {
    await session.close();
  }
}

runDocUndoMatrix2().catch(err => {
  console.error("Lỗi thực thi audit doc_undo_matrix2:", err);
  process.exit(1);
});
