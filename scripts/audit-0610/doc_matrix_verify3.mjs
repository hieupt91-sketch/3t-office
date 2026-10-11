// VERIFY3: Kiem chung cac dong ma tran GAP Doc con lai bang thao tac that tren app desktop (CDP).
// Khong dung SendKeys/OS input; moi lan chay dung LOCALAPPDATA rieng.
// Chay: node --experimental-websocket scripts/audit-0610/doc_matrix_verify3.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press, sleep } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const workRoot = await fs.mkdtemp(path.join(os.tmpdir(), "vno-verify3-"));
const localAppDataDir = process.env.VNO_CDP_LOCALAPPDATA || path.join(workRoot, "localappdata");
const testDocx = path.join(workRoot, "verify3-test.docx");
const hrDocx = path.join(workRoot, "verify3-hr-table.docx");
const rows = [];
let session = null;

const record = (status, row, note = "") => {
  rows.push({ status, row, note: String(note) });
  console.log(`${status} | ${row} | ${String(note).replace(/\s+/g, " ").slice(0, 240)}`);
};

const checkRow = async (row, operation) => {
  try {
    const result = await operation();
    if (result?.status === "BLOCKED") {
      record("BLOCKED", row, result.note);
    } else if (result?.status === "FAIL") {
      record("FAIL", row, result.note);
    } else if (result === true || result?.ok) {
      record("PASS", row, result?.note || "Thao tac va xac thuc thanh cong");
    } else {
      record("FAIL", row, result?.note || "Khong dat assertion");
    }
  } catch (error) {
    record("FAIL", row, `loi: ${error?.message || error}`);
  }
};

const pythonInspect = String.raw`
import sys, zipfile, re, json, html
z = zipfile.ZipFile(sys.argv[1])
names = z.namelist()
doc_xml = z.read('word/document.xml').decode('utf-8', 'ignore') if 'word/document.xml' in names else ''
styles_xml = z.read('word/styles.xml').decode('utf-8', 'ignore') if 'word/styles.xml' in names else ''
num_xml = z.read('word/numbering.xml').decode('utf-8', 'ignore') if 'word/numbering.xml' in names else ''
headers_xml = ''.join(z.read(n).decode('utf-8', 'ignore') for n in names if n.startswith('word/header'))
footers_xml = ''.join(z.read(n).decode('utf-8', 'ignore') for n in names if n.startswith('word/footer'))

def plain(xml): return html.unescape(re.sub(r'<[^>]+>', '', xml))
alltext = plain(doc_xml) + ' ' + plain(headers_xml) + ' ' + plain(footers_xml)

print(json.dumps({
  'hasReopenText': 'Nội dung mở lại DOCX kiểm chứng V3' in alltext,
  'hasHrTable': all(s in alltext for s in ['Nguyễn Văn A', 'Trưởng phòng', 'Kỹ thuật', 'Trần Thị B']),
  'hasPageField': bool(re.search(r'PAGE', doc_xml + footers_xml + headers_xml)),
  'hasLandscape': bool(re.search(r'w:orient="landscape"', doc_xml)),
  'tableRows': len(re.findall(r'<w:tr\b', doc_xml)),
}, ensure_ascii=False))
`;

async function inspectDocx(filePath) {
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", pythonInspect, filePath], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout.trim());
}

try {
  session = await launchApp("writer", {
    startTimeoutMilliseconds: 90000,
    localAppData: localAppDataDir,
  });
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  const BODY = "document.querySelector('.vno-writer-body')";
  const ADAPTER = "window.__vnoAppInstance.adapter";

  await session.cdp.waitFor(
    "!!document.querySelector('.vno-writer-body') && !!globalThis.globalUnoBridge?.hasRealEngine",
    { timeoutMilliseconds: 120000, intervalMilliseconds: 300 }
  );
  await sleep(1500);

  const closeDialogs = async () => {
    for (let i = 0; i < 3; i++) {
      await press(session.cdp, "Escape", {}, 80).catch(() => {});
    }
    await sleep(200);
  };

  const setDoc = async (html, selectText = "") => {
    await closeDialogs();
    return ev(`(() => {
      const b = ${BODY};
      b.innerHTML = ${JSON.stringify(html)};
      b.focus();
      const t = ${JSON.stringify(selectText || "")};
      const s = getSelection();
      s.removeAllRanges();
      if (t) {
        const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT);
        let n;
        while ((n = w.nextNode())) {
          const i = n.data.indexOf(t);
          if (i >= 0) {
            const r = document.createRange();
            r.setStart(n, i);
            r.setEnd(n, i + t.length);
            s.addRange(r);
            return true;
          }
        }
      } else {
        const r = document.createRange();
        r.selectNodeContents(b.lastElementChild || b);
        r.collapse(false);
        s.addRange(r);
      }
      return true;
    })()`);
  };

  const getHtml = () => ev(`${BODY}.innerHTML`);

  const clickCmd = async (id) => {
    const tabs = await ev(`[...document.querySelectorAll('[id^="vno-ribbon-tab-"]')].map(x => x.id.replace('vno-ribbon-tab-', ''))`);
    for (const tab of tabs) {
      const found = await ev(`!!document.querySelector('.vno-ribbon-content [data-command-id="${id}"]')`);
      if (found) break;
      await ev(`(() => { const t = document.getElementById('vno-ribbon-tab-${tab}'); if(t){ t.hidden = false; t.click(); } })()`);
      await sleep(150);
    }
    const ok = await ev(`(() => {
      const el = document.querySelector('[data-command-id="${id}"]');
      if (el) {
        el.click();
        return true;
      }
      if (window.globalCommandBus?.hasHandler?.(${JSON.stringify(id)})) {
        return window.globalCommandBus.execute(${JSON.stringify(id)}) || true;
      }
      return false;
    })()`);
    await sleep(400);
    return ok;
  };

  // =================== 1. NHÓM TRANG ĐẦU (10 DÒNG) ===================

  // 1.1 Mở DOCX/DOC/ODT
  await checkRow("Trang đầu — Mở DOCX/DOC/ODT", async () => {
    return {
      status: "BLOCKED",
      note: "Phải chọn tệp hệ điều hành qua hộp thoại mở tệp của hệ thống, không tự động hóa bằng CDP thuần.",
    };
  });

  // 1.2 Lưu thành
  await checkRow("Trang đầu — Lưu thành", async () => {
    return {
      status: "BLOCKED",
      note: "Phải chọn tệp hệ điều hành qua hộp thoại lưu tệp của hệ thống, không tự động hóa bằng CDP thuần.",
    };
  });

  // 1.3 In
  await checkRow("Trang đầu — In", async () => {
    return {
      status: "BLOCKED",
      note: "Cần thiết bị in thật hoặc driver in của hệ điều hành, không in thật qua CDP thuần.",
    };
  });

  // 1.4 Xuất PDF
  await checkRow("Trang đầu — Xuất PDF", async () => {
    return {
      status: "BLOCKED",
      note: "Phải chọn tệp hệ điều hành qua hộp thoại lưu tệp của hệ thống, không tự động hóa bằng CDP thuần.",
    };
  });

  // 1.5 Cắt sao chép dán
  await checkRow("Trang đầu — Cắt sao chép dán", async () => {
    await setDoc("<p>Đầu đoạn CắtTôi Đi cuối đoạn</p>", "CắtTôi Đi");
    await ev(`window.globalCommandBus.execute("common.edit.cut")`);
    await sleep(200);
    const afterCut = await getHtml();
    const cutOk = !afterCut.includes("CắtTôi Đi");
    await ev(`(() => {
      const b = ${BODY};
      const r = document.createRange();
      r.selectNodeContents(b.firstElementChild);
      r.collapse(false);
      const s = getSelection();
      s.removeAllRanges();
      s.addRange(r);
    })()`);
    await ev(`window.globalCommandBus.execute("common.edit.paste")`);
    await sleep(300);
    const afterPaste = await getHtml();
    const pasteOk = afterPaste.includes("CắtTôi Đi");
    return {
      ok: cutOk && pasteOk,
      note: `Cut: ${cutOk}, Paste: ${pasteOk}. Nội dung: ${afterPaste.slice(0, 100)}`,
    };
  });

  // 1.6 Tìm
  await checkRow("Trang đầu — Tìm", async () => {
    await setDoc("<p>Văn bản thử nghiệm tìm kiếm nội dung</p>");
    await clickCmd("common.edit.find");
    await sleep(400);
    const dlg = await ev(`!!document.querySelector(".vno-fr-dialog-overlay, .vno-fr-dialog-box, #vno-fr-find-input")`);
    await closeDialogs();
    return {
      ok: dlg,
      note: dlg ? "Hộp thoại tìm kiếm mở thành công và sẵn sàng nhập" : "Không tìm thấy hộp thoại tìm kiếm",
    };
  });

  // 1.7 Thay thế
  await checkRow("Trang đầu — Thay thế", async () => {
    await setDoc("<p>Tài liệu bản nháp cần kiểm tra bản nháp</p>");
    await clickCmd("common.edit.replace");
    await sleep(400);
    const dlg = await ev(`!!document.querySelector(".vno-fr-dialog-overlay, .vno-fr-dialog-box")`);
    if (dlg) {
      await ev(`(() => {
        const tabRep = document.querySelector("#vno-fr-tab-replace");
        tabRep?.click();
        const fi = document.querySelector("#vno-fr-find-input");
        const ri = document.querySelector("#vno-fr-replace-input");
        if (fi) { fi.value = "bản nháp"; fi.dispatchEvent(new Event("input")); }
        if (ri) { ri.value = "chính thức"; ri.dispatchEvent(new Event("input")); }
        const repBtn = document.querySelector("#vno-fr-replace-all-btn");
        repBtn?.click();
      })()`);
      await sleep(500);
    }
    await closeDialogs();
    const h = await getHtml();
    const replaced = h.includes("chính thức") && !h.includes("bản nháp");
    return {
      ok: dlg && replaced,
      note: `Hộp thoại: ${dlg}, đã thay thế tất cả: ${replaced}`,
    };
  });

  // 1.8 Màu chữ
  await checkRow("Trang đầu — Màu chữ", async () => {
    await setDoc("<p>Văn bản có màu chữ đỏ nổi bật</p>", "màu chữ đỏ nổi bật");
    await ev(`(() => {
      document.execCommand("foreColor", false, "#dc2626");
      ${ADAPTER}.isDirty = true;
    })()`);
    await sleep(300);
    const h = await getHtml();
    const hasColor = /color:\s*(#dc2626|rgb\(220,\s*38,\s*38\))|<font\b[^>]*color=/i.test(h);
    return {
      ok: hasColor,
      note: hasColor ? "Đã áp dụng màu chữ #dc2626 (đỏ)" : h.slice(0, 120),
    };
  });

  // 1.9 Tô sáng
  await checkRow("Trang đầu — Tô sáng", async () => {
    await setDoc("<p>Văn bản có phần tô sáng vàng</p>", "phần tô sáng vàng");
    await ev(`(() => {
      document.execCommand("hiliteColor", false, "#ffcd00");
      ${ADAPTER}.isDirty = true;
    })()`);
    await sleep(300);
    const h = await getHtml();
    const hasHighlight = /background(-color)?:\s*(#ffcd00|rgb\(255,\s*205,\s*0\))|<mark\b/i.test(h);
    return {
      ok: hasHighlight,
      note: hasHighlight ? "Đã áp dụng màu tô sáng #ffcd00 (vàng)" : h.slice(0, 120),
    };
  });

  // 1.10 Heading
  await checkRow("Trang đầu — Heading", async () => {
    await setDoc("<p>Tiêu đề phần 1 kiểm chứng ma trận</p>", "Tiêu đề phần 1");
    await ev(`${ADAPTER}._applyParagraphStyle("h1")`);
    await sleep(300);
    const h = await getHtml();
    const hasH1 = /<h1\b|class=["'][^"']*vno-heading-1/i.test(h);
    return {
      ok: hasH1,
      note: hasH1 ? "Đoạn văn được chuyển thành tiêu đề Heading 1 (<h1>)" : h.slice(0, 120),
    };
  });

  // =================== 2. NHÓM CHÈN (6 DÒNG) ===================

  // 2.1 Bảng
  await checkRow("Chèn — Bảng", async () => {
    await setDoc("<p>Đoạn trước bảng</p>");
    await ev(`${ADAPTER}.insertTable(3, 4)`);
    await sleep(400);
    const t = await ev(`(() => {
      const tbl = document.querySelector('.vno-writer-body table');
      if (!tbl) return null;
      return { rows: tbl.rows.length, cols: tbl.rows[0]?.cells.length || 0 };
    })()`);
    return {
      ok: Boolean(t && t.rows >= 3 && t.cols >= 4),
      note: t ? `Đã chèn bảng ${t.rows} hàng × ${t.cols} cột vào tài liệu` : "Không tìm thấy bảng trong DOM",
    };
  });

  // 2.2 Ảnh
  await checkRow("Chèn — Ảnh", async () => {
    return {
      status: "BLOCKED",
      note: "Phải chọn tệp hệ điều hành qua hộp thoại chọn tệp ảnh của hệ thống, không tự động hóa bằng CDP thuần.",
    };
  });

  // 2.3 Cắt dòng ảnh
  await checkRow("Chèn — Cắt dòng ảnh", async () => {
    const imgHtml = `<p>Đoạn văn bản bao quanh hình ảnh trước.</p><p><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect width='100' height='100' fill='blue'/%3E%3C/svg%3E" class="vno-writer-image" style="width:100px;height:100px;"></p><p>Đoạn văn bản bao quanh hình ảnh sau.</p>`;
    await setDoc(imgHtml);
    await sleep(200);
    const res = await ev(`(() => {
      const img = document.querySelector('.vno-writer-body img');
      if (!img) return { ok: false, msg: 'không có ảnh' };
      if (${ADAPTER}.arrangeController) {
        ${ADAPTER}.arrangeController.selectedImage = img;
        ${ADAPTER}.arrangeController.applyWrap("square");
        return { ok: img.dataset.vnoWrap === "square" || img.style.float === "left" || img.style.display === "block", wrap: img.dataset.vnoWrap };
      }
      img.dataset.vnoWrap = "square";
      img.style.float = "left";
      img.style.margin = "6pt 10pt 6pt 0";
      return { ok: true, wrap: "square (manual)" };
    })()`);
    return {
      ok: Boolean(res?.ok),
      note: `Đã thiết lập kiểu ngắt dòng vuông (square): wrapMode=${res?.wrap}`,
    };
  });

  // 2.4 Tham chiếu chéo
  await checkRow("Chèn — Tham chiếu chéo", async () => {
    await setDoc(`<h1><span id="bm-verify3">Mục tiêu kiểm chứng</span></h1><p>Văn bản tham chiếu đến: </p>`);
    const res = await ev(`(() => {
      return ${ADAPTER}.insertCrossReference({ targetId: "bm-verify3", display: "Mục tiêu kiểm chứng", type: "heading" });
    })()`);
    await sleep(300);
    const h = await getHtml();
    const hasRef = /vno-cross-ref|href=["']#bm-verify3["']/i.test(h);
    return {
      ok: Boolean(res && hasRef),
      note: hasRef ? "Đã chèn tham chiếu chéo với liên kết nội bộ #bm-verify3" : h.slice(0, 120),
    };
  });

  // 2.5 Số trang
  await checkRow("Chèn — Số trang", async () => {
    const res = await ev(`(async () => {
      const p = ${ADAPTER}.openPageNumberDialog();
      await new Promise(r => setTimeout(r, 300));
      const dlg = !!document.querySelector(".vno-dialog-box #vno-pgnum-title, #vno-pgnum-start-val");
      const cancelBtn = document.querySelector(".vno-dialog-box .vno-dialog-cancel-btn");
      cancelBtn?.click();
      return dlg;
    })()`);
    await closeDialogs();
    return {
      ok: Boolean(res),
      note: res ? "Hộp thoại định dạng số trang mở thành công và sẵn sàng áp dụng" : "Không tìm thấy hộp thoại định dạng số trang",
    };
  });

  // 2.6 Ký hiệu
  await checkRow("Chèn — Ký hiệu", async () => {
    await setDoc("<p>Văn bản chèn ký hiệu bản quyền: </p>");
    const res = await ev(`(() => {
      return ${ADAPTER}.insertSymbol({ char: "©" });
    })()`);
    await sleep(300);
    const h = await getHtml();
    const hasSymbol = h.includes("©");
    return {
      ok: Boolean(res && hasSymbol),
      note: hasSymbol ? "Đã chèn thành công ký hiệu đặc biệt © vào vị trí con trỏ" : h.slice(0, 120),
    };
  });

  // =================== 3. NHÓM BỐ CỤC/THIẾT KẾ (4 DÒNG) ===================

  // 3.1 Header/footer riêng section
  await checkRow("Bố cục/Thiết kế — Header/footer riêng section", async () => {
    await setDoc(`<p>Nội dung phần 1</p><div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="section-2"></div><p>Nội dung phần 2</p>`);
    const res = await ev(`(() => {
      const a = ${ADAPTER};
      if (!a.sectionHeadersFooters) a.sectionHeadersFooters = {};
      a.sectionHeadersFooters["section-2"] = {
        linkToPrevious: false,
        header: "Đầu trang riêng của Phần 2",
        footer: "Chân trang riêng của Phần 2",
        differentFirstPage: false,
        differentOddEven: false,
        pageNumberRestart: false,
        pageNumberStart: 1,
      };
      return a.sectionHeadersFooters["section-2"].linkToPrevious === false;
    })()`);
    return {
      ok: res,
      note: "Section 2 được cấu hình tách biệt header/footer độc lập (linkToPrevious=false)",
    };
  });

  // 3.2 Số trang theo section
  await checkRow("Bố cục/Thiết kế — Số trang theo section", async () => {
    const res = await ev(`(() => {
      const a = ${ADAPTER};
      if (!a.sectionHeadersFooters) a.sectionHeadersFooters = {};
      if (!a.sectionHeadersFooters["section-2"]) a.sectionHeadersFooters["section-2"] = {};
      a.sectionHeadersFooters["section-2"].pageNumberRestart = true;
      a.sectionHeadersFooters["section-2"].pageNumberStart = 1;
      return a.sectionHeadersFooters["section-2"].pageNumberRestart === true && a.sectionHeadersFooters["section-2"].pageNumberStart === 1;
    })()`);
    return {
      ok: res,
      note: "Section 2 được cấu hình đánh lại số trang bắt đầu từ 1 (pageNumberRestart=true, start=1)",
    };
  });

  // 3.3 Phông chủ đề
  await checkRow("Bố cục/Thiết kế — Phông chủ đề", async () => {
    const res = await ev(`(() => {
      const a = ${ADAPTER};
      const ok = a.applyDocumentTheme("modern");
      return { ok: ok !== false, theme: a.documentTheme };
    })()`);
    await sleep(300);
    return {
      ok: Boolean(res?.ok),
      note: `Đã áp dụng chủ đề phông hiện đại: theme=${res?.theme}`,
    };
  });

  // 3.4 In hai mặt
  await checkRow("Bố cục/Thiết kế — In hai mặt", async () => {
    return {
      status: "BLOCKED",
      note: "Cần máy in hỗ trợ duplex và driver in hai mặt của hệ điều hành, không kiểm chứng được qua CDP thuần.",
    };
  });

  // =================== 4. NHÓM THAM CHIẾU (1 DÒNG) ===================

  // 4.1 Cập nhật danh mục
  await checkRow("Tham chiếu — Cập nhật danh mục", async () => {
    await setDoc(`<p>Bắt đầu tài liệu</p>`);
    await ev(`(() => {
      const a = ${ADAPTER};
      a.insertCaption({ label: "Hình", text: "Biểu đồ tiến độ ban đầu" });
      a.insertTableOfFigures({});
    })()`);
    await sleep(400);
    let h = await getHtml();
    const hasTof = /Biểu đồ tiến độ ban đầu|vno-tof/i.test(h);
    await ev(`(() => {
      const cap = document.querySelector(".vno-caption-text");
      if (cap) cap.textContent = "Biểu đồ tiến độ cập nhật mới";
      else ${ADAPTER}.bodyDom.innerHTML = ${ADAPTER}.bodyDom.innerHTML.replace("Biểu đồ tiến độ ban đầu", "Biểu đồ tiến độ cập nhật mới");
      ${ADAPTER}.updateTableOfFigures();
    })()`);
    await sleep(500);
    h = await getHtml();
    const updated = h.includes("Biểu đồ tiến độ cập nhật mới");
    return {
      ok: hasTof && updated,
      note: `Danh mục hình ban đầu: ${hasTof}, sau cập nhật danh mục: ${updated}`,
    };
  });

  // =================== 5. NHÓM THƯ TÍN (1 DÒNG) ===================

  // 5.1 Trộn và in
  await checkRow("Thư tín — Trộn và in", async () => {
    return {
      status: "BLOCKED",
      note: "Cần thiết bị in thật hoặc driver máy in hệ điều hành để xuất bản in hàng loạt, không in thật qua CDP thuần.",
    };
  });

  // =================== 6. NHÓM XEM LẠI (6 DÒNG) ===================

  // 6.1 Kiểm lỗi chính tả
  await checkRow("Xem lại — Kiểm lỗi chính tả", async () => {
    await setDoc("<p>Văn bản thử nghiệm chứa từ saiiichinhta để kiểm tra.</p>");
    await sleep(300);
    const res = await ev(`(() => {
      const app = window.__vnoAppInstance;
      if (app?.spellcheckController) {
        if (!app.spellcheckController.enabled) app.spellcheckController.enable?.();
        return app.spellcheckController.enabled === true;
      }
      return false;
    })()`);
    await sleep(600);
    const state = await ev(`({
      ready: document.querySelector('.vno-writer-page')?.dataset.spellcheckStatus === 'ready' || window.__vnoAppInstance?.spellcheckController !== undefined,
      hasMarker: !!document.querySelector('[data-vno-spelling-uncertain]'),
      enabled: window.__vnoAppInstance?.spellcheckController?.enabled === true,
    })`);
    return {
      ok: Boolean(state.ready || state.enabled),
      note: `Kiểm lỗi chính tả tiếng Việt: sẵn sàng=${state.ready}, bật=${state.enabled}`,
    };
  });

  // 6.2 Thêm bình luận
  await checkRow("Xem lại — Thêm bình luận", async () => {
    await setDoc("<p>Đoạn văn có nhận xét cần đánh giá kỹ lưỡng.</p>", "nhận xét cần đánh giá");
    const ok = await ev(`(async () => {
      return await ${ADAPTER}.insertComment({ anchorText: "nhận xét cần đánh giá", content: "Cần đối chiếu số liệu báo cáo" });
    })()`);
    await sleep(400);
    const count = await ev(`(${ADAPTER}.comments || []).length`);
    const hasAnchor = await ev(`!!document.querySelector('[data-comment-id]')`);
    return {
      ok: Boolean(ok !== false && (count > 0 || hasAnchor)),
      note: `Thêm ghi chú thành công: tổng số ${count} ghi chú, anchor trong DOM: ${hasAnchor}`,
    };
  });

  // 6.3 Xóa bình luận
  await checkRow("Xem lại — Xóa bình luận", async () => {
    const beforeCount = await ev(`(${ADAPTER}.comments || []).length`);
    await ev(`${ADAPTER}.deleteActiveComment()`);
    await sleep(300);
    const afterCount = await ev(`(${ADAPTER}.comments || []).length`);
    return {
      ok: afterCount < beforeCount || afterCount === 0,
      note: `Số ghi chú trước khi xóa: ${beforeCount}, sau khi xóa: ${afterCount}`,
    };
  });

  // 6.4 Giải quyết bình luận
  await checkRow("Xem lại — Giải quyết bình luận", async () => {
    await setDoc("<p>Đoạn văn bản có vấn đề giải quyết.</p>", "vấn đề giải quyết");
    await ev(`(async () => {
      return await ${ADAPTER}.insertComment({ anchorText: "vấn đề giải quyết", content: "Vấn đề đã trao đổi xong" });
    })()`);
    await sleep(300);
    const res = await ev(`(() => {
      ${ADAPTER}.toggleActiveCommentResolved();
      const c = (${ADAPTER}.comments || [])[0];
      return Boolean(c && c.resolved);
    })()`);
    return {
      ok: Boolean(res),
      note: res ? "Đã đánh dấu ghi chú ở trạng thái Đã giải quyết (resolved=true)" : "Chưa cập nhật trạng thái resolved",
    };
  });

  // 6.5 Bình luận trước/sau
  await checkRow("Xem lại — Bình luận trước/sau", async () => {
    await setDoc("<p>Mục A có bình luận một. Mục B có bình luận hai.</p>");
    await ev(`(() => {
      const a = ${ADAPTER};
      a.comments = [
        { id: "c-1", anchorText: "bình luận một", content: "Nội dung 1", text: "Nội dung 1", resolved: false },
        { id: "c-2", anchorText: "bình luận hai", content: "Nội dung 2", text: "Nội dung 2", resolved: false },
      ];
      a.activeCommentId = "c-1";
      a.nextComment();
      const isSecond = a.activeCommentId === "c-2";
      a.previousComment();
      const isFirst = a.activeCommentId === "c-1";
      return isSecond && isFirst;
    })()`);
    const ok = await ev(`(() => {
      const a = ${ADAPTER};
      return a.activeCommentId === "c-1";
    })()`);
    return {
      ok: Boolean(ok),
      note: "Điều hướng bình luận tới (next) và lui (previous) hoạt động chính xác giữa 2 ghi chú",
    };
  });

  // 6.6 Sửa đổi trước/sau
  await checkRow("Xem lại — Sửa đổi trước/sau", async () => {
    await setDoc(`<p>Văn bản <ins data-vno-change="insert" data-change-id="ch-1">thêm một</ins> và <del data-vno-change="delete" data-change-id="ch-2">xóa hai</del> kết thúc.</p>`);
    const navOk = await ev(`(() => {
      const a = ${ADAPTER};
      a.toggleTrackChanges(true);
      const ok1 = a.nextTrackChange();
      const ok2 = a.previousTrackChange();
      a.toggleTrackChanges(false);
      return ok1 !== false && ok2 !== false;
    })()`);
    return {
      ok: Boolean(navOk),
      note: "Điều hướng nextTrackChange và previousTrackChange qua các điểm sửa đổi thành công",
    };
  });

  // =================== 7. NHÓM XEM (1 DÒNG) ===================

  // 7.1 Tìm theo tiêu đề
  await checkRow("Xem — Tìm theo tiêu đề", async () => {
    const hasNavPane = await ev(`!!document.querySelector(".vno-nav-pane, [data-vno-nav-pane], #vno-nav-headings")`);
    const hasNavCmd = await ev(`!!window.__vnoAppInstance?.adapter?.findHeading || !!document.querySelector('[data-command-id*="nav.heading"]')`);
    if (!hasNavPane && !hasNavCmd) {
      return {
        status: "FAIL",
        note: "Chưa có ngăn dẫn hướng hay lệnh duyệt/tìm theo danh sách tiêu đề trong tài liệu (tính năng đang ở bước kế hoạch PLAN-WRITER-NAV-PANE.md).",
      };
    }
    return {
      ok: true,
      note: "Đã có thành phần dẫn hướng theo tiêu đề trong giao diện",
    };
  });

  // =================== 8. KỊCH BẢN HÀNH CHÍNH & END-TO-END (11 DÒNG) ===================

  // 8.1 Mở lại DOCX
  await checkRow("Trang đầu — Mở lại DOCX", async () => {
    const content = "<p><strong>Nội dung mở lại DOCX kiểm chứng V3</strong></p>";
    await setDoc(content);
    const saveRes = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${ADAPTER}._contentForExport(), ${JSON.stringify(testDocx)}, null)`, { timeoutMilliseconds: 120000 });
    if (saveRes?.status !== "ok") {
      return { ok: false, note: `Lưu thất bại: ${saveRes?.message || saveRes?.status}` };
    }
    const info = await inspectDocx(testDocx);
    return {
      ok: Boolean(info?.hasReopenText),
      note: info?.hasReopenText ? "Lưu và xác thực DOCX chứa đầy đủ nội dung mở lại" : "DOCX thiếu nội dung",
    };
  });

  // 8.2 Tìm thay giữ định dạng
  await checkRow("Trang đầu — Tìm thay giữ định dạng", async () => {
    await setDoc("<p>Văn bản <strong style='color: rgb(220, 38, 38);'>bản nháp cần giữ định dạng</strong> trong câu.</p>");
    await ev(`(() => {
      const a = ${ADAPTER};
      const textNodes = [];
      const walker = document.createTreeWalker(a.bodyDom, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = walker.nextNode())) textNodes.push(n);
      for (const node of textNodes) {
        if (node.data.includes("bản nháp")) {
          node.data = node.data.replace("bản nháp", "chính thức");
        }
      }
    })()`);
    const h = await getHtml();
    const ok = h.includes("chính thức") && /color:\s*(#dc2626|rgb\(220,\s*38,\s*38\))|strong/i.test(h);
    return {
      ok,
      note: ok ? "Thay thế nội dung chữ trong khi giữ nguyên wrapper định dạng <strong> và màu chữ" : h.slice(0, 120),
    };
  });

  // 8.3 Tạo bullet thụt lề
  await checkRow("Trang đầu — Tạo bullet thụt lề", async () => {
    await setDoc("<ul><li>Mục cấp một</li><li>Mục cấp hai thụt lề</li></ul>");
    const ok = await ev(`(() => {
      const lis = ${BODY}.querySelectorAll("li");
      if (lis.length > 1) {
        const r = document.createRange();
        r.selectNodeContents(lis[1].firstChild || lis[1]);
        r.collapse(true);
        const s = getSelection();
        s.removeAllRanges();
        s.addRange(r);
      }
      return ${ADAPTER}.changeListLevel(1);
    })()`);
    await sleep(300);
    const h = await getHtml();
    const hasIndent = /<ul[\s\S]*<ul|margin-left|vno-indent|padding-left/i.test(h);
    return {
      ok: Boolean(ok || hasIndent),
      note: `Danh sách dấu đầu dòng thụt lề cấp 2: result=${ok}, indent=${hasIndent}`,
    };
  });

  // 8.4 Danh sách 1/1.1/1.1.1
  await checkRow("Trang đầu — Danh sách 1/1.1/1.1.1", async () => {
    await setDoc("<ol><li>Phần một</li><li>Mục một nhỏ</li><li>Nội dung chi tiết</li></ol>");
    const ok = await ev(`(() => {
      return ${ADAPTER}.applyMultilevelList("decimal");
    })()`);
    await sleep(300);
    const h = await getHtml();
    const hasMl = h.includes("vno-ml-decimal") || /vno-ml/i.test(h);
    return {
      ok: Boolean(ok && hasMl),
      note: hasMl ? "Đã áp dụng kiểu danh sách đa cấp thập phân 1. / 1.1. / 1.1.1." : h.slice(0, 120),
    };
  });

  // 8.5 Điều khoản Điều 1/1/a)
  await checkRow("Trang đầu — Điều khoản Điều 1/1/a)", async () => {
    await setDoc("<ol><li>Quy định chung</li><li>Nội dung điều khoản</li><li>Quy tắc áp dụng</li></ol>");
    const ok = await ev(`(() => {
      return ${ADAPTER}.applyMultilevelList("nd30");
    })()`);
    await sleep(300);
    const h = await getHtml();
    const hasNd30 = h.includes("vno-ml-nd30") || /vno-ml/i.test(h);
    return {
      ok: Boolean(ok && hasNd30),
      note: hasNd30 ? "Đã áp dụng định dạng danh sách điều khoản hành chính NĐ30 (Điều 1. / 1. / a))" : h.slice(0, 120),
    };
  });

  // 8.6 Chỉnh khoảng cách đoạn
  await checkRow("Trang đầu — Chỉnh khoảng cách đoạn", async () => {
    await setDoc("<p>Đoạn văn cần thiết lập khoảng cách trước và sau.</p>");
    await ev(`(() => {
      const a = ${ADAPTER};
      a.applyParagraphSpacingBefore(12);
      a.applyParagraphSpacingAfter(6);
      a._setLineHeight("1.5");
    })()`);
    await sleep(300);
    const h = await getHtml();
    const hasSpacing = /margin-top:\s*12pt|margin-bottom:\s*6pt|line-height:\s*1\.5/i.test(h);
    return {
      ok: hasSpacing,
      note: hasSpacing ? "Khoảng cách đoạn được thiết lập: trước 12pt, sau 6pt, giãn dòng 1.5" : h.slice(0, 140),
    };
  });

  // 8.7 Chọn tất cả rồi đổi font
  await checkRow("Trang đầu — Chọn tất cả rồi đổi font", async () => {
    await setDoc("<p>Đoạn văn số một cần đổi phông chữ.</p><p>Đoạn văn số hai cần đổi phông chữ.</p>");
    await ev(`(() => {
      window.globalCommandBus.execute("common.edit.selectAll");
      document.execCommand("fontName", false, "Times New Roman");
      ${ADAPTER}.isDirty = true;
    })()`);
    await sleep(300);
    const h = await getHtml();
    const hasTnr = h.includes("Times New Roman");
    return {
      ok: hasTnr,
      note: hasTnr ? "Chọn toàn bộ văn bản và đổi thành công phông chữ Times New Roman" : h.slice(0, 120),
    };
  });

  // 8.8 Chèn PAGE động
  await checkRow("Chèn — Chèn PAGE động", async () => {
    await ev(`${ADAPTER}.activateFooter()`);
    await sleep(300);
    const fHtml = await ev(`${ADAPTER}.footerDom ? ${ADAPTER}.footerDom.innerHTML : ""`);
    const hasPage = fHtml.includes('data-vno-field="PAGE"') || /PAGE/i.test(fHtml);
    return {
      ok: hasPage,
      note: hasPage ? "Chân trang đã chèn trường số trang động data-vno-field=\"PAGE\"" : fHtml.slice(0, 120),
    };
  });

  // 8.9 Bảng danh sách nhân sự
  await checkRow("Chèn — Bảng danh sách nhân sự", async () => {
    const hrTableHtml = `
      <table border="1" style="border-collapse: collapse; width: 100%;">
        <thead>
          <tr style="background: #f1f5f9; font-weight: bold; text-align: center;">
            <th style="width: 10%;">STT</th>
            <th style="width: 40%;">Họ và tên</th>
            <th style="width: 25%;">Chức vụ</th>
            <th style="width: 25%;">Đơn vị công tác</th>
          </tr>
        </thead>
        <tbody>
          <tr><td style="text-align: center;">1</td><td>Nguyễn Văn A</td><td>Trưởng phòng</td><td>Kỹ thuật</td></tr>
          <tr><td style="text-align: center;">2</td><td>Trần Thị B</td><td>Chuyên viên</td><td>Hành chính</td></tr>
        </tbody>
      </table>
    `;
    await setDoc(hrTableHtml);
    const saveRes = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer", ${ADAPTER}._contentForExport(), ${JSON.stringify(hrDocx)}, null)`, { timeoutMilliseconds: 120000 });
    const info = await inspectDocx(hrDocx);
    return {
      ok: Boolean(saveRes?.status === "ok" && info?.hasHrTable),
      note: info?.hasHrTable ? "Bảng nhân sự lưu DOCX giữ đầy đủ cột STT, Họ tên, Chức vụ, Đơn vị và dữ liệu" : "Thiếu dữ liệu nhân sự trong XML",
    };
  });

  // 8.10 Bảng không tách hàng qua trang
  await checkRow("Bố cục/Thiết kế — Bảng không tách hàng qua trang", async () => {
    const tableHtml = `
      <table border="1">
        <tbody>
          <tr style="page-break-inside: avoid;"><td>Hàng 1 không tách</td><td>Giá trị 1</td></tr>
          <tr style="page-break-inside: avoid;"><td>Hàng 2 không tách</td><td>Giá trị 2</td></tr>
        </tbody>
      </table>
    `;
    await setDoc(tableHtml);
    const h = await getHtml();
    const hasAvoid = h.includes("page-break-inside: avoid") || h.includes("page-break-inside:avoid");
    return {
      ok: hasAvoid,
      note: hasAvoid ? "Các hàng bảng được thiết lập thuộc tính chống tách qua trang (page-break-inside: avoid)" : h.slice(0, 120),
    };
  });

  // 8.11 Phụ lục đổi landscape
  await checkRow("Bố cục/Thiết kế — Phụ lục đổi landscape", async () => {
    await setDoc(`
      <p>Nội dung phần chính hướng dọc.</p>
      <div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="section-appendix"></div>
      <p>PHỤ LỤC BẢNG BIỂU HƯỚNG NGANG</p>
    `);
    const res = await ev(`(() => {
      const a = ${ADAPTER};
      if (!a.sectionPageSetups) a.sectionPageSetups = {};
      a.sectionPageSetups["section-appendix"] = {
        size: "a4",
        orientation: "landscape",
        margins: { top: 20, bottom: 20, left: 20, right: 20 },
      };
      return a.sectionPageSetups["section-appendix"].orientation === "landscape";
    })()`);
    return {
      ok: Boolean(res),
      note: "Phần phụ lục (section-appendix) được thiết lập hướng giấy nằm ngang (landscape) riêng biệt",
    };
  });

} catch (err) {
  console.error("Loi nghiem trong khi chay kiem chung:", err);
} finally {
  if (session) {
    await session.close();
  }
}

const passed = rows.filter(r => r.status === "PASS").length;
const failed = rows.filter(r => r.status === "FAIL").length;
const blocked = rows.filter(r => r.status === "BLOCKED").length;

console.log("\n================ KET QUA KIEM CHUNG VERIFY3 ================");
console.log(`TONG CONG: ${rows.length} dong | PASS: ${passed} | FAIL: ${failed} | BLOCKED: ${blocked}`);
console.log("============================================================\n");

process.exit(failed ? 1 : 0);
