/**
 * Ctrl+S dùng chung cho Doc/Sheet/Slide: tệp trên đĩa đã bị thay đổi từ bên ngoài thì hỏi người dùng,
 * không ghi đè âm thầm. Lưu bản sao đi qua saveAs() của từng adapter để cập nhật đường dẫn và tiêu đề.
 */
import { globalUnoBridge } from "./uno-bridge.js";
import { showExternalChangeDialog } from "../../../platform/ui-kit/dialogs.js";

let promptOpen = false;

/**
 * @returns {Promise<object>} Kết quả lưu của bridge, hoặc status "saved_copy" khi đã lưu bản sao,
 * hoặc status "cancelled" khi người dùng hủy (kể cả hủy hộp thoại Lưu bản sao).
 */
export async function saveInPlaceCheckingExternalChange(appKind, content, targetPath, sourcePath, saveCopy, askUser = showExternalChangeDialog) {
  // Ctrl+S trong lúc hộp thoại đang mở: câu trả lời cho hộp thoại đó sẽ quyết định, không mở chồng.
  if (promptOpen) return { status: "cancelled" };
  let result = await globalUnoBridge.saveRealFileInPlace(appKind, content, targetPath, sourcePath);
  // Lặp: tệp có thể lại đổi trong lúc ghi đè đang chạy, khi đó phải hỏi lại.
  while (result?.status === "external_change") {
    const fileName = String(result.path || targetPath).split(/[/\\]/).pop();
    if (promptOpen) return { status: "cancelled" };
    promptOpen = true;
    let choice;
    try {
      choice = await askUser({ fileName });
    } finally {
      promptOpen = false;
    }
    if (choice === "copy") return { status: (await saveCopy()) === true ? "saved_copy" : "cancelled" };
    if (choice !== "overwrite") return { status: "cancelled" };
    const acknowledged = await globalUnoBridge.acknowledgeExternalChange(result.path || targetPath, result.fingerprint);
    if (acknowledged?.status !== "ok") return acknowledged;
    result = await globalUnoBridge.saveRealFileInPlace(appKind, content, targetPath, sourcePath);
  }
  return result;
}
