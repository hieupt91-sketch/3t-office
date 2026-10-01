const PASSWORD_ERROR = /password|encrypted|encryption|mật khẩu|mã hóa/i;
const LOCK_ERROR = /locked|being used|in use|sharing violation|permission denied|access denied|cannot access|file is open|khóa|đang sử dụng|quyền truy cập/i;
const CORRUPT_ERROR = /bad.?zip|corrupt|damaged|malformed|invalid package|parse error|not a zip|missing .*part|thiếu thành phần|bị hỏng|không đúng định dạng/i;

/** Shared Vietnamese wording for failures while opening a file. */
export function getOpenErrorMessage(error, documentLabel = "Tài liệu") {
  const detail = typeof error === "string" ? error : String(error?.message || "");
  const retained = `${documentLabel} đang mở được giữ nguyên.`;
  if (PASSWORD_ERROR.test(detail)) {
    return `Tệp được bảo vệ bằng mật khẩu nên 3T Office chưa thể mở. Hãy mở tệp bằng chương trình đã tạo, nhập mật khẩu và lưu một bản không mã hóa rồi thử lại. ${retained}`;
  }
  if (LOCK_ERROR.test(detail)) {
    return `Tệp đang bị khóa hoặc được chương trình khác sử dụng. Hãy đóng tệp ở chương trình đó, kiểm tra quyền truy cập rồi thử lại. ${retained}`;
  }
  if (CORRUPT_ERROR.test(detail)) {
    return `Tệp bị hỏng hoặc có cấu trúc không hợp lệ. Hãy kiểm tra bản sao lưu hoặc định dạng tệp rồi thử lại. ${retained}`;
  }
  return `Không thể mở tệp. Hãy kiểm tra định dạng và quyền truy cập rồi thử lại. ${retained}`;
}
