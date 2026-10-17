// Compatibility API; the dialog and OOXML helpers are owned by Shared Platform.
import { EMPTY_DOCUMENT_PROPERTIES as SHARED_EMPTY, normalizeDocumentProperties as normalizeShared, showDocumentPropertiesDialog as showSharedDialog } from "../../platform/dialogs/document-properties.js";
export const EMPTY_DOCUMENT_PROPERTIES = Object.freeze(Object.fromEntries(["title", "creator", "subject", "keywords", "description", "contentStatus"].map((key) => [key, SHARED_EMPTY[key]])));
export function normalizeDocumentProperties(properties = {}) {
  const normalized = normalizeShared(properties);
  return Object.fromEntries(Object.keys(EMPTY_DOCUMENT_PROPERTIES).map((key) => [key, normalized[key]]));
}
export { parseCorePropertiesXml } from "../../platform/dialogs/document-properties.js";
export function documentPropertiesMarker(properties) {
  const json = JSON.stringify(normalizeDocumentProperties(properties));
  const bytes = new TextEncoder().encode(json);
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `<!--vno-document-properties-hex:${hex}-->`;
}
export const showDocumentPropertiesDialog = (properties = {}) => showSharedDialog(normalizeDocumentProperties(properties), "writerDocumentProperties");
