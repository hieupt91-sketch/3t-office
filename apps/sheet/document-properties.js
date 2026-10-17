// Compatibility exports; shared implementation lives in Shared Platform.
export { EMPTY_DOCUMENT_PROPERTIES, normalizeDocumentProperties, parseCorePropertiesXml, parseAppPropertiesXml, parseCustomPropertiesXml, documentPropertiesMarker } from "../../platform/dialogs/document-properties.js";
import { showDocumentPropertiesDialog as showSharedDialog } from "../../platform/dialogs/document-properties.js";
export const showDocumentPropertiesDialog = (properties = {}) => showSharedDialog(properties, "sheetDocumentProperties");
