import {
  collectNavigationHeadings,
  getNavigationHeadingLevel,
  getVisibleNavigationItems,
  normalizeNavigationText
} from "../../apps/writer/writer-nav-pane.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function node(tagName, text, dataset = {}) {
  return {
    tagName,
    textContent: text,
    dataset,
    classList: { contains: name => name === "vno-page-auto-gap" && dataset.autoGap === "true" },
    getAttribute(name) {
      if (name === "data-vno-auto-page-gap") return dataset.autoGap || null;
      return null;
    }
  };
}

export async function runWriterNavigationPaneTests() {
  const results = [];
  const assert = (name, condition, error = "") => results.push({ name, pass: Boolean(condition), error });

  const h1 = node("H1", "Tổng quan");
  const emptyH2 = node("H2", "   ");
  const gap = node("DIV", "", { autoGap: "true" });
  const outline = node("P", "Kế hoạch triển khai", { vnoOutline: "3" });
  const h2 = node("H2", "Kết luận");
  const root = { querySelectorAll: () => [h1, emptyH2, gap, outline, h2] };
  const collected = collectNavigationHeadings(root);

  assert("Navigation Pane: quét Heading 1–6, bỏ tiêu đề rỗng và nhận đoạn có Mức đại cương", collected.length === 3 && collected[0].level === 1 && collected[1].level === 3 && collected[1].text === "Kế hoạch triển khai", JSON.stringify(collected));
  assert("Navigation Pane: ước lượng số trang bằng dải phân trang suy ra", collected[0].page === 1 && collected[1].page === 2 && collected[2].page === 2, JSON.stringify(collected.map(item => item.page)));
  assert("Navigation Pane: chưa phân trang vẫn trả trang 1 và không ném lỗi", collectNavigationHeadings({ querySelectorAll: () => [h1] })[0]?.page === 1);
  assert("Navigation Pane: mức Heading và data-vno-outline được xác định đúng", getNavigationHeadingLevel(h2) === 2 && getNavigationHeadingLevel(outline) === 3);
  assert("Navigation Pane: tìm không dấu khớp tiêu đề tiếng Việt có dấu", normalizeNavigationText("Ke hoach trien khai") === normalizeNavigationText("Kế hoạch triển khai"));

  const tree = [
    { id: "a", level: 1, text: "Tổng quan", hasChildren: true },
    { id: "b", level: 2, text: "Nội dung", hasChildren: true },
    { id: "c", level: 3, text: "Kế hoạch", hasChildren: false },
    { id: "d", level: 1, text: "Kết luận", hasChildren: false }
  ];
  assert("Navigation Pane: thu nhánh ẩn toàn bộ hậu duệ nhưng giữ tiêu đề đồng cấp", getVisibleNavigationItems(tree, new Set(["a"])).map(item => item.id).join("") === "ad");
  assert("Navigation Pane: lọc giữ tiêu đề khớp và các tổ tiên để không mất ngữ cảnh", getVisibleNavigationItems(tree, new Set(), "ke hoach").map(item => item.id).join("") === "abc");

  const command = WRITER_COMMANDS.find(item => item.id === "writer.view.navigationPane");
  const view = WRITER_RIBBON_TABS.find(tab => tab.id === "view");
  const show = view?.groups?.find(group => group.id === "show");
  const help = WRITER_HELP_ENTRIES.find(entry => entry.commandIds?.includes("writer.view.navigationPane"));
  assert("Navigation Pane: command toggle và Ctrl+Alt+N được khai báo", command?.isToggle === true && command?.shortcut === "Ctrl+Alt+N", JSON.stringify(command));
  assert("Navigation Pane: nút có trong nhóm Hiển thị của tab Chế độ xem", show?.items?.some(item => item.commandId === command?.id));
  assert("Navigation Pane: có i18n VI/EN cho command và toàn bộ trạng thái ngăn", Boolean(viStrings.commands[command?.id]?.label && enStrings.commands[command?.id]?.label && viStrings.writerNavigation?.empty && enStrings.writerNavigation?.noResults));
  assert("Navigation Pane: có bài Trợ giúp tiếng Việt thật, đúng tab/nhóm", help?.ribbon?.tabId === "view" && help?.ribbon?.group === "Hiển thị" && help?.steps?.length >= 4, JSON.stringify(help));

  return results;
}
