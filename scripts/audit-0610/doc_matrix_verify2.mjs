// D30: kiem chung cac dong ma tran con lai bang app desktop that qua CDP.
// Khong dung SendKeys/OS input; moi lan chay dung LOCALAPPDATA rieng.
// Chay: node --experimental-websocket scripts/audit-0610/doc_matrix_verify2.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { click, insertText, press, sleep } from "../../tests/live/cdp/actions.mjs";
import { readTargets } from "../../tests/live/cdp/client.mjs";

const execFileAsync = promisify(execFile);
const workRoot = await fs.mkdtemp(path.join(os.tmpdir(), "vno-d30-"));
const mergeDocx = path.join(workRoot, "d30-mail-merge.docx");
const tnr13Docx = path.join(workRoot, "d30-tnr13.docx");
const tnr14Docx = path.join(workRoot, "d30-tnr14.docx");
const draftDocx = path.join(workRoot, "d30-admin-draft.docx");
const rows = [];
let session = null;

const record = (status, row, note = "") => {
  rows.push({ status, row, note: String(note) });
  console.log(`${status} | ${row} | ${String(note).replace(/\s+/g, " ").slice(0, 260)}`);
};

const checkRow = async (row, operation) => {
  try {
    const result = await operation();
    if (result?.status === "BLOCKED") record("BLOCKED", row, result.note);
    else record(result === true || result?.ok ? "PASS" : "FAIL", row, result?.note || "khong dat assertion");
  } catch (error) {
    record("FAIL", row, `loi: ${error?.message || error}`);
  }
};

const pythonInspect = String.raw`
import sys,zipfile,re,json,html
z=zipfile.ZipFile(sys.argv[1])
x=z.read('word/document.xml').decode('utf-8','ignore')
styles=z.read('word/styles.xml').decode('utf-8','ignore') if 'word/styles.xml' in z.namelist() else ''
paras=re.findall(r'<w:p\b[\s\S]*?</w:p>',x)
def plain(xml): return html.unescape(re.sub(r'<[^>]+>','',xml))
def para(needle):
  return next((p for p in paras if needle in plain(p)), '')
def sz(p, value): return bool(re.search(r'<w:sz\b[^>]*w:val="'+str(value)+r'"',p))
def tnr(p): return 'Times New Roman' in p
def pstyle(p, name): return bool(re.search(r'<w:pStyle\b[^>]*w:val="'+name+r'"',p,re.I))
def any_pstyle(needle, name): return any(pstyle(p,name) for p in paras if needle in plain(p))
alltext=plain(x)
unicodep=para('Tiếng Việt Unicode')
country=para('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM')
report=para('BÁO CÁO KIỂM CHỨNG D30')
part1=para('Phần 1. Phạm vi')
part2=para('Phần 2. Kết quả')
print(json.dumps({
  'unicode': 'Tiếng Việt Unicode: Trường, Nguyễn, cộng hòa, số hóa.' in alltext,
  'tnr13': tnr(unicodep) and sz(unicodep,26),
  'tnr14': tnr(unicodep) and sz(unicodep,28),
  'centerCountry': bool(re.search(r'<w:jc\b[^>]*w:val="center"',country)),
  'heading1Report': any_pstyle('BÁO CÁO KIỂM CHỨNG D30','Heading1') or any_pstyle('BÁO CÁO KIỂM CHỨNG D30','heading 1'),
  'heading2Parts': (any_pstyle('Phần 1. Phạm vi','Heading2') or any_pstyle('Phần 1. Phạm vi','heading 2')) and (any_pstyle('Phần 2. Kết quả','Heading2') or any_pstyle('Phần 2. Kết quả','heading 2')),
  'toc': bool(re.search(r'TOC\s+\\',x)) or ('TOC' in x and '<w:sdt' in x),
  'pageBreaks': len(re.findall(r'w:type="page"|<w:pageBreakBefore\b',x)),
  'congVan': all(s in alltext for s in ['CÔNG VĂN','Số: 30/CV-VNO','V/v kiểm chứng tài liệu D30']),
  'quyetDinh': all(s in alltext for s in ['QUYẾT ĐỊNH','Căn cứ Nghị định số 30/2020/NĐ-CP','Điều 1. Ban hành quy trình kiểm chứng.']),
  'hopDong': all(s in alltext for s in ['HỢP ĐỒNG','BÊN A: VN Office','BÊN B: Đơn vị sử dụng']),
  'bienBan': all(s in alltext for s in ['BIÊN BẢN','Thành phần: Đại diện hai bên','Kết luận: Thống nhất kết quả kiểm chứng.']),
  'signature': all(s in alltext for s in ['TRANG KÝ TÊN','NGƯỜI LẬP','THỦ TRƯỞNG ĐƠN VỊ']),
  'recipients': 'Nơi nhận: Phòng Hành chính; Lưu: VT.' in alltext,
  'mergeNames': all(s in alltext for s in ['Nguyễn Văn D30','Trần Thị D30']),
  'mergeMarkers': 'MERGEFIELD' in x or '«HoTen»' in alltext,
  'hasText': len(alltext.strip()) > 0,
},ensure_ascii=False))
`;

async function inspectDocx(filePath) {
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", pythonInspect, filePath], {
    encoding: "utf8",
    maxBuffer: 1024 * 1024,
  });
  return JSON.parse(stdout.trim());
}

try {
  session = await launchApp("writer", {
    startTimeoutMilliseconds: 90000,
    localAppData: path.join(workRoot, "localappdata-primary"),
  });
  const ev = (expression, options) => session.cdp.evaluate(expression, options);
  const BODY = ".vno-writer-body";
  const ADAPTER = "window.__vnoAppInstance.adapter";

  await session.cdp.waitFor(
    "!!document.querySelector('.vno-writer-body') && !!globalThis.globalUnoBridge?.hasRealEngine",
    { timeoutMilliseconds: 120000, intervalMilliseconds: 300 },
  );

  const closeDialogs = async () => {
    for (let index = 0; index < 3; index += 1) {
      if (!await ev("!!document.querySelector('.vno-dialog-overlay,.vno-backstage-overlay')")) break;
      await press(session.cdp, "Escape", {}, 80);
    }
    await sleep(120);
  };

  const clickCommand = async (commandId) => {
    const tabs = await ev("[...document.querySelectorAll('[id^=\"vno-ribbon-tab-\"]')].map(el=>el.id.slice(15))");
    for (const tab of tabs) {
      await ev(`document.getElementById(${JSON.stringify(`vno-ribbon-tab-${tab}`)})?.click(); true`);
      await sleep(120);
      const clicked = await ev(`(() => {
        const nodes=[...document.querySelectorAll(${JSON.stringify(`[data-command-id="${commandId}"]`)})];
        const el=nodes.find(node=>!node.disabled && node.getClientRects().length) || nodes.find(node=>!node.disabled);
        if(!el) return false; el.click(); return true;
      })()`);
      if (clicked) { await sleep(350); return true; }
    }
    throw new Error(`khong tim thay command ${commandId}`);
  };

  const chooseRibbonValue = async (commandId, value) => {
    const tabs = await ev("[...document.querySelectorAll('[id^=\"vno-ribbon-tab-\"]')].map(el=>el.id.slice(15))");
    for (const tab of tabs) {
      await ev(`document.getElementById(${JSON.stringify(`vno-ribbon-tab-${tab}`)})?.click(); true`);
      await sleep(100);
      const changed = await ev(`(() => {
        const el=document.querySelector(${JSON.stringify(`select[data-command-id="${commandId}"]`)});
        if(!el) return false;
        el.value=${JSON.stringify(String(value))};
        el.dispatchEvent(new Event('input',{bubbles:true}));
        el.dispatchEvent(new Event('change',{bubbles:true}));
        return el.value;
      })()`);
      if (changed !== false) { await sleep(350); return changed; }
    }
    throw new Error(`khong tim thay select ${commandId}`);
  };

  const fillFocused = async (selector, value) => {
    await click(session.cdp, selector);
    await press(session.cdp, "A", { ctrl: true }, 50);
    await insertText(session.cdp, value);
  };

  const fillDocument = async (lines) => {
    await click(session.cdp, BODY);
    await press(session.cdp, "A", { ctrl: true }, 50);
    await press(session.cdp, "Backspace", {}, 80);
    for (let index = 0; index < lines.length; index += 1) {
      await insertText(session.cdp, lines[index]);
      if (index < lines.length - 1) await press(session.cdp, "Enter", {}, 50);
    }
    await sleep(500);
  };

  const selectText = async (needle, collapseAtStart = false) => {
    const selected = await ev(`(() => {
      const root=document.querySelector(${JSON.stringify(BODY)});
      const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
      let node;
      while(node=walker.nextNode()) {
        const offset=node.data.indexOf(${JSON.stringify(needle)});
        if(offset<0) continue;
        root.focus();
        const range=document.createRange();
        range.setStart(node,offset);
        range.setEnd(node,${collapseAtStart ? "offset" : `offset+${JSON.stringify(needle)}.length`});
        const selection=getSelection(); selection.removeAllRanges(); selection.addRange(range);
        return true;
      }
      return false;
    })()`);
    if (!selected) throw new Error(`khong tim thay text: ${needle}`);
  };

  const selectAllDocument = async () => {
    await ev(`document.querySelector(${JSON.stringify(BODY)}).focus(); true`);
    await press(session.cdp, "A", { ctrl: true }, 80);
  };

  const saveDocx = async (filePath) => {
    const result = await ev(
      `globalThis.globalUnoBridge.saveRealFileInPlace("writer",${ADAPTER}._contentForExport(),${JSON.stringify(filePath)},null)`,
      { timeoutMilliseconds: 1200000 },
    );
    if (result?.status !== "ok") throw new Error(`luu DOCX that bai: ${result?.status || "unknown"} ${result?.message || ""}`);
    return result;
  };

  // Trộn thư: nguồn CSV được nhập qua UI "Dán CSV / Thủ công", không mở picker hệ điều hành.
  let mailSourceReady = false;
  await checkRow("Thư tín/Nguồn CSV/Excel", async () => {
    await fillDocument(["Kính gửi: "]);
    await clickCommand("writer.mailMerge.open");
    await session.cdp.waitFor("!!document.querySelector('.vno-merge-toggle-paste-btn')", { timeoutMilliseconds: 10000 });
    await click(session.cdp, ".vno-merge-toggle-paste-btn");
    await fillFocused(".vno-merge-csv-textarea", "HoTen,DonVi\nNguyễn Văn D30,Phòng Một\nTrần Thị D30,Phòng Hai");
    await click(session.cdp, ".vno-merge-apply-paste-btn");
    const preview = await ev("({rows:document.querySelectorAll('.vno-merge-tbody tr').length,status:document.querySelector('.vno-merge-status-badge')?.textContent||''})");
    await click(session.cdp, ".vno-dialog-save-btn");
    await session.cdp.waitFor("!document.querySelector('#vno-merge-ds-title')", { timeoutMilliseconds: 5000 });
    const state = await ev(`({fields:${ADAPTER}.mailMergeData.fields,records:${ADAPTER}.mailMergeData.records.map(r=>r.HoTen)})`);
    mailSourceReady = state.fields.includes("HoTen") && state.records.length === 2;
    return { ok: mailSourceReady && preview.rows === 2, note: `fields=${state.fields.join(",")} records=${state.records.join("/")} ${preview.status}` };
  });

  let mergeFieldReady = false;
  await checkRow("Thư tín/Trường trộn thư", async () => {
    if (!mailSourceReady) return { ok: false, note: "nguon CSV khong san sang" };
    await selectText("Kính gửi: ");
    await ev(`(() => { const s=getSelection(),r=s.getRangeAt(0); r.collapse(false); s.removeAllRanges(); s.addRange(r); })()`);
    await clickCommand("writer.mailMerge.insertField");
    await session.cdp.waitFor("!!document.querySelector('#vno-merge-field-select')", { timeoutMilliseconds: 10000 });
    await ev(`(() => { const el=document.querySelector('#vno-merge-field-select'); el.value='HoTen'; el.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await click(session.cdp, ".vno-dialog-insert-btn");
    mergeFieldReady = await ev("!!document.querySelector('.vno-writer-body .vno-merge-field[data-field=\"HoTen\"]')");
    return { ok: mergeFieldReady, note: await ev("document.querySelector('.vno-writer-body')?.innerText||''") };
  });

  await checkRow("Thư tín/Xem trước bản ghi", async () => {
    if (!mergeFieldReady) return { ok: false, note: "truong tron thu chua duoc chen" };
    await clickCommand("writer.mailMerge.preview");
    const state = await ev(`({enabled:${ADAPTER}.mailMergePreview.enabled,index:${ADAPTER}.mailMergePreview.recordIndex,text:document.querySelector('.vno-writer-body')?.innerText||''})`);
    return { ok: state.enabled && state.index === 0 && state.text.includes("Nguyễn Văn D30"), note: JSON.stringify(state) };
  });

  await checkRow("Thư tín/Bản ghi sau", async () => {
    await clickCommand("writer.mailMerge.nextRecord");
    const state = await ev(`({index:${ADAPTER}.mailMergePreview.recordIndex,text:document.querySelector('.vno-writer-body')?.innerText||''})`);
    return { ok: state.index === 1 && state.text.includes("Trần Thị D30"), note: JSON.stringify(state) };
  });

  await checkRow("Thư tín/Bản ghi trước", async () => {
    await clickCommand("writer.mailMerge.prevRecord");
    const state = await ev(`({index:${ADAPTER}.mailMergePreview.recordIndex,text:document.querySelector('.vno-writer-body')?.innerText||''})`);
    return { ok: state.index === 0 && state.text.includes("Nguyễn Văn D30"), note: JSON.stringify(state) };
  });

  let finishDialogReady = false;
  await checkRow("Thư tín/Hoàn tất trộn", async () => {
    if (await ev(`${ADAPTER}.mailMergePreview.enabled===true`)) {
      await clickCommand("writer.mailMerge.preview");
    }
    await clickCommand("writer.mailMerge.finish");
    await session.cdp.waitFor("!!document.querySelector('#vno-merge-finish-title')", { timeoutMilliseconds: 10000 });
    const state = await ev("({title:document.querySelector('#vno-merge-finish-title')?.textContent||'',all:document.querySelector('input[name=\"vno-merge-range\"][value=\"all\"]')?.checked,doc:document.querySelector('input[name=\"vno-merge-mode\"][value=\"document\"]')?.checked,text:document.querySelector('.vno-dialog-box')?.innerText||''})");
    finishDialogReady = state.all && state.doc && /2 bản ghi/.test(state.text);
    return { ok: finishDialogReady, note: `${state.title}; all=${state.all}; document=${state.doc}` };
  });

  await checkRow("Thư tín/Trộn ra tài liệu", async () => {
    if (!finishDialogReady) return { ok: false, note: "hop thoai Hoan tat tron chua san sang" };
    await click(session.cdp, ".vno-dialog-submit-btn");
    await sleep(800);
    const body = await ev("document.querySelector('.vno-writer-body')?.innerText||''");
    await closeDialogs();
    await saveDocx(mergeDocx);
    const xml = await inspectDocx(mergeDocx);
    return { ok: body.includes("Nguyễn Văn D30") && body.includes("Trần Thị D30") && xml.mergeNames && xml.pageBreaks >= 1 && !xml.mergeMarkers, note: `names=${xml.mergeNames} pageBreaks=${xml.pageBreaks} markers=${xml.mergeMarkers}` };
  });

  // Quản lý nguồn trích dẫn và định dạng APA qua đúng dialog/ribbon.
  let citationSourceReady = false;
  await checkRow("Tham chiếu/Quản lý nguồn", async () => {
    await clickCommand("writer.reference.sourcesManage");
    await session.cdp.waitFor("!!document.querySelector('.vno-source-list')", { timeoutMilliseconds: 10000 });
    await click(session.cdp, ".vno-add-source");
    await session.cdp.waitFor("!!document.querySelector('.vno-citation-form input[name=\"author\"]')", { timeoutMilliseconds: 10000 });
    await fillFocused('.vno-citation-form input[name="author"]', "Nguyễn Văn D30");
    await fillFocused('.vno-citation-form input[name="title"]', "Tài liệu kiểm chứng D30");
    await fillFocused('.vno-citation-form input[name="year"]', "2026");
    await fillFocused('.vno-citation-form input[name="publisher"]', "VN Office");
    await click(session.cdp, ".vno-save-source");
    await session.cdp.waitFor("!![...document.querySelectorAll('.vno-source-row')].find(r=>r.innerText.includes('Nguyễn Văn D30'))", { timeoutMilliseconds: 10000 });
    await click(session.cdp, ".vno-apply-sources");
    await session.cdp.waitFor(`${ADAPTER}.citationSources.length===1`, { timeoutMilliseconds: 10000 });
    const state = await ev(`${ADAPTER}.citationSources.map(s=>({author:s.author,title:s.title,year:s.year}))`);
    citationSourceReady = state.length === 1 && state[0].title === "Tài liệu kiểm chứng D30";
    return { ok: citationSourceReady, note: JSON.stringify(state) };
  });

  await checkRow("Tham chiếu/Kiểu APA/MLA", async () => {
    if (!citationSourceReady) return { ok: false, note: "nguon trich dan chua san sang" };
    await chooseRibbonValue("writer.reference.citationStyle", "mla");
    await chooseRibbonValue("writer.reference.citationStyle", "apa");
    await fillDocument(["Trích dẫn kiểm chứng: "]);
    await selectText("Trích dẫn kiểm chứng: ");
    await ev("(() => { const s=getSelection(),r=s.getRangeAt(0); r.collapse(false); s.removeAllRanges(); s.addRange(r); })()");
    await clickCommand("writer.reference.citationInsert");
    await session.cdp.waitFor("!!document.querySelector('.vno-source-select')", { timeoutMilliseconds: 10000 });
    await click(session.cdp, ".vno-insert-citation");
    const state = await ev(`({style:${ADAPTER}.citationStyle,text:document.querySelector('.vno-citation-field')?.textContent||''})`);
    return { ok: state.style === "apa" && state.text === "(Nguyễn, 2026)", note: JSON.stringify(state) };
  });

  // Mẫu hành chính có sẵn phải tạo nội dung, không chỉ đổi tên tab tài liệu.
  await checkRow("Trang đầu/Mẫu hành chính", async () => {
    await fillDocument([""]);
    await press(session.cdp, "F", { alt: true }, 300);
    await session.cdp.waitFor("!!document.querySelector('.vno-backstage-overlay')", { timeoutMilliseconds: 10000 });
    await click(session.cdp, '.vno-template-card[data-template-id="admin_doc"]');
    await sleep(500);
    const state = await ev("({name:document.querySelector('.vno-doc-tab span')?.textContent||'',text:document.querySelector('.vno-writer-body')?.innerText.trim()||''})");
    const hasTemplateContent = /CỘNG HÒA|QUYẾT ĐỊNH|Nơi nhận/.test(state.text);
    return { ok: /Quyết định/.test(state.name) && hasTemplateContent, note: `ten=${state.name}; noiDungMau=${hasTemplateContent}; chars=${state.text.length}` };
  });

  const adminLines = [
    "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM",
    "Độc lập - Tự do - Hạnh phúc",
    "Số: 30/CV-VNO",
    "CÔNG VĂN",
    "V/v kiểm chứng tài liệu D30",
    "Nơi nhận: Phòng Hành chính; Lưu: VT.",
    "QUYẾT ĐỊNH",
    "Căn cứ Nghị định số 30/2020/NĐ-CP;",
    "Điều 1. Ban hành quy trình kiểm chứng.",
    "HỢP ĐỒNG",
    "BÊN A: VN Office",
    "BÊN B: Đơn vị sử dụng",
    "BIÊN BẢN",
    "Thành phần: Đại diện hai bên",
    "Kết luận: Thống nhất kết quả kiểm chứng.",
    "BÁO CÁO KIỂM CHỨNG D30",
    "Phần 1. Phạm vi",
    "Nội dung báo cáo có mục lục tự động.",
    "Phần 2. Kết quả",
    "Kết quả được lưu trong tài liệu.",
    "Tiếng Việt Unicode: Trường, Nguyễn, cộng hòa, số hóa.",
    "TRANG KÝ TÊN",
    "NGƯỜI LẬP",
    "THỦ TRƯỞNG ĐƠN VỊ",
    "saiiichinhta",
  ];

  let adminTyped = false;
  await checkRow("Trang đầu/Gõ tiếng Việt Unicode", async () => {
    await fillDocument(adminLines);
    const text = await ev("document.querySelector('.vno-writer-body')?.innerText||''");
    adminTyped = adminLines.every(line => text.includes(line));
    return { ok: adminTyped && text.includes("Tiếng Việt Unicode: Trường, Nguyễn, cộng hòa, số hóa."), note: `dong=${adminLines.length}; unicode=${text.includes('Trường, Nguyễn, cộng hòa, số hóa')}` };
  });

  let xml13 = null;
  await checkRow("Trang đầu/Chuẩn hóa TNR 13", async () => {
    if (!adminTyped) return { ok: false, note: "noi dung hanh chinh chua duoc nhap" };
    await selectAllDocument();
    await chooseRibbonValue("writer.font.family", "Times New Roman");
    await selectAllDocument();
    await chooseRibbonValue("writer.font.size", "13");
    await saveDocx(tnr13Docx);
    xml13 = await inspectDocx(tnr13Docx);
    return { ok: xml13.tnr13 && xml13.unicode, note: `TNR13=${xml13.tnr13}; unicodeXML=${xml13.unicode}` };
  });

  let xml14 = null;
  await checkRow("Trang đầu/Chuẩn hóa TNR 14", async () => {
    await selectAllDocument();
    await chooseRibbonValue("writer.font.size", "14");
    await saveDocx(tnr14Docx);
    xml14 = await inspectDocx(tnr14Docx);
    return { ok: xml14.tnr14 && xml14.unicode, note: `TNR14=${xml14.tnr14}; unicodeXML=${xml14.unicode}` };
  });

  // Khôi phục toàn văn 13pt, rồi tạo các cấu trúc hành chính qua ribbon.
  await selectAllDocument();
  await chooseRibbonValue("writer.font.size", "13");
  for (const centered of [adminLines[0], adminLines[1]]) {
    await selectText(centered);
    await clickCommand("writer.para.alignCenter");
  }
  for (const boldText of ["CÔNG VĂN", "QUYẾT ĐỊNH", "HỢP ĐỒNG", "BIÊN BẢN", "NGƯỜI LẬP", "THỦ TRƯỞNG ĐƠN VỊ"]) {
    await selectText(boldText);
    await clickCommand("writer.text.bold");
  }
  const applyStyle = async (text, styleId) => {
    await selectText(text);
    await clickCommand("writer.style.gallery");
    await session.cdp.waitFor("!!document.querySelector('.vno-style-gallery-dropdown')", { timeoutMilliseconds: 10000 });
    await click(session.cdp, `.vno-style-gallery-dropdown [data-style-id="${styleId}"]`);
    await sleep(300);
  };
  await applyStyle("BÁO CÁO KIỂM CHỨNG D30", "h1");
  for (const heading of ["Phần 1. Phạm vi", "Phần 2. Kết quả"]) {
    await applyStyle(heading, "h2");
  }
  await selectText("BÁO CÁO KIỂM CHỨNG D30", true);
  await clickCommand("writer.reference.tocInsert");
  await selectText("TRANG KÝ TÊN", true);
  await clickCommand("writer.page.break");
  await sleep(1200);
  await saveDocx(draftDocx);
  const draftXml = await inspectDocx(draftDocx);

  await checkRow("Trang đầu/Soạn công văn", async () => ({ ok: draftXml.congVan, note: `DOCX congVan=${draftXml.congVan}` }));
  await checkRow("Trang đầu/Soạn quyết định", async () => ({ ok: draftXml.quyetDinh, note: `DOCX quyetDinh=${draftXml.quyetDinh}` }));
  await checkRow("Trang đầu/Soạn hợp đồng", async () => ({ ok: draftXml.hopDong, note: `DOCX hopDong=${draftXml.hopDong}` }));
  await checkRow("Trang đầu/Soạn biên bản", async () => ({ ok: draftXml.bienBan, note: `DOCX bienBan=${draftXml.bienBan}` }));
  await checkRow("Trang đầu/Soạn báo cáo có mục lục", async () => ({ ok: draftXml.toc && draftXml.heading1Report && draftXml.heading2Parts, note: `TOC=${draftXml.toc}; H1=${draftXml.heading1Report}; H2=${draftXml.heading2Parts}` }));
  await checkRow("Trang đầu/Tạo trang ký tên", async () => ({ ok: draftXml.signature && draftXml.pageBreaks >= 1, note: `signature=${draftXml.signature}; pageBreaks=${draftXml.pageBreaks}` }));
  await checkRow("Trang đầu/Thêm nơi nhận", async () => ({ ok: draftXml.recipients, note: `noiNhan=${draftXml.recipients}` }));
  await checkRow("Trang đầu/Căn giữa quốc hiệu", async () => ({ ok: draftXml.centerCountry, note: `w:jc center=${draftXml.centerCountry}` }));

  await checkRow("Xem lại/Ngôn ngữ kiểm lỗi", async () => {
    await session.cdp.waitFor("document.querySelector('.vno-writer-page')?.dataset.spellcheckStatus==='ready'", { timeoutMilliseconds: 20000 });
    const enabled = await ev("window.__vnoAppInstance.spellcheckController?.enabled===true");
    if (enabled) await clickCommand("writer.review.toggleSpellCheck");
    await session.cdp.waitFor("window.__vnoAppInstance.spellcheckController?.enabled===false", { timeoutMilliseconds: 5000 });
    await clickCommand("writer.review.toggleSpellCheck");
    await session.cdp.waitFor("!!document.querySelector('[data-vno-spelling-uncertain]')", { timeoutMilliseconds: 10000 });
    const state = await ev("({enabled:window.__vnoAppInstance.spellcheckController?.enabled===true,marker:document.querySelector('[data-vno-spelling-uncertain]')?.textContent||'',status:document.querySelector('.vno-statusbar-left')?.innerText||''})");
    return { ok: state.enabled && state.marker.includes("saiiichinhta") && /Tiếng Việt/.test(state.status), note: JSON.stringify(state) };
  });

  await checkRow("Xem/Trang hiện tại/thanh trạng thái", async () => {
    await selectText("TRANG KÝ TÊN", true);
    await sleep(800);
    const state = await ev(`(() => {
      const body=document.querySelector('.vno-writer-body');
      const caret=getSelection()?.rangeCount ? getSelection().getRangeAt(0).startContainer : null;
      const gaps=[...body.querySelectorAll('[data-vno-auto-page-gap="true"]')];
      return {
        visible:!!document.querySelector('.vno-statusbar-left')?.getClientRects().length,
        text:document.querySelector('.vno-statusbar-left')?.innerText||'',
        pages:window.__vnoAppInstance.adapter._livePageCount||1,
        caretPage:1+gaps.filter(g=>caret && (g.compareDocumentPosition(caret)&Node.DOCUMENT_POSITION_FOLLOWING)).length
      };
    })()`);
    const match = state.text.match(/Trang\s+(\d+)\s*\/\s*(\d+)/i);
    const current = Number(match?.[1] || 0), total = Number(match?.[2] || 0);
    return { ok: state.visible && state.pages >= 2 && total === state.pages && current === state.caretPage, note: `status=${state.text}; livePages=${state.pages}; caretExpectedPage=${state.caretPage}` };
  });

  await checkRow("Xem/Cửa sổ mới", async () => {
    const before = (await readTargets(session.debugPort)).filter(target => target.type === "page").map(target => target.id);
    await clickCommand("writer.view.newWindow");
    let after = before;
    for (let attempt = 0; attempt < 20; attempt += 1) {
      after = (await readTargets(session.debugPort)).filter(target => target.type === "page").map(target => target.id);
      if (after.some(id => !before.includes(id))) break;
      await sleep(250);
    }
    const status = await ev("document.querySelector('.vno-statusbar-left')?.innerText||''");
    return { ok: after.some(id => !before.includes(id)), note: `targets ${before.length}->${after.length}; status=${status}` };
  });

  await session.close();
  session = null;

  // Mở lại DOCX thật để dòng "lưu bản nháp không mất format" có bằng chứng reopen, không chỉ XML.
  session = await launchApp("writer", {
    filePath: draftDocx,
    startTimeoutMilliseconds: 90000,
    readyTimeoutMilliseconds: 90000,
    localAppData: path.join(workRoot, "localappdata-reopen"),
  });
  const reopenEv = (expression, options) => session.cdp.evaluate(expression, options);
  await session.cdp.waitFor(
    "document.querySelector('.vno-writer-body')?.innerText.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM')",
    { timeoutMilliseconds: 120000, intervalMilliseconds: 300 },
  );
  await checkRow("Trang đầu/Lưu bản nháp không mất format", async () => {
    const reopened = await reopenEv(`(() => {
      const blocks=[...document.querySelectorAll('.vno-writer-body p,.vno-writer-body h1,.vno-writer-body h2')];
      const country=blocks.find(el=>el.innerText.includes('CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM'));
      const unicode=blocks.find(el=>el.innerText.includes('Tiếng Việt Unicode'));
      const report=blocks.find(el=>el.innerText.includes('BÁO CÁO KIỂM CHỨNG D30'));
      return {
        text:document.querySelector('.vno-writer-body')?.innerText||'',
        countryAlign:country?getComputedStyle(country).textAlign:'',
        unicodeFont:unicode?getComputedStyle(unicode).fontFamily:'',
        unicodeSize:unicode?getComputedStyle(unicode).fontSize:'',
        reportTag:report?.tagName||'',
      };
    })()`);
    const contentOk = ["CÔNG VĂN", "QUYẾT ĐỊNH", "HỢP ĐỒNG", "BIÊN BẢN", "TRANG KÝ TÊN"].every(token => reopened.text.includes(token));
    const reopenedFormat = reopened.countryAlign === "center" && /Times New Roman/i.test(reopened.unicodeFont) && reopened.reportTag === "H1";
    const xmlFormat = draftXml.centerCountry && draftXml.tnr13 && draftXml.toc && draftXml.pageBreaks >= 1;
    return { ok: contentOk && reopenedFormat && xmlFormat, note: `content=${contentOk}; align=${reopened.countryAlign}; font=${reopened.unicodeFont}/${reopened.unicodeSize}; report=${reopened.reportTag}; XML=${xmlFormat}` };
  });
} catch (error) {
  console.error("FATAL | doc_matrix_verify2 |", error?.stack || error);
  process.exitCode = 1;
} finally {
  if (session) await session.close().catch(error => console.error("CLEANUP |", error?.message || error));
}

const pass = rows.filter(row => row.status === "PASS").length;
const fail = rows.filter(row => row.status === "FAIL").length;
const blocked = rows.filter(row => row.status === "BLOCKED").length;
console.log(`TONG: ${rows.length} dong | PASS ${pass} | FAIL ${fail} | BLOCKED ${blocked}`);
console.log(`ARTIFACTS: ${workRoot}`);
if (fail || blocked) process.exitCode = 1;
