/**
 * 3T Office Platform — Command Types & Interfaces
 * 
 * Command Bus là ranh giới trừu tượng duy nhất giữa UI và các tầng xử lý dữ liệu.
 * Mọi hành vi của người dùng trên giao diện đều được đóng gói thành Command.
 */

/**
 * @typedef {Object} CommandState
 * @property {boolean} enabled - Lệnh có khả dụng ở ngữ cảnh hiện tại hay không
 * @property {boolean} checked - Trạng thái bật/tắt (Toggle) ví dụ: Bold đang bật
 * @property {boolean} visible - Có hiển thị trên UI hay không
 * @property {string} label - Nhãn hiển thị tiếng Việt
 * @property {string} [tooltip] - Hướng dẫn nhanh khi di chuột
 * @property {string} [shortcut] - Phím tắt hiển thị (ví dụ: "Ctrl+B")
 * @property {string} [icon] - Tên icon tương ứng trong Icon Registry
 */

/**
 * @typedef {Object} CommandDefinition
 * @property {string} id - Định danh duy nhất theo namespace (vd: "writer.text.bold")
 * @property {string} category - Nhóm lệnh (vd: "file", "edit", "format", "insert", "data")
 * @property {string} label - Tên hiển thị mặc định
 * @property {string} [tooltip]
 * @property {string} [shortcut]
 * @property {string} [icon]
 * @property {boolean} [isToggle] - Lệnh dạng bật/tắt
 * @property {Function} [defaultHandler] - Xử lý mặc định nếu chưa gắn adapter
 */
