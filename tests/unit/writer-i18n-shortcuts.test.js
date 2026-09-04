/**
 * VN Office — Behavioral & Unit Tests: VN Writer i18n & Word Shortcuts
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 * Suite 34: Kiểm thử đa ngôn ngữ VI/EN toàn diện cho Writer và phím tắt chuẩn Word
 */

import { WRITER_COMMANDS, COMMON_COMMANDS, applyLocaleToCommandDefinitions } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS, applyLocaleToWriterRibbon } from "../../apps/writer/writer-ribbon.js";
import { t, setLocale, getLocale } from "../../platform/i18n/i18n.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

export async function runWriterI18nShortcutsTests() {
  const results = [];
  const initialLocale = getLocale();

  function assert(name, condition, errorMsg = "") {
    if (condition) {
      results.push({ name, pass: true });
    } else {
      results.push({ name, pass: false, error: errorMsg });
    }
  }

  try {
    // TEST 1: Tất cả WRITER_COMMANDS phải có mặt trong từ điển i18n (VI và EN)
    (() => {
      const missingVi = [];
      const missingEn = [];

      for (const cmd of WRITER_COMMANDS) {
        if (!viStrings.commands || !viStrings.commands[cmd.id]) {
          missingVi.push(cmd.id);
        }
        if (!enStrings.commands || !enStrings.commands[cmd.id]) {
          missingEn.push(cmd.id);
        }
      }

      assert(
        "Writer i18n: Toàn bộ 54 WRITER_COMMANDS có bản dịch đầy đủ trong catalog VI và EN",
        missingVi.length === 0 && missingEn.length === 0 && WRITER_COMMANDS.length >= 50,
        `Thiếu khóa bản dịch: VI=[${missingVi.join(", ")}], EN=[${missingEn.join(", ")}]`
      );
    })();

    // TEST 2: Tính duy nhất và hợp lệ của phím tắt Writer (không trùng lặp nội bộ và không đè COMMON_COMMANDS)
    (() => {
      const writerShortcuts = new Map();
      const duplicateWriter = [];

      for (const cmd of WRITER_COMMANDS) {
        if (cmd.shortcut) {
          const sc = cmd.shortcut.toLowerCase();
          if (writerShortcuts.has(sc)) {
            duplicateWriter.push(`${cmd.id} trùng với ${writerShortcuts.get(sc)} (${cmd.shortcut})`);
          } else {
            writerShortcuts.set(sc, cmd.id);
          }
        }
      }

      // Kiểm tra xung đột với COMMON_COMMANDS
      const commonCollisions = [];
      for (const commonCmd of COMMON_COMMANDS) {
        if (commonCmd.shortcut) {
          const sc = commonCmd.shortcut.toLowerCase();
          if (writerShortcuts.has(sc) && writerShortcuts.get(sc) !== commonCmd.id) {
            commonCollisions.push(`${writerShortcuts.get(sc)} đè lên common shortcut ${commonCmd.id} (${commonCmd.shortcut})`);
          }
        }
      }

      assert(
        "Writer Shortcuts: Phím tắt chuẩn Word duy nhất, không trùng lặp nội bộ và không xung đột với COMMON_COMMANDS",
        duplicateWriter.length === 0 && commonCollisions.length === 0 && writerShortcuts.size >= 20,
        `Xung đột phím tắt: ${[...duplicateWriter, ...commonCollisions].join("; ")}`
      );
    })();

    // TEST 3: Phím tắt chuẩn Microsoft Word 365 chuyên biệt cho Writer
    (() => {
      const growFont = WRITER_COMMANDS.find(c => c.id === "writer.font.grow");
      const shrinkFont = WRITER_COMMANDS.find(c => c.id === "writer.font.shrink");
      const commentInsert = WRITER_COMMANDS.find(c => c.id === "writer.comment.insert");
      const trackChanges = WRITER_COMMANDS.find(c => c.id === "writer.trackChanges.toggle");
      const pageBreak = WRITER_COMMANDS.find(c => c.id === "writer.page.break");
      const printPreview = WRITER_COMMANDS.find(c => c.id === "writer.file.printPreview");

      const hasWordShortcuts =
        growFont?.shortcut === "Ctrl+Shift+>" &&
        shrinkFont?.shortcut === "Ctrl+Shift+<" &&
        commentInsert?.shortcut === "Ctrl+Alt+M" &&
        trackChanges?.shortcut === "Ctrl+Shift+E" &&
        pageBreak?.shortcut === "Ctrl+Enter" &&
        printPreview?.shortcut === "Ctrl+F2";

      assert(
        "Writer Shortcuts: Tích hợp đầy đủ phím tắt chuẩn Word (Ctrl+Shift+>, Ctrl+Shift+<, Ctrl+Alt+M, Ctrl+Shift+E, Ctrl+F2)",
        hasWordShortcuts,
        `Phím tắt không đúng: grow=${growFont?.shortcut}, shrink=${shrinkFont?.shortcut}, comment=${commentInsert?.shortcut}, trackChanges=${trackChanges?.shortcut}`
      );
    })();

    // TEST 4: Chuyển đổi ngôn ngữ sang Tiếng Anh (setLocale('en'))
    (() => {
      setLocale("en");
      applyLocaleToCommandDefinitions();
      applyLocaleToWriterRibbon(WRITER_RIBBON_TABS);

      const boldCmd = WRITER_COMMANDS.find(c => c.id === "writer.text.bold");
      const italicCmd = WRITER_COMMANDS.find(c => c.id === "writer.text.italic");
      const watermarkCmd = WRITER_COMMANDS.find(c => c.id === "writer.page.watermark");
      const columnsCmd = WRITER_COMMANDS.find(c => c.id === "writer.page.columns");
      const printPreviewCmd = WRITER_COMMANDS.find(c => c.id === "writer.file.printPreview");

      const homeTab = WRITER_RIBBON_TABS.find(t => t.id === "home");
      const designTab = WRITER_RIBBON_TABS.find(t => t.id === "design");
      const layoutTab = WRITER_RIBBON_TABS.find(t => t.id === "layout");
      const reviewTab = WRITER_RIBBON_TABS.find(t => t.id === "review");

      const enCommandsOk =
        boldCmd?.label === "Bold" &&
        italicCmd?.label === "Italic" &&
        watermarkCmd?.label === "Watermark" &&
        columnsCmd?.label === "Columns" &&
        printPreviewCmd?.label === "Print Preview";

      const enRibbonOk =
        homeTab?.label === "Home" &&
        designTab?.label === "Design" &&
        layoutTab?.label === "Layout" &&
        reviewTab?.label === "Review";

      assert(
        "Writer i18n Switch: Khi setLocale('en'), toàn bộ Command Definitions và Ribbon Tabs cập nhật sang tiếng Anh chuẩn",
        enCommandsOk && enRibbonOk,
        `Lỗi bản dịch EN: bold=${boldCmd?.label}, watermark=${watermarkCmd?.label}, homeTab=${homeTab?.label}, designTab=${designTab?.label}`
      );
    })();

    // TEST 5: Chuyển đổi ngược lại Tiếng Việt (setLocale('vi'))
    (() => {
      setLocale("vi");
      applyLocaleToCommandDefinitions();
      applyLocaleToWriterRibbon(WRITER_RIBBON_TABS);

      const boldCmd = WRITER_COMMANDS.find(c => c.id === "writer.text.bold");
      const italicCmd = WRITER_COMMANDS.find(c => c.id === "writer.text.italic");
      const watermarkCmd = WRITER_COMMANDS.find(c => c.id === "writer.page.watermark");
      const columnsCmd = WRITER_COMMANDS.find(c => c.id === "writer.page.columns");
      const printPreviewCmd = WRITER_COMMANDS.find(c => c.id === "writer.file.printPreview");

      const homeTab = WRITER_RIBBON_TABS.find(t => t.id === "home");
      const designTab = WRITER_RIBBON_TABS.find(t => t.id === "design");
      const layoutTab = WRITER_RIBBON_TABS.find(t => t.id === "layout");
      const reviewTab = WRITER_RIBBON_TABS.find(t => t.id === "review");

      const viCommandsOk =
        boldCmd?.label === "Đậm" &&
        italicCmd?.label === "Nghiêng" &&
        watermarkCmd?.label === "Hình mờ" &&
        columnsCmd?.label === "Cột" &&
        printPreviewCmd?.label === "Xem trước khi in";

      const viRibbonOk =
        homeTab?.label === "Trang đầu" &&
        designTab?.label === "Thiết kế" &&
        layoutTab?.label === "Bố cục" &&
        reviewTab?.label === "Đánh giá";

      assert(
        "Writer i18n Switch: Khi setLocale('vi'), toàn bộ Command Definitions và Ribbon Tabs khôi phục chính xác tiếng Việt",
        viCommandsOk && viRibbonOk,
        `Lỗi bản dịch VI: bold=${boldCmd?.label}, watermark=${watermarkCmd?.label}, homeTab=${homeTab?.label}, designTab=${designTab?.label}`
      );
    })();

    // TEST 6: Ribbon Tab Thiết kế (Design) riêng biệt chuẩn Word 365 & Tương thích ngược
    (() => {
      const designTab = WRITER_RIBBON_TABS.find(t => t.id === "design");
      const hasDesignTab = Boolean(designTab);

      const designBgGroup = designTab?.groups?.find(g => g.labelKey === "writerRibbon.group.pageBackground" || g.label === "Nền & Viền trang" || g.label === "Page Background");
      const hasWatermarkInDesign = designBgGroup?.items?.some(i => i.commandId === "writer.page.watermark");
      const hasBorderInDesign = designBgGroup?.items?.some(i => i.commandId === "writer.page.border");

      // Kiểm tra tương thích ngược: layout tab vẫn có Watermark và Page Border
      const layoutTab = WRITER_RIBBON_TABS.find(t => t.id === "layout");
      const layoutBgGroup = layoutTab?.groups?.find(g => g.labelKey === "writerRibbon.group.pageBackground" || g.label === "Nền & Viền trang" || g.label === "Page Background");
      const hasWatermarkInLayout = layoutBgGroup?.items?.some(i => i.commandId === "writer.page.watermark");
      const hasBorderInLayout = layoutBgGroup?.items?.some(i => i.commandId === "writer.page.border");

      assert(
        "Writer Ribbon: Tab Thiết kế (Design) riêng biệt chứa Hình mờ & Viền trang, đồng thời duy trì tương thích ngược trên Bố cục",
        hasDesignTab && hasWatermarkInDesign && hasBorderInDesign && hasWatermarkInLayout && hasBorderInLayout,
        `Thiếu thiết lập Design tab: hasDesign=${hasDesignTab}, watermarkDesign=${hasWatermarkInDesign}, borderDesign=${hasBorderInDesign}, watermarkLayout=${hasWatermarkInLayout}`
      );
    })();

    // TEST 7: Toàn bộ danh mục Dialog của Writer được chuẩn bị đầy đủ trong i18n (VI & EN)
    (() => {
      const requiredDialogs = [
        "pageSetup",
        "columns",
        "watermark",
        "pageBorder",
        "mailMerge",
        "printPreview",
        "styleGallery",
        "comments",
        "hyperlink"
      ];

      const missingInVi = requiredDialogs.filter(d => !viStrings.writerDialogs || !viStrings.writerDialogs[d]);
      const missingInEn = requiredDialogs.filter(d => !enStrings.writerDialogs || !enStrings.writerDialogs[d]);

      // Kiểm tra chi tiết 6 presets trong styleGallery
      const styles = ["normal", "h1", "h2", "h3", "quote", "emphasis"];
      const missingStyleVi = styles.filter(s => !viStrings.writerDialogs?.styleGallery?.[s]?.label);
      const missingStyleEn = styles.filter(s => !enStrings.writerDialogs?.styleGallery?.[s]?.label);

      assert(
        "Writer Dialogs i18n: Khung bản dịch hộp thoại (pageSetup, columns, watermark, pageBorder, mailMerge, printPreview, styleGallery, comments, hyperlink) đầy đủ song ngữ",
        missingInVi.length === 0 && missingInEn.length === 0 && missingStyleVi.length === 0 && missingStyleEn.length === 0,
        `Thiếu danh mục dialog: VI=[${missingInVi.join(", ")}], EN=[${missingInEn.join(", ")}], StyleVI=[${missingStyleVi.join(", ")}], StyleEN=[${missingStyleEn.join(", ")}]`
      );
    })();

    // TEST 8: Hàm t(key) hoạt động chuẩn xác với các khóa writerRibbon và writerDialogs
    (() => {
      setLocale("vi");
      const viDesignTab = t("writerRibbon.tab.design");
      const viWatermarkTitle = t("writerDialogs.watermark.title");
      const viColumnsTitle = t("writerDialogs.columns.title");
      const viPrintPreviewTitle = t("writerDialogs.printPreview.title");

      setLocale("en");
      const enDesignTab = t("writerRibbon.tab.design");
      const enWatermarkTitle = t("writerDialogs.watermark.title");
      const enColumnsTitle = t("writerDialogs.columns.title");
      const enPrintPreviewTitle = t("writerDialogs.printPreview.title");

      const viOk =
        viDesignTab === "Thiết kế" &&
        viWatermarkTitle === "Hình mờ (Watermark)" &&
        viColumnsTitle === "Chia cột văn bản (Columns)" &&
        viPrintPreviewTitle === "Xem trước khi in";

      const enOk =
        enDesignTab === "Design" &&
        enWatermarkTitle === "Watermark" &&
        enColumnsTitle === "Columns" &&
        enPrintPreviewTitle === "Print Preview";

      assert(
        "Writer i18n Lookup: Hàm t(key) trả về chính xác chuỗi đa ngôn ngữ cho ribbon và hộp thoại khi đổi locale",
        viOk && enOk,
        `Lookup sai: viDesign=${viDesignTab}, enDesign=${enDesignTab}, viWatermark=${viWatermarkTitle}, enWatermark=${enWatermarkTitle}`
      );
    })();

  } finally {
    // Luôn khôi phục locale ban đầu
    setLocale(initialLocale || "vi");
    applyLocaleToCommandDefinitions();
    applyLocaleToWriterRibbon(WRITER_RIBBON_TABS);
  }

  return results;
}

