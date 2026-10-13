/**
 * Tests for Ticket WORD-W5 Item 4: Kiểm tra tài liệu (Document Inspector).
 * Kiểm tra:
 * - 4 nhóm quét: Nhận xét (comments), Thay đổi theo dõi (track changes),
 *   Văn bản ẩn (hidden text), Thông tin cá nhân (personal info).
 * - Cho phép quét và loại bỏ từng nhóm độc lập.
 * - Khai báo lệnh, nút Ribbon, i18n VI/EN và Trợ giúp tiếng Việt.
 */

import assert from "node:assert/strict";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import {
  INSPECTOR_CATEGORIES,
  inspectDocument,
  removeDocumentCategory,
  showDocumentInspectorDialog
} from "../../apps/writer/document-inspector-dialog.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

class MockDomNode {
  constructor(tag = "div", attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attributes = new Map(Object.entries(attrs));
    this.children = [];
    this.childNodes = [];
    this.parentElement = null;
    this.removed = false;
  }
  setAttribute(k, v) { this.attributes.set(k, String(v)); }
  getAttribute(k) { return this.attributes.get(k) ?? null; }
  hasAttribute(k) { return this.attributes.has(k); }
  appendChild(c) {
    c.parentElement = this;
    this.children.push(c);
    return c;
  }
  remove() {
    this.removed = true;
    if (this.parentElement) {
      this.parentElement.children = this.parentElement.children.filter(n => n !== this);
    }
  }
  replaceWith(...newNodes) {
    this.removed = true;
    if (this.parentElement) {
      const idx = this.parentElement.children.indexOf(this);
      if (idx >= 0) {
        this.parentElement.children.splice(idx, 1, ...newNodes);
        for (const n of newNodes) n.parentElement = this.parentElement;
      }
    }
  }
  querySelectorAll(sel) {
    const matches = [];
    const walk = (node) => {
      if (node !== this) {
        if (sel.includes("display: none") && node.getAttribute("style")?.includes("display: none")) matches.push(node);
        else if (sel.includes("vno-hidden-text") && (node.getAttribute("class")?.includes("vno-hidden-text") || node.getAttribute("data-vno-hidden") === "true")) matches.push(node);
        else if (sel.includes("comment-anchor") && (node.getAttribute("class")?.includes("vno-comment-anchor") || node.hasAttribute("data-comment-id"))) matches.push(node);
        else if (sel.includes("ins") && node.tagName === "INS" && node.getAttribute("data-vno-change") === "insert") matches.push(node);
        else if (sel.includes("del") && node.tagName === "DEL" && node.getAttribute("data-vno-change") === "delete") matches.push(node);
      }
      for (const ch of node.children) walk(ch);
    };
    walk(this);
    return matches;
  }
}

export async function runWriterDocumentInspectorTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.stack || err.message });
    }
  };

  test("Document Inspector: Khai báo lệnh writer.file.inspectDocument", () => {
    const cmd = WRITER_COMMANDS.find(c => c.id === "writer.file.inspectDocument");
    assert.ok(cmd, "Phải có lệnh writer.file.inspectDocument");
    assert.equal(cmd.category, "file");
  });

  test("Document Inspector: Ribbon tab Xem lại có nhóm Kiểm tra tài liệu", () => {
    const reviewTab = WRITER_RIBBON_TABS.find(t => t.id === "review");
    assert.ok(reviewTab, "Phải có tab review");
    const inspectGroup = reviewTab.groups.find(g => g.id === "inspect");
    assert.ok(inspectGroup, "Phải có nhóm inspect");
    const btn = inspectGroup.items.find(i => i.commandId === "writer.file.inspectDocument");
    assert.ok(btn, "Nhóm inspect phải chứa nút writer.file.inspectDocument");
  });

  test("Document Inspector: Đầy đủ i18n VI và EN không chứa tên thương mại cấm", () => {
    const viCmd = viStrings.commands || viStrings;
    const enCmd = enStrings.commands || enStrings;

    assert.ok(viCmd["writer.file.inspectDocument"]?.label);
    assert.ok(enCmd["writer.file.inspectDocument"]?.label);

    const forbidden = ["word", "excel", "powerpoint", "microsoft"];
    const allText = `${viCmd["writer.file.inspectDocument"].label} ${viCmd["writer.file.inspectDocument"].tooltip} ${enCmd["writer.file.inspectDocument"].label} ${enCmd["writer.file.inspectDocument"].tooltip}`.toLowerCase();
    for (const term of forbidden) {
      assert.ok(!allText.includes(term), `Chuỗi chứa tên cấm: ${term}`);
    }
  });

  test("Document Inspector: Bài Trợ giúp tiếng Việt đầy đủ và không chứa tên cấm", () => {
    const help = WRITER_HELP_ENTRIES.find(h => h.id === "writer.file.inspectDocumentHelp");
    assert.ok(help, "Phải có bài Trợ giúp writer.file.inspectDocumentHelp");
    assert.ok(help.commandIds.includes("writer.file.inspectDocument"));
    assert.ok(help.steps.length >= 3, "Phải có ít nhất 3 bước");
    assert.ok(help.summary.length > 50);

    const fullText = (help.title + " " + help.summary + " " + help.steps.join(" ")).toLowerCase();
    assert.ok(fullText.includes("kiểm tra"), "Trợ giúp phải nhắc tới kiểm tra");
    assert.ok(fullText.includes("nhận xét"), "Trợ giúp phải nhắc tới nhận xét");
    assert.ok(fullText.includes("thông tin cá nhân"), "Trợ giúp phải nhắc tới thông tin cá nhân");
  });

  test("Document Inspector: Quét chính xác 4 nhóm thông tin", () => {
    assert.equal(INSPECTOR_CATEGORIES.length, 4, "Phải có 4 nhóm kiểm tra");
    const catIds = INSPECTOR_CATEGORIES.map(c => c.id);
    assert.deepEqual(catIds, ["comments", "trackChanges", "hiddenText", "personalInfo"]);

    const mockBody = new MockDomNode("div");
    // Add 1 comment anchor
    const commentAnchor = new MockDomNode("span", { class: "vno-comment-anchor", "data-comment-id": "c1" });
    mockBody.appendChild(commentAnchor);

    // Add 1 ins and 1 del
    const insNode = new MockDomNode("ins", { "data-vno-change": "insert" });
    const delNode = new MockDomNode("del", { "data-vno-change": "delete" });
    mockBody.appendChild(insNode);
    mockBody.appendChild(delNode);

    // Add 2 hidden elements
    const hidden1 = new MockDomNode("span", { style: "display: none" });
    const hidden2 = new MockDomNode("p", { class: "vno-hidden-text" });
    mockBody.appendChild(hidden1);
    mockBody.appendChild(hidden2);

    const mockAdapter = {
      bodyDom: mockBody,
      comments: [{ id: "c1", text: "Ghi chú 1", author: "Nguyễn Văn A" }],
      _listTrackChanges: () => [insNode, delNode],
      documentProperties: {
        author: "Nguyễn Văn A",
        title: "Kế hoạch năm 2026",
        subject: "Báo cáo nội bộ",
        company: "Công ty ABC"
      }
    };

    const scan = inspectDocument(mockAdapter);
    assert.equal(scan.comments.count, 1, "Phải tìm thấy 1 nhận xét");
    assert.equal(scan.comments.found, true);

    assert.equal(scan.trackChanges.count, 2, "Phải tìm thấy 2 thay đổi theo dõi");
    assert.equal(scan.trackChanges.found, true);

    assert.equal(scan.hiddenText.count, 2, "Phải tìm thấy 2 đoạn văn bản ẩn");
    assert.equal(scan.hiddenText.found, true);

    assert.equal(scan.personalInfo.count, 4, "Phải tìm thấy 4 trường thông tin cá nhân");
    assert.equal(scan.personalInfo.found, true);
  });

  test("Document Inspector: Cho phép xóa độc lập từng nhóm thông tin", () => {
    const mockBody = new MockDomNode("div");
    const commentAnchor = new MockDomNode("span", { class: "vno-comment-anchor", "data-comment-id": "c1" });
    mockBody.appendChild(commentAnchor);
    const insNode = new MockDomNode("ins", { "data-vno-change": "insert" });
    mockBody.appendChild(insNode);
    const hidden1 = new MockDomNode("span", { style: "display: none" });
    mockBody.appendChild(hidden1);

    let trackChangesCount = 1;
    const mockAdapter = {
      bodyDom: mockBody,
      comments: [{ id: "c1", text: "Ghi chú 1", author: "Admin" }],
      _listTrackChanges: () => trackChangesCount > 0 ? [insNode] : [],
      acceptAllTrackChanges: () => { trackChangesCount = 0; insNode.remove(); },
      documentProperties: { author: "Admin", title: "Tài liệu mật" }
    };

    // 1. Chỉ xóa comments
    removeDocumentCategory(mockAdapter, "comments");
    assert.equal(mockAdapter.comments.length, 0, "Comments phải bị xóa");
    assert.equal(trackChangesCount, 1, "Track changes không được bị xóa khi chỉ chọn xóa comments");
    assert.equal(mockAdapter.documentProperties.author, "Admin", "Properties phải giữ nguyên");

    // 2. Chỉ xóa trackChanges
    removeDocumentCategory(mockAdapter, "trackChanges");
    assert.equal(trackChangesCount, 0, "Track changes phải bị xóa sau khi chọn xóa");
    assert.equal(mockAdapter.documentProperties.author, "Admin", "Properties vẫn giữ nguyên");

    // 3. Chỉ xóa hiddenText
    removeDocumentCategory(mockAdapter, "hiddenText");
    assert.equal(hidden1.removed, true, "Phần tử ẩn phải bị xóa");
    assert.equal(mockAdapter.documentProperties.author, "Admin", "Properties vẫn giữ nguyên");

    // 4. Chỉ xóa personalInfo
    removeDocumentCategory(mockAdapter, "personalInfo");
    assert.equal(mockAdapter.documentProperties.author, "", "Author phải bị xóa");
    assert.equal(mockAdapter.documentProperties.title, "", "Title phải bị xóa");

    // 5. Quét lại: tất cả đã sạch
    const rescan = inspectDocument(mockAdapter);
    assert.equal(rescan.comments.found, false);
    assert.equal(rescan.trackChanges.found, false);
    assert.equal(rescan.hiddenText.found, false);
    assert.equal(rescan.personalInfo.found, false);
  });

  return results;
}
