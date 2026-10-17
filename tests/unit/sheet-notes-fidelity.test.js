import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { createSheetGridWithSheets } from "./sheet-test-fixtures.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import {
  patchVmlDrawingComments,
  parseVmlDrawingComments
} from "../../adapters/libreoffice/sheet/xlsx-native-postprocess.js";

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const createMockContainer = () => {
  const el = {
    children: [],
    style: {},
    className: "",
    innerHTML: "",
    appendChild(child) { this.children.push(child); return child; },
    insertBefore(child) { this.children.unshift(child); return child; },
    removeChild(child) {
      const idx = this.children.indexOf(child);
      if (idx >= 0) this.children.splice(idx, 1);
      return child;
    },
    querySelector(sel) {
      if (sel.includes("svg")) return this.children.find(c => c.tagName === "svg") || null;
      if (sel.includes("note-box")) return this.children.find(c => c.className?.includes("vno-note-box")) || null;
      return null;
    },
    querySelectorAll(sel) {
      if (sel.includes("note-box")) return this.children.filter(c => c.className?.includes("vno-note-box"));
      return [];
    },
    addEventListener() {},
    removeEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} }
  };
  return el;
};

export async function runSheetNotesFidelityTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  const originalDocument = globalThis.document;
  globalThis.document = {
    createElement(tag) {
      return {
        tagName: tag,
        children: [],
        style: {},
        className: "",
        innerHTML: "",
        textContent: "",
        dataset: {},
        attributes: {},
        setAttribute(k, v) { this.attributes[k] = v; },
        getAttribute(k) { return this.attributes[k]; },
        appendChild(child) { this.children.push(child); return child; },
        querySelector(sel) {
          if (sel.includes("vno-note-body")) return this.children.find(c => c.className?.includes("vno-note-body")) || null;
          if (sel.includes("vno-note-close")) return this.children.find(c => c.className?.includes("vno-note-close")) || null;
          return null;
        },
        querySelectorAll() { return []; },
        addEventListener(event, handler) {
          this._listeners = this._listeners || {};
          this._listeners[event] = handler;
        },
        removeEventListener() {}
      };
    },
    createElementNS(ns, tag) {
      return this.createElement(tag);
    }
  };

  try {
    const grid = createSheetGridWithSheets(createMockContainer(), ["Bảng 1", "Bảng 2"]);
    grid._refreshPageAndCommentVisuals = () => {};

    await test("Sheet Notes: Lưu đúng metadata (coord, text, author, visible, size, offset)", () => {
      const note = grid.saveComment({
        coord: "B3",
        text: "Ghi chú thử nghiệm",
        author: "Chuyên viên A",
        visible: true,
        width: 160,
        height: 90,
        offsetX: 20,
        offsetY: -5
      });
      assert(note.coord === "B3", "Coord sai");
      assert(note.text === "Ghi chú thử nghiệm", "Text sai");
      assert(note.author === "Chuyên viên A", "Author sai");
      assert(note.visible === true, "Visible sai");
      assert(note.width === 160, "Width sai");
      assert(note.height === 90, "Height sai");
      assert(note.offsetX === 20, "OffsetX sai");
      assert(note.offsetY === -5, "OffsetY sai");
    });

    await test("Sheet Notes: toggleCommentVisible đổi cờ visible của ô", () => {
      grid.selectedCoord = { c: "B", r: 3 };
      const currentVis = grid.commentsBySheet[grid.activeSheet]["B3"].visible;
      const nextVis = grid.toggleCommentVisible("B3");
      assert(nextVis === !currentVis, "toggleCommentVisible không lật cờ");
      assert(grid.commentsBySheet[grid.activeSheet]["B3"].visible === !currentVis, "Model không cập nhật");
      grid.toggleCommentVisible("B3"); // revert back to true
      assert(grid.commentsBySheet[grid.activeSheet]["B3"].visible === currentVis, "Revert toggle sai");
    });

    await test("Sheet Notes: toggleShowAllComments và setDisplayCommentIndicator khớp 3 chế độ Excel", () => {
      assert(grid.getDisplayCommentIndicator() === -1, "Mặc định phải là -1 (chỉ hiện chỉ báo)");
      grid.toggleShowAllComments(true);
      assert(grid.getDisplayCommentIndicator() === 1, "Bật hiện tất cả phải là 1");
      grid.toggleShowAllComments(false);
      assert(grid.getDisplayCommentIndicator() === -1, "Tắt hiện tất cả phải về -1");
      grid.setDisplayCommentIndicator(0);
      assert(grid.getDisplayCommentIndicator() === 0, "Đặt 0 phải là 0 (ẩn tất cả)");
      grid.setDisplayCommentIndicator(-1);
    });

    await test("Sheet Notes: renderPinnedNotes dựng box ghi chú, textarea và mũi tên connector SVG", () => {
      const mockLayer = createMockContainer();
      grid.commentLayer = mockLayer;
      grid._getCellRect = (c, r) => ({ left: 100, top: 100, width: 80, height: 24, right: 180, bottom: 124 });
      grid.renderPinnedNotes();
      assert(mockLayer.children.length >= 2, "commentLayer phải chứa SVG connector và box ghi chú");
      const svg = mockLayer.children[0];
      assert(svg.tagName === "svg", "Phần tử đầu tiên phải là SVG connector");
      const box = mockLayer.children.find(c => c.className?.includes("vno-note-box"));
      assert(box !== null, "Không tìm thấy .vno-note-box");
      assert(box.dataset.coord === "B3", "Dataset coord sai");
    });

    await test("Sheet Notes: Paste Special mode 'comments' chỉ dán ghi chú, giữ nguyên giá trị ô đích", () => {
      grid.setCellValue("B", 3, "Giá trị ô B3");
      grid.setCellValue("D", 5, "Giá trị ô đích D5");
      grid.selectionRange = { start: { c: "B", r: 3 }, end: { c: "B", r: 3 } };
      grid.selectedCoord = { c: "B", r: 3 };
      grid.copySelection(false);

      const clipboard = {
        range: { start: { c: "B", r: 3 }, end: { c: "B", r: 3 } },
        cells: [[grid.cellsData.get("B3") || { val: "Giá trị ô B3" }]],
        sourceSheet: grid.activeSheet
      };

      grid.applyPasteSpecial(clipboard, "comments", { c: "D", r: 5 });
      assert(grid.cellsData.get("D5").val === "Giá trị ô đích D5", "Giá trị ô đích bị ghi đè!");
      const pastedNote = grid.commentsBySheet[grid.activeSheet]["D5"];
      assert(pastedNote !== undefined, "Ô D5 không nhận được ghi chú");
      assert(pastedNote.text === "Ghi chú thử nghiệm", "Nội dung ghi chú dán sai");
      assert(pastedNote.coord === "D5", "Coord của ghi chú dán chưa cập nhật");
    });

    await test("Sheet Notes: _shiftGridMetadata chèn/xóa hàng/cột tự cập nhật hoặc xóa ghi chú", () => {
      grid.saveComment({ coord: "C4", text: "Ghi chú tại C4", visible: false });
      // Chèn hàng tại dòng 3 (hàng 4 thành hàng 5)
      grid._shiftGridMetadata("row", 3, 1, grid.activeSheet);
      assert(!grid.commentsBySheet[grid.activeSheet]["C4"], "C4 cũ phải không còn");
      assert(grid.commentsBySheet[grid.activeSheet]["C5"]?.text === "Ghi chú tại C4", "Ghi chú phải chuyển xuống C5");

      // Xóa hàng 5 (chứa ghi chú)
      grid._shiftGridMetadata("row", 5, -1, grid.activeSheet);
      assert(!grid.commentsBySheet[grid.activeSheet]["C5"], "Ghi chú tại hàng bị xóa phải biến mất");

      // Thử với cột: ghi chú tại D2, chèn cột C
      grid.saveComment({ coord: "D2", text: "Ghi chú tại D2" });
      grid._shiftGridMetadata("col", 3, 1, grid.activeSheet); // col C = 3
      assert(!grid.commentsBySheet[grid.activeSheet]["D2"], "D2 cũ phải không còn");
      assert(grid.commentsBySheet[grid.activeSheet]["E2"]?.text === "Ghi chú tại D2", "Ghi chú phải chuyển sang E2");

      // Xóa cột E (chứa ghi chú)
      grid._shiftGridMetadata("col", 5, -1, grid.activeSheet); // col E = 5
      assert(!grid.commentsBySheet[grid.activeSheet]["E2"], "Ghi chú tại cột bị xóa phải biến mất");
    });

    await test("Sheet Notes: FODS lưu office:display và vno:comments-meta, nạp lại đầy đủ", () => {
      grid.saveComment({
        coord: "F6",
        text: "Ghi chú FODS",
        author: "Kiểm định viên",
        visible: true,
        width: 155,
        height: 85,
        offsetX: 18,
        offsetY: -8
      });
      grid.setDisplayCommentIndicator(1);
      const adapter = new SheetAdapter(grid);
      const fodsXml = adapter.serializeToFods();
      assert(fodsXml.includes('office:display="true"'), "FODS thiếu office:display='true'");
      assert(fodsXml.includes('vno:comments-meta='), "FODS thiếu vno:comments-meta");
      assert(fodsXml.includes('vno:display-comment-indicator="1"'), "FODS thiếu vno:display-comment-indicator");

      const parsed = adapter.parseFods(fodsXml);
      const restored = parsed.commentsBySheet[grid.activeSheet]?.["F6"];
      assert(restored !== undefined, "Không parse lại được ghi chú F6");
      assert(restored.visible === true, "Visible parse lại sai");
      assert(restored.width === 155, "Width parse lại sai");
      assert(restored.height === 85, "Height parse lại sai");
      assert(parsed.displayCommentIndicator === 1, "DisplayCommentIndicator parse lại sai");
    });

    await test("Sheet Notes: XLSX Native VML Drawing patch sinh đúng visibility:visible và <x:Visible/>", () => {
      const fodsComments = {
        "B2": { coord: "B2", text: "Note B2", visible: true, width: 144, height: 79, offsetX: 15, offsetY: -10 },
        "C3": { coord: "C3", text: "Note C3", visible: false, width: 144, height: 79 }
      };
      const vmlTemplate = `
<xml xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
 <v:shape id="_x0000_s1025" type="#_x0000_t202" style="position:absolute;margin-left:108pt;margin-top:59.25pt;width:108pt;height:59.25pt;z-index:1;visibility:hidden">
  <x:ClientData ObjectType="Note">
   <x:Row>1</x:Row>
   <x:Column>1</x:Column>
  </x:ClientData>
 </v:shape>
 <v:shape id="_x0000_s1026" type="#_x0000_t202" style="position:absolute;margin-left:108pt;margin-top:59.25pt;width:108pt;height:59.25pt;z-index:2;visibility:hidden">
  <x:ClientData ObjectType="Note">
   <x:Row>2</x:Row>
   <x:Column>2</x:Column>
  </x:ClientData>
 </v:shape>
</xml>`;
      const patchedVml = patchVmlDrawingComments(vmlTemplate, fodsComments);
      assert(patchedVml.includes("visibility:visible"), "VML thiếu visibility:visible cho note B2");
      assert(patchedVml.includes("<x:Visible/>"), "VML thiếu <x:Visible/> cho note B2");

      // Thử overlay khôi phục lại
      const overlayComments = parseVmlDrawingComments(patchedVml);
      assert(overlayComments["B2"]?.visible === true, "Overlay không trích xuất được visible=true");
      assert(overlayComments["C3"]?.visible === false, "Overlay không trích xuất được visible=false");
    });

    await test("Sheet Notes: Đăng ký lệnh và Ribbon UI chuẩn", () => {
      const toggleCmd = SHEET_COMMANDS.find(c => c.id === "sheet.review.commentToggleVisible");
      const showAllCmd = SHEET_COMMANDS.find(c => c.id === "sheet.review.commentShowAll");
      assert(toggleCmd !== undefined, "Thiếu command sheet.review.commentToggleVisible");
      assert(showAllCmd !== undefined, "Thiếu command sheet.review.commentShowAll");
      assert(showAllCmd.isToggle === true, "Lệnh show all phải là isToggle: true");

      const reviewTab = SHEET_RIBBON_TABS.find(t => t.id === "review");
      assert(reviewTab !== undefined, "Không tìm thấy tab review");
      const commentGroup = reviewTab.groups.find(g => g.id === "comments");
      assert(commentGroup !== undefined, "Không tìm thấy nhóm comments");

      const flattenCommands = (items) => {
        let cmds = [];
        for (const it of items) {
          if (it.commandId) cmds.push(it.commandId);
          if (it.items) cmds.push(...flattenCommands(it.items));
        }
        return cmds;
      };
      const groupCmds = flattenCommands(commentGroup.items);
      assert(groupCmds.includes("sheet.review.commentToggleVisible"), "Thiếu nút commentToggleVisible trên Ribbon");
      assert(groupCmds.includes("sheet.review.commentShowAll"), "Thiếu nút commentShowAll trên Ribbon");

      assert(ICONS["commentToggleVisible"] !== undefined, "Thiếu SVG icon commentToggleVisible");
      assert(ICONS["commentShowAll"] !== undefined, "Thiếu SVG icon commentShowAll");
    });

  } finally {
    globalThis.document = originalDocument;
  }

  return results;
}
