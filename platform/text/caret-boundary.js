/**
 * Vị trí con trỏ ở đầu/cuối vùng soạn thảo (Ctrl+Home / Ctrl+End trên Windows,
 * Cmd+Home / Cmd+End — Fn+Cmd+← / Fn+Cmd+→ — trên macOS).
 *
 * Vì sao cần: thu gọn Range về biên của chính vùng soạn thảo (`selectNodeContents(root)`
 * + `collapse(false)`) cho vị trí (root, số con) nằm GIỮA các khối. Khi khối cuối là phần
 * không sửa được (vd khung chú thích cuối trang `contenteditable="false"`), Chromium không
 * đặt được con trỏ ở đó và tự dời về vị trí sửa được đầu tiên → Ctrl+End/Cmd+End đưa con
 * trỏ về ĐẦU tài liệu (lỗi D9). Hàm này tìm điểm lá (chữ, <br>, ảnh, số chú thích) đầu/cuối nằm trong
 * vùng sửa được, bỏ qua mọi nhánh `contenteditable="false"` (nút thu gọn tiêu đề, khung
 * chú thích, khoảng cách trang tự động…).
 *
 * Không phụ thuộc trình duyệt/hệ điều hành: chỉ dùng nodeType/childNodes/getAttribute nên
 * chạy được trong unit test với nút giả.
 */

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;
const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "TEMPLATE", "BUTTON", "SVG"]);
const VOID_LEAF_TAGS = new Set(["BR", "IMG"]);
// Phần tử nội dòng không sửa được (vd số tham chiếu chú thích <sup contenteditable="false">):
// ở CUỐI tài liệu con trỏ đứng SAU nó như Word, thay vì chen vào trước số chú thích.
const INLINE_ATOM_TAGS = new Set(["SUP", "SUB", "SPAN", "A", "ABBR", "CODE"]);
// Khoảng trắng định dạng mã HTML giữa các khối (không gồm NBSP, vốn là chữ thật).
const LAYOUT_WHITESPACE = /^[ \t\n\r\f]*$/;

function tagOf(node) {
  return String(node?.nodeName || "").toUpperCase();
}

function isNonEditableElement(node) {
  if (!node || node.nodeType !== ELEMENT_NODE) return false;
  const value = typeof node.getAttribute === "function" ? node.getAttribute("contenteditable") : null;
  return String(value ?? "").toLowerCase() === "false";
}

function indexInParent(node) {
  const siblings = node?.parentNode?.childNodes;
  if (!siblings) return -1;
  for (let i = 0; i < siblings.length; i += 1) if (siblings[i] === node) return i;
  return -1;
}

/** Điểm lá đầu tiên (toEnd=false) hoặc cuối cùng (toEnd=true) trong vùng sửa được của `node`. */
function findLeaf(node, toEnd) {
  const children = node?.childNodes;
  if (!children || children.length === 0) return null;
  const count = children.length;
  for (let step = 0; step < count; step += 1) {
    const child = children[toEnd ? count - 1 - step : step];
    if (child.nodeType === TEXT_NODE) {
      if (!LAYOUT_WHITESPACE.test(String(child.data ?? child.textContent ?? ""))) return child;
      continue;
    }
    if (child.nodeType !== ELEMENT_NODE) continue;
    const tag = tagOf(child);
    if (SKIPPED_TAGS.has(tag)) continue;
    if (isNonEditableElement(child)) {
      if (toEnd && INLINE_ATOM_TAGS.has(tag)) return child;
      continue;
    }
    if (VOID_LEAF_TAGS.has(tag)) return child;
    const nested = findLeaf(child, toEnd);
    if (nested) return nested;
  }
  return null;
}

/**
 * @param {Node} root vùng soạn thảo (contenteditable)
 * @param {boolean} toEnd true = cuối tài liệu, false = đầu tài liệu
 * @returns {{ node: Node, offset: number }} vị trí để `range.setStart(node, offset)`
 */
export function findDocumentBoundaryCaret(root, toEnd = false) {
  const leaf = findLeaf(root, toEnd);
  if (!leaf) {
    return { node: root, offset: toEnd ? (root?.childNodes?.length || 0) : 0 };
  }
  if (leaf.nodeType === TEXT_NODE) {
    return { node: leaf, offset: toEnd ? String(leaf.data ?? leaf.textContent ?? "").length : 0 };
  }
  const parent = leaf.parentNode;
  const index = indexInParent(leaf);
  // <br> cuối đoạn trống: con trỏ đứng TRƯỚC <br> (trong đoạn), không sau nó.
  if (tagOf(leaf) === "BR") return { node: parent, offset: Math.max(0, index) };
  return { node: parent, offset: toEnd ? index + 1 : Math.max(0, index) };
}
