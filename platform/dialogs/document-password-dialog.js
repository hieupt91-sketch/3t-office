import { t } from "../i18n/i18n.js";

/** Shared modal for setting or entering a document open password. */
export function showDocumentPasswordDialog({ mode = "set", error = "" } = {}) {
  if (typeof document === "undefined" || !document.body) return Promise.resolve(null);
  const setting = mode === "set";
  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay vno-document-password-overlay";
  overlay.innerHTML = `
    <section class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-password-title" style="width:min(460px, calc(100vw - 32px));">
      <header class="vno-dialog-header"><strong id="vno-password-title">${t(setting ? "documentPassword.setTitle" : "documentPassword.openTitle")}</strong></header>
      <div class="vno-dialog-body" style="display:grid;gap:12px;">
        ${setting ? `<p>${t("documentPassword.warning")}</p>` : ""}
        <label>${t("documentPassword.password")}<input class="vno-password-first" type="password" maxlength="255" autocomplete="new-password" /></label>
        ${setting ? `<label>${t("documentPassword.confirm")}<input class="vno-password-confirm" type="password" maxlength="255" autocomplete="new-password" /></label>` : ""}
        <p class="vno-password-error" role="alert" style="color:var(--vno-danger,#b91c1c);margin:0;">${error ? t("documentPassword.wrongPassword") : ""}</p>
      </div>
      <footer class="vno-dialog-footer">
        <button type="button" class="vno-btn vno-password-cancel">${t("documentPassword.cancel")}</button>
        <button type="button" class="vno-btn vno-btn-primary vno-password-submit">${t(setting ? "documentPassword.apply" : "documentPassword.open")}</button>
      </footer>
    </section>`;
  document.body.appendChild(overlay);
  const first = overlay.querySelector(".vno-password-first");
  const confirm = overlay.querySelector(".vno-password-confirm");
  const message = overlay.querySelector(".vno-password-error");
  return new Promise(resolve => {
    const finish = value => { overlay.remove(); resolve(value); };
    const submit = () => {
      const password = first.value;
      if (setting && password !== confirm.value) {
        message.textContent = t("documentPassword.mismatch");
        confirm.focus();
        return;
      }
      finish(password);
    };
    overlay.querySelector(".vno-password-submit").addEventListener("click", submit);
    overlay.querySelector(".vno-password-cancel").addEventListener("click", () => finish(null));
    overlay.addEventListener("keydown", event => {
      if (event.key === "Escape") { event.preventDefault(); finish(null); }
      if (event.key === "Enter") { event.preventDefault(); submit(); }
    });
    first.focus();
  });
}
