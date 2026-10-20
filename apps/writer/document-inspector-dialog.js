/**
 * Hộp thoại Kiểm tra tài liệu (Document Inspector) kiểu Writer.
 * Quét và hỗ trợ xóa độc lập 4 nhóm thông tin:
 * 1. Nhận xét và chú thích (Comments)
 * 2. Thay đổi theo dõi và bản sửa đổi (Tracked Changes)
 * 3. Văn bản ẩn (Hidden Text)
 * 4. Thuộc tính tài liệu và thông tin cá nhân (Document Properties & Personal Info)
 */

export const INSPECTOR_CATEGORIES = [
  {
    id: "comments",
    title: "Nhận xét và chú thích",
    description: "Nhận xét, ghi chú và các phản hồi trong tài liệu.",
    foundMessage: (count) => `Tìm thấy ${count} nhận xét/chú thích trong tài liệu.`,
    cleanMessage: "Không tìm thấy nhận xét hoặc chú thích nào.",
    removeButtonText: "Xóa tất cả"
  },
  {
    id: "trackChanges",
    title: "Theo dõi thay đổi và bản sửa đổi",
    description: "Các phần thêm mới hoặc xóa văn bản chưa được duyệt.",
    foundMessage: (count) => `Tìm thấy ${count} thay đổi chưa được duyệt.`,
    cleanMessage: "Không tìm thấy bản sửa đổi nào chưa duyệt.",
    removeButtonText: "Chấp nhận tất cả"
  },
  {
    id: "hiddenText",
    title: "Văn bản ẩn",
    description: "Văn bản được định dạng ẩn hoặc không hiển thị trên trang.",
    foundMessage: (count) => `Tìm thấy ${count} đoạn văn bản ẩn trong tài liệu.`,
    cleanMessage: "Không tìm thấy văn bản ẩn nào.",
    removeButtonText: "Xóa tất cả"
  },
  {
    id: "personalInfo",
    title: "Thuộc tính tài liệu và thông tin cá nhân",
    description: "Tên tác giả, người chỉnh sửa cuối, tiêu đề, chủ đề và các thuộc tính tệp.",
    foundMessage: (count) => `Tìm thấy thông tin thuộc tính tài liệu (${count} trường).`,
    cleanMessage: "Không tìm thấy thông tin cá nhân hoặc thuộc tính riêng.",
    removeButtonText: "Xóa tất cả"
  }
];

export function inspectDocument(adapter) {
  if (!adapter) {
    return {
      comments: { count: 0, found: false },
      trackChanges: { count: 0, found: false },
      hiddenText: { count: 0, found: false },
      personalInfo: { count: 0, found: false }
    };
  }

  adapter._initZones?.();

  // 1. Comments
  let commentCount = 0;
  const domComments = adapter.bodyDom?.querySelectorAll ? adapter.bodyDom.querySelectorAll(".vno-comment-anchor, [data-comment-id]").length : 0;
  const memComments = Array.isArray(adapter.comments) ? adapter.comments.length : 0;
  commentCount = Math.max(memComments, domComments);

  // 2. Track Changes
  let trackChangeCount = 0;
  if (typeof adapter._listTrackChanges === "function") {
    trackChangeCount = adapter._listTrackChanges().length;
  }
  if (!trackChangeCount && adapter.bodyDom?.querySelectorAll) {
    trackChangeCount = adapter.bodyDom.querySelectorAll('ins[data-vno-change="insert"], del[data-vno-change="delete"], .vno-track-insert, .vno-track-delete, [data-track="insert"], [data-track="delete"]').length;
  }

  // 3. Hidden Text
  let hiddenCount = 0;
  if (adapter.bodyDom?.querySelectorAll) {
    const hiddenEls = [
      ...adapter.bodyDom.querySelectorAll('[style*="display: none"]'),
      ...adapter.bodyDom.querySelectorAll('[style*="display:none"]'),
      ...adapter.bodyDom.querySelectorAll('[style*="visibility: hidden"]'),
      ...adapter.bodyDom.querySelectorAll('[style*="visibility:hidden"]'),
      ...adapter.bodyDom.querySelectorAll(".vno-hidden-text"),
      ...adapter.bodyDom.querySelectorAll('[data-vno-hidden="true"]')
    ];
    hiddenCount = new Set(hiddenEls).size;
  }

  // 4. Personal Information
  let personalCount = 0;
  const props = adapter.documentProperties || adapter.metadata;
  if (props && typeof props === "object") {
    const fields = ["author", "creator", "lastModifiedBy", "company", "manager", "title", "subject", "keywords", "description", "category", "comments"];
    for (const f of fields) {
      if (props[f] && String(props[f]).trim()) {
        personalCount++;
      }
    }
  }

  return {
    comments: { count: commentCount, found: commentCount > 0 },
    trackChanges: { count: trackChangeCount, found: trackChangeCount > 0 },
    hiddenText: { count: hiddenCount, found: hiddenCount > 0 },
    personalInfo: { count: personalCount, found: personalCount > 0 }
  };
}

export function removeDocumentCategory(adapter, categoryId) {
  if (!adapter) return 0;
  adapter._initZones?.();

  if (categoryId === "comments") {
    if (typeof adapter.deleteAllComments === "function") {
      return adapter.deleteAllComments();
    }
    const count = adapter.comments?.length || 0;
    adapter.comments = [];
    if (adapter.bodyDom?.querySelectorAll) {
      const anchors = adapter.bodyDom.querySelectorAll(".vno-comment-anchor, [data-comment-id]");
      for (const a of anchors) {
        if (typeof a.replaceWith === "function" && a.childNodes) a.replaceWith(...a.childNodes);
        else a.remove?.();
      }
    }
    adapter.activeCommentId = null;
    adapter.isDirty = true;
    adapter._renderCommentsPanel?.();
    return count;
  }

  if (categoryId === "trackChanges") {
    if (typeof adapter.acceptAllTrackChanges === "function") {
      adapter.acceptAllTrackChanges();
      return 1;
    }
    return 0;
  }

  if (categoryId === "hiddenText") {
    if (typeof adapter.deleteHiddenText === "function") {
      return adapter.deleteHiddenText();
    }
    if (adapter.bodyDom?.querySelectorAll) {
      const hiddenEls = [
        ...adapter.bodyDom.querySelectorAll('[style*="display: none"]'),
        ...adapter.bodyDom.querySelectorAll('[style*="display:none"]'),
        ...adapter.bodyDom.querySelectorAll('[style*="visibility: hidden"]'),
        ...adapter.bodyDom.querySelectorAll('[style*="visibility:hidden"]'),
        ...adapter.bodyDom.querySelectorAll(".vno-hidden-text"),
        ...adapter.bodyDom.querySelectorAll('[data-vno-hidden="true"]')
      ];
      const unique = [...new Set(hiddenEls)];
      for (const el of unique) el.remove?.();
      if (unique.length > 0) adapter.isDirty = true;
      return unique.length;
    }
    return 0;
  }

  if (categoryId === "personalInfo") {
    if (typeof adapter.deletePersonalInformation === "function") {
      return adapter.deletePersonalInformation();
    }
    let count = 0;
    const props = adapter.documentProperties;
    const fields = ["author", "creator", "lastModifiedBy", "company", "manager", "title", "subject", "keywords", "description", "category", "comments"];
    if (props && typeof props === "object") {
      for (const f of fields) {
        if (props[f]) {
          props[f] = "";
          count++;
        }
      }
    }
    if (adapter.metadata && typeof adapter.metadata === "object") {
      for (const f of fields) {
        if (adapter.metadata[f]) {
          adapter.metadata[f] = "";
          count++;
        }
      }
    }
    if (count > 0) adapter.isDirty = true;
    return count;
  }

  return 0;
}

export function showDocumentInspectorDialog({
  adapter,
  onClose = () => {}
} = {}) {
  if (typeof document === "undefined" || !document.body) return false;
  document.getElementById("vno-doc-inspector-dialog-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay vno-document-inspector-dialog vno-document-inspector-modal";
  overlay.id = "vno-doc-inspector-dialog-overlay";

  let inspectedState = null;

  function renderInitialView() {
    return `
      <section class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-doc-inspector-title" style="width:min(520px, calc(100vw - 32px));max-height:85vh;display:flex;flex-direction:column">
        <header class="vno-dialog-header">
          <strong id="vno-doc-inspector-title">Kiểm tra tài liệu</strong>
          <button type="button" class="vno-btn vno-btn-icon-only" data-close aria-label="Đóng">×</button>
        </header>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px;padding:16px 20px;overflow-y:auto">
          <p style="margin:0;font-size:13px;color:var(--vno-text-muted, #475569);line-height:1.5">
            Kiểm tra tài liệu để tìm các thông tin ẩn, nhận xét hoặc dữ liệu cá nhân trước khi chia sẻ.
          </p>
          <div style="display:flex;flex-direction:column;gap:12px;border:1px solid var(--vno-border-default, #e2e8f0);border-radius:6px;padding:12px">
            ${INSPECTOR_CATEGORIES.map(cat => `
              <div style="display:flex;flex-direction:column;gap:2px;border-bottom:1px solid var(--vno-border-subtle, #f1f5f9);padding-bottom:8px">
                <label style="display:flex;align-items:center;gap:8px;font-weight:600;font-size:13.5px;color:var(--vno-text-primary, #1e293b);cursor:pointer">
                  <input type="checkbox" id="vno-inspect-check-${cat.id}" checked style="cursor:pointer" />
                  <span>${cat.title}</span>
                </label>
                <span style="font-size:12px;color:var(--vno-text-muted, #64748b);padding-left:24px">${cat.description}</span>
              </div>
            `).join("")}
          </div>
        </div>
        <footer class="vno-dialog-footer" style="display:flex;justify-content:flex-end;gap:8px">
          <button type="button" class="vno-btn" data-close>Đóng</button>
          <button type="button" class="vno-btn vno-btn-primary" id="vno-inspect-btn">Kiểm tra</button>
        </footer>
      </section>
    `;
  }

  function renderResultsView() {
    return `
      <section class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-doc-inspector-title" style="width:min(560px, calc(100vw - 32px));max-height:85vh;display:flex;flex-direction:column">
        <header class="vno-dialog-header">
          <strong id="vno-doc-inspector-title">Kết quả kiểm tra tài liệu</strong>
          <button type="button" class="vno-btn vno-btn-icon-only" data-close aria-label="Đóng">×</button>
        </header>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px;padding:16px 20px;overflow-y:auto">
          <p style="margin:0;font-size:13px;color:var(--vno-text-muted, #475569);line-height:1.5">
            Xem lại kết quả kiểm tra bên dưới. Bạn có thể xóa riêng từng nhóm thông tin nếu không muốn chia sẻ.
          </p>
          <div style="display:flex;flex-direction:column;gap:10px" id="vno-inspect-results-list">
            ${INSPECTOR_CATEGORIES.map(cat => {
              const info = inspectedState?.[cat.id] || { count: 0, found: false };
              return `
                <div class="vno-inspect-item" data-category="${cat.id}" style="border:1px solid ${info.found ? "var(--vno-border-warning, #fca5a5)" : "var(--vno-border-default, #e2e8f0)"};border-radius:6px;padding:12px;display:flex;justify-content:space-between;align-items:flex-start;background:${info.found ? "rgba(239, 68, 68, 0.03)" : "transparent"}">
                  <div style="display:flex;flex-direction:column;gap:3px;flex:1;padding-right:12px">
                    <div style="display:flex;align-items:center;gap:6px">
                      <span style="font-size:15px">${info.found ? "⚠️" : "✅"}</span>
                       <strong style="font-size:13.5px;color:var(--vno-text-primary, #1e293b)">${cat.title}</strong>
                    </div>
                    <span style="font-size:12.5px;color:${info.found ? "#b91c1c" : "var(--vno-text-muted, #15803d)"};margin-left:22px">
                      ${info.found ? cat.foundMessage(info.count) : cat.cleanMessage}
                    </span>
                  </div>
                  ${info.found ? `
                    <button type="button" class="vno-btn vno-btn-danger vno-remove-category-btn" data-category="${cat.id}" style="font-size:12px;padding:4px 10px;white-space:nowrap;background:#ef4444;color:#ffffff;border:none;border-radius:4px;cursor:pointer">
                      ${cat.removeButtonText}
                    </button>
                  ` : ""}
                </div>
              `;
            }).join("")}
          </div>
        </div>
        <footer class="vno-dialog-footer" style="display:flex;justify-content:space-between;gap:8px">
          <button type="button" class="vno-btn" id="vno-reinspect-btn">Kiểm tra lại</button>
          <button type="button" class="vno-btn vno-btn-primary" data-close>Đóng</button>
        </footer>
      </section>
    `;
  }

  function bindEvents() {
    const close = () => {
      overlay.remove();
      onClose();
    };

    overlay.querySelectorAll("[data-close]").forEach(b => b.addEventListener("click", close));
    overlay.addEventListener("click", e => { if (e.target === overlay) close(); });

    const inspectBtn = overlay.querySelector("#vno-inspect-btn");
    if (inspectBtn) {
      inspectBtn.addEventListener("click", () => {
        inspectedState = inspectDocument(adapter);
        overlay.innerHTML = renderResultsView();
        bindEvents();
      });
    }

    const reinspectBtn = overlay.querySelector("#vno-reinspect-btn");
    if (reinspectBtn) {
      reinspectBtn.addEventListener("click", () => {
        inspectedState = inspectDocument(adapter);
        overlay.innerHTML = renderResultsView();
        bindEvents();
      });
    }

    const removeBtns = overlay.querySelectorAll(".vno-remove-category-btn");
    removeBtns.forEach(btn => {
      btn.addEventListener("click", () => {
        const catId = btn.getAttribute("data-category");
        removeDocumentCategory(adapter, catId);
        // Refresh inspection
        inspectedState = inspectDocument(adapter);
        overlay.innerHTML = renderResultsView();
        bindEvents();
      });
    });
  }

  overlay.innerHTML = renderInitialView();
  document.body.appendChild(overlay);
  bindEvents();

  overlay.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      overlay.remove();
      onClose();
    }
  });

  return overlay;
}
