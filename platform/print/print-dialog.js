import { chooseDefaultPrinter, getPrintErrorMessage, parsePageRange } from "./print-model.js";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"
  })[character]);
}

function selectedPages(state) {
  if (state.rangeMode === "current") return { pageRange: String(state.currentDocumentPage), pages: [state.currentDocumentPage] };
  if (state.rangeMode === "custom") return parsePageRange(state.rangeInput, state.totalPages);
  return { pageRange: "", pages: null };
}

/** Open the shared, document-backed print dialog. The engine is supplied by an adapter. */
export async function openPrintDialog({
  appKind,
  content,
  documentName = "Tài liệu",
  sourcePath = null,
  pageSetupLabel = "",
  currentPage = 1,
  engine
} = {}) {
  if (typeof document === "undefined") return false;

  const safeCurrentPage = Math.max(1, Number.isInteger(Number(currentPage)) ? Number(currentPage) : 1);
  const state = {
    rangeMode: "all",
    currentDocumentPage: safeCurrentPage,
    currentPreviewPage: safeCurrentPage,
    totalPages: 1,
    rangeInput: "",
    sessionId: "",
    printers: [],
    printing: false,
    closed: false
  };
  const overlay = document.createElement("div");
  overlay.className = "vno-print-dialog-overlay";
  overlay.innerHTML = `
    <section class="vno-print-dialog" role="dialog" aria-modal="true" aria-labelledby="vno-print-title" tabindex="-1">
      <header class="vno-print-dialog-header">
        <div><h2 id="vno-print-title">In tài liệu</h2><p>${escapeHtml(documentName)}</p></div>
        <button class="vno-print-close" type="button" aria-label="Đóng hộp thoại in" title="Đóng (Esc)">×</button>
      </header>
      <div class="vno-print-dialog-body">
        <form class="vno-print-options" novalidate>
          <label for="vno-print-printer">Máy in</label>
          <select id="vno-print-printer" name="printer" aria-describedby="vno-print-printer-help" disabled>
            <option value="">Đang tải danh sách máy in…</option>
          </select>
          <span id="vno-print-printer-help" class="vno-print-muted">Máy in mặc định được chọn sẵn.</span>

          <label for="vno-print-copies">Số bản</label>
          <input id="vno-print-copies" name="copies" type="number" min="1" max="999" value="1" inputmode="numeric">

          <fieldset class="vno-print-range">
            <legend>Phạm vi trang</legend>
            <label><input type="radio" name="rangeMode" value="all" checked> <span>Tất cả (${state.totalPages} trang)</span></label>
            <label><input type="radio" name="rangeMode" value="current"> <span>Trang hiện tại (${state.currentDocumentPage})</span></label>
            <label><input type="radio" name="rangeMode" value="custom"> <span>Trang từ–đến</span></label>
            <input id="vno-print-range-input" name="pageRange" type="text" autocomplete="off" placeholder="Ví dụ: 1-3,5" aria-label="Nhập trang cần in" disabled>
            <span class="vno-print-muted">Dùng dấu phẩy để chọn nhiều khoảng, ví dụ 1-3,5.</span>
          </fieldset>

          <div class="vno-print-page-setup" aria-label="Thiết lập trang">${escapeHtml(pageSetupLabel || "Thiết lập trang theo tài liệu")}</div>
          <p class="vno-print-dialog-status" role="status" aria-live="polite">Đang tạo bản xem trước từ tài liệu…</p>
          <div class="vno-print-dialog-actions">
            <button class="vno-print-cancel" type="button">Hủy</button>
            <button class="vno-print-submit" type="submit" disabled>In</button>
          </div>
        </form>
        <section class="vno-print-preview" aria-label="Xem trước các trang in">
          <div class="vno-print-preview-toolbar">
            <button type="button" class="vno-print-prev" aria-label="Trang trước" disabled>◀</button>
            <label>Trang <input class="vno-print-preview-page" type="number" min="1" value="1" aria-label="Số trang xem trước"> / <span class="vno-print-total">1</span></label>
            <button type="button" class="vno-print-next" aria-label="Trang sau" disabled>▶</button>
          </div>
          <div class="vno-print-preview-stage"><div class="vno-print-preview-loading">Đang dựng trang thật từ LibreOffice…</div></div>
        </section>
      </div>
    </section>`;
  document.body.appendChild(overlay);

  const dialog = overlay.querySelector(".vno-print-dialog");
  const form = overlay.querySelector(".vno-print-options");
  const printerSelect = overlay.querySelector("#vno-print-printer");
  const copiesInput = overlay.querySelector("#vno-print-copies");
  const rangeInput = overlay.querySelector("#vno-print-range-input");
  const status = overlay.querySelector(".vno-print-dialog-status");
  const submit = overlay.querySelector(".vno-print-submit");
  const previewPage = overlay.querySelector(".vno-print-preview-page");
  const previewTotal = overlay.querySelector(".vno-print-total");
  const previewStage = overlay.querySelector(".vno-print-preview-stage");
  const prevButton = overlay.querySelector(".vno-print-prev");
  const nextButton = overlay.querySelector(".vno-print-next");

  const close = async () => {
    if (state.closed) return;
    state.closed = true;
    overlay.remove();
    if (state.sessionId && engine?.cancelPrintDocument) {
      try { await engine.cancelPrintDocument(state.sessionId); } catch { /* temporary files expire with the app */ }
    }
  };
  overlay.querySelector(".vno-print-close").addEventListener("click", close);
  overlay.querySelector(".vno-print-cancel").addEventListener("click", close);
  overlay.addEventListener("click", (event) => { if (event.target === overlay) close(); });
  dialog.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = [...dialog.querySelectorAll("button:not(:disabled), input:not(:disabled), select:not(:disabled)")]
      .filter((element) => element.offsetParent !== null);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });

  const updatePreviewControls = () => {
    previewPage.value = String(state.currentPreviewPage);
    previewPage.max = String(state.totalPages);
    previewTotal.textContent = String(state.totalPages);
    prevButton.disabled = state.currentPreviewPage <= 1;
    nextButton.disabled = state.currentPreviewPage >= state.totalPages;
    overlay.querySelectorAll("input[name='rangeMode']").forEach((radio) => {
      const label = radio.parentElement.querySelector("span");
      if (radio.value === "all" && label) label.textContent = `Tất cả (${state.totalPages} trang)`;
      if (radio.value === "current" && label) label.textContent = `Trang hiện tại (${state.currentDocumentPage})`;
    });
  };

  const showPreviewPage = async (pageNumber) => {
    const page = Math.max(1, Math.min(state.totalPages, Number(pageNumber) || 1));
    state.currentPreviewPage = page;
    updatePreviewControls();
    previewStage.innerHTML = `<div class="vno-print-preview-loading">Đang tải trang ${page}…</div>`;
    try {
      const result = await engine.getPrintPreviewPage(state.sessionId, page);
      if (state.closed || state.currentPreviewPage !== page) return;
      if (result?.status !== "ok" || !result.dataUrl) throw new Error(result?.message || "Không tải được ảnh trang in.");
      const image = document.createElement("img");
      image.className = "vno-print-preview-image";
      image.alt = `Bản xem trước trang ${page} trên ${state.totalPages}`;
      image.src = result.dataUrl;
      previewStage.replaceChildren(image);
    } catch (error) {
      if (state.closed || state.currentPreviewPage !== page) return;
      previewStage.innerHTML = `<p class="vno-print-preview-error">${escapeHtml(getPrintErrorMessage(error))}</p>`;
    }
  };

  const validateOptions = () => {
    if (state.closed || state.printing) return;
    const copies = Number(copiesInput.value);
    try {
      selectedPages(state);
      if (!printerSelect.value) throw new Error("Hãy chọn một máy in trong danh sách.");
      if (!Number.isInteger(copies) || copies < 1 || copies > 999) throw new Error("Số bản phải từ 1 đến 999.");
      status.textContent = "Sẵn sàng in.";
      status.classList.remove("is-error");
      submit.disabled = false;
    } catch (error) {
      status.textContent = error.message;
      status.classList.add("is-error");
      submit.disabled = true;
    }
  };

  prevButton.addEventListener("click", () => showPreviewPage(state.currentPreviewPage - 1));
  nextButton.addEventListener("click", () => showPreviewPage(state.currentPreviewPage + 1));
  previewPage.addEventListener("change", () => showPreviewPage(previewPage.value));
  overlay.querySelectorAll("input[name='rangeMode']").forEach((radio) => radio.addEventListener("change", () => {
    state.rangeMode = radio.value;
    rangeInput.disabled = state.rangeMode !== "custom";
    if (state.rangeMode === "custom") rangeInput.focus();
    validateOptions();
  }));
  rangeInput.addEventListener("input", () => { state.rangeInput = rangeInput.value; validateOptions(); });
  copiesInput.addEventListener("input", validateOptions);
  printerSelect.addEventListener("change", validateOptions);

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.printing || submit.disabled) return;
    let range;
    try { range = selectedPages(state); }
    catch (error) { status.textContent = error.message; status.classList.add("is-error"); return; }
    state.printing = true;
    submit.disabled = true;
      printerSelect.disabled = true;
      copiesInput.disabled = true;
      rangeInput.disabled = true;
    status.classList.remove("is-error", "is-success");
    status.textContent = "Đang gửi tài liệu đến máy in…";
    submit.textContent = "Đang in…";
    try {
      const result = await engine.printDocument(state.sessionId, {
        printer: printerSelect.value,
        copies: Number(copiesInput.value),
        pageRange: range.pageRange
      });
      if (result?.status === "cancelled") {
        status.textContent = "Đã hủy thao tác lưu PDF.";
        state.printing = false;
        printerSelect.disabled = false;
        copiesInput.disabled = false;
        rangeInput.disabled = state.rangeMode !== "custom";
        submit.textContent = "In";
        submit.disabled = false;
        return;
      }
      if (result?.status !== "ok") throw new Error(result?.message || "Máy in không nhận được tài liệu.");
      status.textContent = result.path ? `Đã tạo PDF: ${result.path}` : "Đã gửi tài liệu đến hàng đợi máy in.";
      status.classList.add("is-success");
      submit.textContent = "In lại";
      state.printing = false;
      submit.disabled = false;
      printerSelect.disabled = false;
      copiesInput.disabled = false;
      rangeInput.disabled = state.rangeMode !== "custom";
    } catch (error) {
      status.textContent = getPrintErrorMessage(error);
      status.classList.add("is-error");
      state.printing = false;
      printerSelect.disabled = false;
      copiesInput.disabled = false;
      rangeInput.disabled = state.rangeMode !== "custom";
      submit.textContent = "Thử in lại";
      submit.disabled = !printerSelect.value;
    }
  });

  dialog.focus();
  overlay.querySelector(".vno-print-close").focus();
  try {
    if (!engine?.preparePrintDocument || !engine?.getInstalledPrinters) {
      throw new Error("Dịch vụ in chỉ khả dụng trong VN Office Desktop có LibreOffice.");
    }
    const [prepared, printerResult] = await Promise.all([
      engine.preparePrintDocument(appKind, content, documentName, sourcePath),
      engine.getInstalledPrinters()
    ]);
    if (state.closed) {
      if (prepared?.sessionId) await engine.cancelPrintDocument?.(prepared.sessionId);
      return false;
    }
    if (prepared?.status !== "ok") throw new Error(prepared?.message || "LibreOffice không tạo được bản xem trước.");
    state.sessionId = prepared.sessionId;
    state.totalPages = Math.max(1, Number(prepared.pageCount) || 1);
    state.currentDocumentPage = Math.min(state.currentDocumentPage, state.totalPages);
    state.currentPreviewPage = state.currentDocumentPage;
    if (printerResult?.status !== "ok") throw new Error(printerResult?.message || "Không đọc được danh sách máy in Windows.");
    state.printers = Array.isArray(printerResult.printers) ? printerResult.printers : [];
    printerSelect.replaceChildren();
    if (!state.printers.length) {
      printerSelect.add(new Option("Không tìm thấy máy in", ""));
      printerSelect.disabled = true;
    } else {
      for (const printer of state.printers) printerSelect.add(new Option(printer.name, printer.name));
      printerSelect.value = chooseDefaultPrinter(state.printers);
      printerSelect.disabled = false;
    }
    updatePreviewControls();
    validateOptions();
    await showPreviewPage(state.currentPreviewPage);
    return true;
  } catch (error) {
    status.textContent = getPrintErrorMessage(error);
    status.classList.add("is-error");
    previewStage.innerHTML = `<p class="vno-print-preview-error">${escapeHtml(getPrintErrorMessage(error))}</p>`;
    submit.disabled = true;
    return false;
  }
}
