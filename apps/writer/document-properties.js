import { t } from "../../platform/i18n/i18n.js";

export const EMPTY_DOCUMENT_PROPERTIES = Object.freeze({
  title: "",
  creator: "",
  subject: "",
  keywords: "",
  description: "",
  contentStatus: ""
});

const PROPERTY_LIMITS = Object.freeze({
  title: 255,
  creator: 255,
  subject: 255,
  keywords: 1024,
  description: 4096,
  contentStatus: 255
});

function decodeXmlText(value) {
  return String(value || "")
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#([0-9]+);/g, (_match, code) => String.fromCodePoint(parseInt(code, 10)))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function readCoreProperty(xml, prefix, localName) {
  const match = String(xml || "").match(new RegExp(
    `<${prefix}:${localName}\\b[^>]*>([\\s\\S]*?)<\\/${prefix}:${localName}\\s*>`,
    "i"
  ));
  return match ? decodeXmlText(match[1].replace(/<[^>]*>/g, "")) : "";
}

export function normalizeDocumentProperties(properties = {}) {
  const normalized = {};
  for (const [key, limit] of Object.entries(PROPERTY_LIMITS)) {
    let val = String(properties?.[key] || "").replace(/\r\n?/g, "\n").slice(0, limit);
    if (key === "contentStatus") {
      val = val.trim();
    }
    normalized[key] = val;
  }
  return normalized;
}

export function parseCorePropertiesXml(xml) {
  return normalizeDocumentProperties({
    title: readCoreProperty(xml, "dc", "title"),
    creator: readCoreProperty(xml, "dc", "creator"),
    subject: readCoreProperty(xml, "dc", "subject"),
    keywords: readCoreProperty(xml, "cp", "keywords"),
    description: readCoreProperty(xml, "dc", "description"),
    contentStatus: readCoreProperty(xml, "cp", "contentStatus")
  });
}

export function documentPropertiesMarker(properties) {
  const json = JSON.stringify(normalizeDocumentProperties(properties));
  const bytes = new TextEncoder().encode(json);
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, "0")).join("");
  return `<!--vno-document-properties-hex:${hex}-->`;
}

export function showDocumentPropertiesDialog(initialProperties = {}) {
  if (typeof document === "undefined" || !document.body) return Promise.resolve(null);
  const initial = normalizeDocumentProperties(initialProperties);
  const previousFocused = document.activeElement;
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay vno-document-properties-overlay";
  overlay.innerHTML = `
    <div class="vno-dialog-box" style="width:560px;max-width:calc(100vw - 32px);" role="dialog" aria-modal="true" aria-labelledby="vno-document-properties-title">
      <div class="vno-dialog-header">
        <span id="vno-document-properties-title" style="font-weight:700;font-size:15px;">${t("writerDocumentProperties.dialogTitle")}</span>
        <button type="button" class="vno-btn vno-btn-icon-only vno-document-properties-close" title="${t("common.close")}" aria-label="${t("common.close")}">&times;</button>
      </div>
      <form class="vno-dialog-body vno-document-properties-form" style="display:grid;grid-template-columns:130px 1fr;gap:12px 14px;max-height:calc(100vh - 180px);overflow:auto;">
        <label for="vno-docprop-title">${t("writerDocumentProperties.title")}</label>
        <input id="vno-docprop-title" name="title" maxlength="255" autocomplete="off" />
        <label for="vno-docprop-creator">${t("writerDocumentProperties.creator")}</label>
        <input id="vno-docprop-creator" name="creator" maxlength="255" autocomplete="off" />
        <label for="vno-docprop-subject">${t("writerDocumentProperties.subject")}</label>
        <input id="vno-docprop-subject" name="subject" maxlength="255" autocomplete="off" />
        <label for="vno-docprop-keywords">${t("writerDocumentProperties.keywords")}</label>
        <input id="vno-docprop-keywords" name="keywords" maxlength="1024" autocomplete="off" aria-describedby="vno-docprop-keywords-hint" />
        <span></span><small id="vno-docprop-keywords-hint" style="color:var(--vno-text-muted);">${t("writerDocumentProperties.keywordsHint")}</small>
        <label for="vno-docprop-description">${t("writerDocumentProperties.description")}</label>
        <textarea id="vno-docprop-description" name="description" maxlength="4096" rows="5"></textarea>
      </form>
      <div class="vno-dialog-footer" style="display:flex;justify-content:flex-end;gap:8px;">
        <button type="button" class="vno-btn vno-document-properties-cancel">${t("common.cancel")}</button>
        <button type="button" class="vno-btn vno-btn-primary vno-document-properties-save">${t("common.ok")}</button>
      </div>
    </div>`;

  document.body.appendChild(overlay);
  const dialog = overlay.querySelector(".vno-dialog-box");
  const form = overlay.querySelector(".vno-document-properties-form");
  const EDITABLE_FIELDS = ["title", "creator", "subject", "keywords", "description"];
  for (const key of EDITABLE_FIELDS) {
    const el = form.elements.namedItem(key);
    if (el) el.value = initial[key] || "";
  }

  return new Promise(resolve => {
    let settled = false;
    const close = result => {
      if (settled) return;
      settled = true;
      document.removeEventListener("keydown", onKeyDown, true);
      overlay.remove();
      previousFocused?.focus?.();
      resolve(result);
    };
    const save = () => close(normalizeDocumentProperties({
      contentStatus: initial.contentStatus || "",
      ...Object.fromEntries(
        EDITABLE_FIELDS.map(key => [key, form.elements.namedItem(key)?.value || ""])
      )
    }));
    const onKeyDown = event => {
      if (event.key === "Escape") {
        event.preventDefault();
        close(null);
      } else if (event.key === "Enter" && event.target?.tagName !== "TEXTAREA") {
        event.preventDefault();
        save();
      } else if (event.key === "Tab") {
        const focusables = Array.from(dialog.querySelectorAll("button,input,textarea"));
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    overlay.querySelector(".vno-document-properties-save").addEventListener("click", save);
    overlay.querySelector(".vno-document-properties-cancel").addEventListener("click", () => close(null));
    overlay.querySelector(".vno-document-properties-close").addEventListener("click", () => close(null));
    overlay.addEventListener("click", event => { if (event.target === overlay) close(null); });
    document.addEventListener("keydown", onKeyDown, true);
    form.elements.namedItem("title").focus();
  });
}
