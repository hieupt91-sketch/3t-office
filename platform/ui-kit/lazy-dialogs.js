import { withLazyFeatureProgress } from "../startup/lazy-feature.js";

const DIALOG_EXPORTS = [
  "showAlertDialog",
  "showConfirmDialog",
  "showPromptDialog",
  "showFindReplaceDialog",
  "showMacroManagerDialog",
  "showUnsavedChangesDialog",
  "showPendingFeatureNotice"
];

let dialogsModulePromise = null;

function loadDialogs(appName) {
  if (!dialogsModulePromise) {
    dialogsModulePromise = withLazyFeatureProgress(appName, "hộp thoại", () => import("./dialogs.js"))
      .catch((error) => {
        dialogsModulePromise = null;
        throw error;
      });
  }
  return dialogsModulePromise;
}

/** Create lightweight dialog entry points; the full dialog implementation loads on first use. */
export function createLazyDialogs(appName = "common") {
  return Object.fromEntries(DIALOG_EXPORTS.map((name) => [
    name,
    (...args) => loadDialogs(appName).then((dialogs) => dialogs[name](...args))
  ]));
}

const commonDialogs = createLazyDialogs("common");

export const showAlertDialog = (...args) => commonDialogs.showAlertDialog(...args);
export const showConfirmDialog = (...args) => commonDialogs.showConfirmDialog(...args);
export const showPromptDialog = (...args) => commonDialogs.showPromptDialog(...args);
export const showFindReplaceDialog = (...args) => commonDialogs.showFindReplaceDialog(...args);
export const showMacroManagerDialog = (...args) => commonDialogs.showMacroManagerDialog(...args);
export const showUnsavedChangesDialog = (...args) => commonDialogs.showUnsavedChangesDialog(...args);
export const showPendingFeatureNotice = (...args) => commonDialogs.showPendingFeatureNotice(...args);
