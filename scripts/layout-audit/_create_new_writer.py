"""Usage: python _create_new_writer.py <worktree> <out.docx>
Chieu "tao moi trong VN Writer -> luu DOCX": mo app Writer KHONG co file, dung DOM truc tiep
de tao noi dung, luu qua common.file.save (hop thoai native bi thay),
ghi <out.docx> + <out>.expected.json (gia tri mong doi de _word_readback.ps1 doi chieu bang Word COM)."""
import sys, time, os, json, base64
ROOT, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
scenario_idx = 1
if "--scenario" in sys.argv:
    _s_pos = sys.argv.index("--scenario")
    if _s_pos + 1 < len(sys.argv):
        scenario_idx = int(sys.argv[_s_pos + 1])
if os.path.exists(OUT):
    try:
        os.remove(OUT)
    except Exception:
        pass
sys.path.insert(0, ROOT)
import webview
import main as vnmain

server, port = vnmain._start_static_server()
api = vnmain.VnOfficeApi(app_kind="writer", initial_file=None)
_orig_save = api.save_document_dialog
def _dump_save(content, *a, **k):
    with open(OUT + ".sent.html", "w", encoding="utf-8") as f:
        f.write(content)
    return _orig_save(content, *a, **k)
api.save_document_dialog = _dump_save
window = webview.create_window(title="VN Writer - Create New", url=vnmain.build_launch_url("writer", None, port=port), width=1400, height=900, js_api=api)

# PNG 1x1 do (red pixel) base64 de chen inline
PNG_1X1_RED = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

SCENARIO = r"""
(async function(){
  try {
    const PNG_1X1_RED = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const app = window.__vnoAppInstance; if (!app) return 'no-app';
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    const adapter = app.adapter;
    const body = adapter.bodyDom || app.editorDom; if (!body) return 'no-body';
    const header = adapter.headerDom;
    const footer = adapter.footerDom;
    
    // Clear body
    body.innerHTML = '';
    
    // --- 1. Tieu de: 16pt, dam, can giua, Times New Roman ---
    const h1 = document.createElement('h1');
    h1.style.textAlign = 'center';
    h1.style.fontFamily = 'Times New Roman';
    h1.style.fontSize = '16pt';
    h1.style.fontWeight = 'bold';
    h1.textContent = "Tiêu đề 16pt đậm căn giữa Times New Roman";
    body.appendChild(h1);
    
    // --- 2. Doan thuong: 13pt, gian dong 1.5 ---
    const p1 = document.createElement('p');
    p1.style.fontSize = '13pt';
    p1.style.lineHeight = '1.5';
    p1.textContent = "Đoạn thường 13pt giãn dòng 1.5";
    body.appendChild(p1);
    
    // --- 3. Doan nghieng/gach chan/mau do ---
    const p2 = document.createElement('p');
    p2.style.fontSize = '13pt';
    p2.style.lineHeight = '1.5';
    p2.style.fontStyle = 'italic';
    p2.style.textDecoration = 'underline';
    p2.style.color = '#FF0000';
    p2.textContent = "Đoạn nghiêng/gạch chân/màu đỏ";
    body.appendChild(p2);
    
    // --- 4. Doan thut le dau dong 1.27 cm ---
    const p3 = document.createElement('p');
    p3.style.fontSize = '13pt';
    p3.style.lineHeight = '1.5';
    p3.style.textIndent = '1.27cm';
    p3.textContent = "Đoạn thụt lề đầu dòng 1.27 cm";
    body.appendChild(p3);
    
    // --- 5. Danh sach gach dau dong 3 muc ---
    const ul = document.createElement('ul');
    ['Mục 1', 'Mục 2', 'Mục 3'].forEach(text => {
      const li = document.createElement('li');
      li.style.fontSize = '13pt';
      li.style.lineHeight = '1.5';
      li.textContent = text;
      ul.appendChild(li);
    });
    body.appendChild(ul);
    
    // --- 6. Danh sach so 3 muc ---
    const ol = document.createElement('ol');
    ['Số 1', 'Số 2', 'Số 3'].forEach(text => {
      const li = document.createElement('li');
      li.style.fontSize = '13pt';
      li.style.lineHeight = '1.5';
      li.textContent = text;
      ol.appendChild(li);
    });
    body.appendChild(ol);
    
    // --- 7. Bang 3x3 co vien va o gop ---
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.margin = '14pt 0';
    for (let r = 0; r < 3; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < 3; c++) {
        const td = document.createElement('td');
        td.style.border = '1px solid #000000';
        td.style.padding = '6pt 10pt';
        if (r === 0 && c === 0) {
          td.textContent = 'Ô gộp';
          td.setAttribute('colspan', '2');
        } else if (r === 0 && c === 1) {
          continue; // skip - merged
        } else {
          td.textContent = `Hàng ${r}, Cột ${c}`;
        }
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    body.appendChild(table);
    
    // --- 8. Anh PNG nho chen inline ---
    // Note: data URI images may not export to DOCX via LibreOffice HTML import
    // This is a known limitation - we still add it for DOM verification
    const pImg = document.createElement('p');
    const img = document.createElement('img');
    img.src = 'data:image/png;base64,' + PNG_1X1_RED;
    img.width = 20;
    img.height = 20;
    img.style.verticalAlign = 'middle';
    pImg.appendChild(img);
    pImg.appendChild(document.createTextNode(' [Ảnh inline]'));
    body.appendChild(pImg);
    
    // --- 9. Ngat trang (section break next page) roi doan trang 2 ---
    // Insert section break marker directly (like insertSectionBreak does)
    const sectionId = 'section-2';
    const breakStyle = 'break-before:page;page-break-before:always;';
    const marker = '<div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="' + sectionId + '" contenteditable="false" style="' + breakStyle + 'border-top:2px double #7c3aed;margin:20px 0;text-align:center;color:#6d28d9;font-size:11px;user-select:none">--- Ngắt mục (Trang kế tiếp) ---</div><p><br></p>';
    body.insertAdjacentHTML('beforeend', marker);
    
    const pPage2 = document.createElement('p');
    pPage2.style.fontSize = '13pt';
    pPage2.style.lineHeight = '1.5';
    pPage2.textContent = "Đoạn trên trang 2 sau ngắt trang";
    body.appendChild(pPage2);
    
    // --- 10. Header "VN Office" va Footer so trang ---
    if (header) {
      header.innerHTML = '<p style="text-align:center; font-size:10pt; margin:0;">VN Office</p>';
    }
    if (footer) {
      footer.innerHTML = '<p style="text-align:center; font-size:10pt; margin:0;">Trang <span class="vno-page-number">1</span></p>';
    }
    
    // --- 11. Le trang 2/2/3/2 cm, kho A4 ---
    // Set page setup BEFORE section break so both sections get correct margins
    adapter.setPageSetup({
      size: 'a4',
      orientation: 'portrait',
      margins: { top: 20, bottom: 20, left: 30, right: 20 }
    });
    // Also update the new section's setup
    adapter.sectionPageSetups[sectionId] = JSON.parse(JSON.stringify({ 
      size: 'a4', 
      orientation: 'portrait', 
      margins: { top: 20, bottom: 20, left: 30, right: 20 } 
    }));
    
    // Mark dirty so save works
    adapter.isDirty = true;
    
    return 'ok';
  } catch (e) {
    return 'error: ' + (e && e.stack ? e.stack : String(e));
  }
})()
"""

EXPECTED = {
    "title": {
        "text": "Tiêu đề 16pt đậm căn giữa Times New Roman",
        "font": "Times New Roman",
        "size": 16,
        "bold": True,
        "alignment": "center"
    },
    "para1": {
        "text": "Đoạn thường 13pt giãn dòng 1.5",
        "size": 13,
        "lineSpacing": 1.5,
        "lineSpacingRule": "1.5 lines"
    },
    "para2": {
        "text": "Đoạn nghiêng/gạch chân/màu đỏ",
        "italic": True,
        "underline": True,
        "color": "#FF0000"
    },
    "para3": {
        "text": "Đoạn thụt lề đầu dòng 1.27 cm",
        "firstLineIndentCm": 1.27
    },
    "bulletList": {
        "items": ["Mục 1", "Mục 2", "Mục 3"],
        "listType": "bullet"
    },
    "numberedList": {
        "items": ["Số 1", "Số 2", "Số 3"],
        "listType": "numbered"
    },
    "table": {
        "rows": 3,
        "cols": 3,
        "borders": True,
        "mergedCell": {"row": 1, "col": 1, "colspan": 2, "text": "Ô gộp"}
    },
    "image": {
        "inlineShapesCount": 1
    },
    "pageBreak": {
        "pageCount": 2,
        "page2Text": "Đoạn trên trang 2 sau ngắt trang"
    },
    "header": {
        "text": "VN Office",
        "alignment": "center"
    },
    "footer": {
        "hasPageNumber": True
    },
    "pageSetup": {
        "topMarginMm": 20,
        "bottomMarginMm": 20,
        "leftMarginMm": 30,
        "rightMarginMm": 20,
        "pageWidthMm": 210,
        "pageHeightMm": 297
    }
}

SCENARIO2 = r"""
(async function(){
  try {
    const app = window.__vnoAppInstance; if (!app) return 'no-app';
    const adapter = app.adapter;
    const body = adapter.bodyDom || app.editorDom; if (!body) return 'no-body';
    
    // Clear body
    body.innerHTML = '';
    
    // --- 1. Doan canh deu (justify), doan canh phai (right) ---
    const pJustify = document.createElement('p');
    pJustify.style.textAlign = 'justify';
    pJustify.textContent = "Đoạn canh đều hai bên (justify)";
    body.appendChild(pJustify);
    
    const pRight = document.createElement('p');
    pRight.style.textAlign = 'right';
    pRight.textContent = "Đoạn canh phải (right)";
    body.appendChild(pRight);
    
    // --- 2. Khoang cach doan truoc 6pt / sau 12pt ---
    const pSpacing = document.createElement('p');
    pSpacing.style.marginTop = '6pt';
    pSpacing.style.marginBottom = '12pt';
    pSpacing.textContent = "Đoạn khoảng cách trước 6pt và sau 12pt";
    body.appendChild(pSpacing);
    
    // --- 3. Gian dong: Exactly / At least (khong co lenh trong app, bo qua) ---
    
    // --- 4. Thut le trai 2cm + treo (hanging) 1cm ---
    const pHanging = document.createElement('p');
    pHanging.style.marginLeft = '2cm';
    pHanging.style.textIndent = '-1cm';
    pHanging.textContent = "Đoạn thụt lề trái 2cm và thụt lề treo 1cm";
    body.appendChild(pHanging);
    
    // --- 5. Chu dam + nghieng + gach chan cung run; gach ngang; x2 super; H2O sub; highlight vang ---
    const pStyles = document.createElement('p');
    
    const bRun = document.createElement('b');
    bRun.style.fontWeight = 'bold';
    const iRun = document.createElement('i');
    iRun.style.fontStyle = 'italic';
    const uRun = document.createElement('u');
    uRun.style.textDecoration = 'underline';
    uRun.textContent = "Chữ đậm nghiêng gạch chân";
    iRun.appendChild(uRun);
    bRun.appendChild(iRun);
    pStyles.appendChild(bRun);
    pStyles.appendChild(document.createTextNode(' '));
    
    const sRun = document.createElement('s');
    sRun.style.textDecoration = 'line-through';
    sRun.textContent = "Chữ gạch ngang";
    pStyles.appendChild(sRun);
    pStyles.appendChild(document.createTextNode(' '));
    
    const spanSuper = document.createElement('span');
    spanSuper.appendChild(document.createTextNode('x'));
    const sup = document.createElement('sup');
    sup.textContent = '2';
    spanSuper.appendChild(sup);
    pStyles.appendChild(spanSuper);
    pStyles.appendChild(document.createTextNode(' '));
    
    const spanSub = document.createElement('span');
    spanSub.appendChild(document.createTextNode('H'));
    const sub = document.createElement('sub');
    sub.textContent = '2';
    spanSub.appendChild(sub);
    spanSub.appendChild(document.createTextNode('O'));
    pStyles.appendChild(spanSub);
    pStyles.appendChild(document.createTextNode(' '));
    
    const markRun = document.createElement('mark');
    markRun.style.backgroundColor = '#FFFF00';
    markRun.textContent = "Chữ highlight vàng";
    pStyles.appendChild(markRun);
    
    body.appendChild(pStyles);
    
    // --- 6. Font khac nhau trong 1 doan: Arial 11pt + Times New Roman 14pt + mau xanh #0070C0 ---
    const pFonts = document.createElement('p');
    const spanArial = document.createElement('span');
    spanArial.style.fontFamily = 'Arial';
    spanArial.style.fontSize = '11pt';
    spanArial.textContent = "Chữ Arial 11pt";
    pFonts.appendChild(spanArial);
    pFonts.appendChild(document.createTextNode(' '));
    
    const spanTnr = document.createElement('span');
    spanTnr.style.fontFamily = 'Times New Roman';
    spanTnr.style.fontSize = '14pt';
    spanTnr.style.color = '#0070C0';
    spanTnr.textContent = "Chữ Times New Roman 14pt màu xanh";
    pFonts.appendChild(spanTnr);
    body.appendChild(pFonts);
    
    // --- 7. Lien ket https://example.com voi chu "Trang chu" ---
    const pLink = document.createElement('p');
    const a = document.createElement('a');
    a.href = 'https://example.com';
    a.textContent = "Trang chủ";
    pLink.appendChild(a);
    body.appendChild(pLink);
    
    // --- 8. Danh sach danh so bat dau lai tu 1 sau mot doan thuong ---
    const ol1 = document.createElement('ol');
    ['Mục 1.1', 'Mục 1.2'].forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      ol1.appendChild(li);
    });
    body.appendChild(ol1);
    
    const pMidList = document.createElement('p');
    pMidList.textContent = "Đoạn văn giữa hai danh sách đánh số";
    body.appendChild(pMidList);
    
    const ol2 = document.createElement('ol');
    ol2.setAttribute('start', '1');
    ['Mục 2.1', 'Mục 2.2'].forEach(t => {
      const li = document.createElement('li');
      li.textContent = t;
      ol2.appendChild(li);
    });
    body.appendChild(ol2);
    
    // --- 9. Danh sach 2 cap (muc con thut vao) ---
    const ulMulti = document.createElement('ul');
    const liParent = document.createElement('li');
    liParent.textContent = "Mục cấp 1";
    const ulSub = document.createElement('ul');
    const liChild = document.createElement('li');
    liChild.textContent = "Mục cấp 2";
    ulSub.appendChild(liChild);
    liParent.appendChild(ulSub);
    ulMulti.appendChild(liParent);
    body.appendChild(ulMulti);
    
    // --- 10. Bang 3x3: o nen xam #D9D9D9, chu o tieu de dam can giua, be rong cot 1 = 3cm ---
    const tbl = document.createElement('table');
    tbl.style.width = '100%';
    tbl.style.borderCollapse = 'collapse';
    tbl.style.margin = '14pt 0';
    for (let r = 0; r < 3; r++) {
      const tr = document.createElement('tr');
      for (let c = 0; c < 3; c++) {
        const td = document.createElement('td');
        td.style.border = '1px solid #000000';
        td.style.padding = '6pt 10pt';
        if (r === 0) {
          td.style.backgroundColor = '#D9D9D9';
          td.style.fontWeight = 'bold';
          td.style.textAlign = 'center';
          td.textContent = `Tiêu đề ${c + 1}`;
          if (c === 0) {
            td.style.width = '3cm';
          }
        } else {
          td.textContent = `Dữ liệu ${r}.${c + 1}`;
        }
        tr.appendChild(td);
      }
      tbl.appendChild(tr);
    }
    body.appendChild(tbl);
    
    // --- 15. Ky tu dac biet / tieng Viet co dau to hop: "Nguyen Van On - DAI HOC" (NFC) ---
    const pNfc = document.createElement('p');
    pNfc.textContent = ("Nguy\u1EC5n V\u0103n \u01A0n \u2013 \u0110\u1EA0I H\u1ECCC").normalize('NFC');
    body.appendChild(pNfc);
    
    // --- 16. Tab stop 5cm + doan dung Tab ---
    const pTab = document.createElement('p');
    pTab.style.tabSize = '5cm';
    pTab.textContent = "Cột 1\tCột 2 sau Tab 5cm";
    body.appendChild(pTab);
    
    // --- 13. Ngat trang thuong (Ctrl+Enter, khong ngat muc) ---
    const pBreak = document.createElement('p');
    pBreak.style.pageBreakBefore = 'always';
    pBreak.style.breakBefore = 'page';
    pBreak.textContent = "Đoạn sau ngắt trang thường";
    body.appendChild(pBreak);
    
    // --- 11 & 12. Ngat muc sang Landscape (muc 2) + Co trang Letter, le 2cm 4 phia ---
    const sectionId = 'section-2';
    const breakStyle = 'break-before:page;page-break-before:always;';
    const marker = '<div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="' + sectionId + '" contenteditable="false" style="' + breakStyle + 'border-top:2px double #7c3aed;margin:20px 0;text-align:center;color:#6d28d9;font-size:11px;user-select:none">--- Ngắt mục (Trang kế tiếp) ---</div><p><br></p>';
    body.insertAdjacentHTML('beforeend', marker);
    
    const pSec2 = document.createElement('p');
    pSec2.textContent = "Nội dung phần 2 trên trang nằm ngang landscape";
    body.appendChild(pSec2);
    
    // Thiet lap trang: Letter (215.9 x 279.4 mm), le 2cm (20mm) 4 phia
    adapter.setPageSetup({
      size: 'letter',
      orientation: 'portrait',
      margins: { top: 20, bottom: 20, left: 20, right: 20 }
    });
    
    // Muc 2: Letter, orientation: landscape, le 20mm
    adapter.sectionPageSetups[sectionId] = {
      size: 'letter',
      orientation: 'landscape',
      margins: { top: 20, bottom: 20, left: 20, right: 20 }
    };
    
    adapter.isDirty = true;
    return 'ok';
  } catch (e) {
    return 'error: ' + (e && e.stack ? e.stack : String(e));
  }
})()
"""

EXPECTED2 = {
    "scenario": 2,
    "justifyPara": {
        "text": "Đoạn canh đều hai bên (justify)",
        "alignment": "justify"
    },
    "rightPara": {
        "text": "Đoạn canh phải (right)",
        "alignment": "right"
    },
    "spacingPara": {
        "text": "Đoạn khoảng cách trước 6pt và sau 12pt",
        "spaceBefore": 6,
        "spaceAfter": 12
    },
    "hangingPara": {
        "text": "Đoạn thụt lề trái 2cm và thụt lề treo 1cm",
        "leftIndentPt": 56.7,
        "firstLineIndentPt": -28.35
    },
    "styles": {
        "bold": True,
        "italic": True,
        "underline": True,
        "strikeThrough": True,
        "superscript": True,
        "subscript": True,
        "highlightColorIndex": 7
    },
    "fonts": {
        "arialName": "Arial",
        "arialSize": 11,
        "tnrName": "Times New Roman",
        "tnrSize": 14,
        "tnrColor": "#0070C0"
    },
    "hyperlink": {
        "count": 1,
        "address": "https://example.com",
        "textToDisplay": "Trang chủ"
    },
    "listRestart": {
        "firstNumber": "1."
    },
    "multilevelList": {
        "subItemLevel": 2
    },
    "table": {
        "rows": 3,
        "cols": 3,
        "headerBgColor": "#D9D9D9",
        "headerBold": True,
        "headerAlignment": "center",
        "col1WidthPt": 85.0
    },
    "section2": {
        "orientation": "landscape"
    },
    "pageSetup": {
        "pageWidthPt": 612,
        "pageHeightPt": 792,
        "topMarginPt": 56.7,
        "bottomMarginPt": 56.7,
        "leftMarginPt": 56.7,
        "rightMarginPt": 56.7
    },
    "normalPageBreak": {
        "pageNumber": 2,
        "text": "Đoạn sau ngắt trang thường"
    },
    "nfcText": {
        "text": "Nguyễn Văn Ơn – ĐẠI HỌC"
    },
    "tabStop": {
        "positionPt": 141.7
    }
}

SCENARIO3 = r"""
(async function(){
  try {
    const PNG_1X1_RED = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
    const app = window.__vnoAppInstance; if (!app) return 'no-app';
    const bus = (await import('/platform/commands/command-bus.js')).globalCommandBus;
    const adapter = app.adapter;
    const body = adapter.bodyDom || app.editorDom; if (!body) return 'no-body';
    const header = adapter.headerDom;
    const footer = adapter.footerDom;
    
    // Clear body
    body.innerHTML = '';
    
    // --- 1. Headings FIRST (needed for TOC) ---
    const h1 = document.createElement('h1');
    h1.textContent = 'Chương 1: Tổng quan';
    body.appendChild(h1);
    
    const h2 = document.createElement('h2');
    h2.textContent = 'Mục 1.1: Giới thiệu';
    body.appendChild(h2);
    
    // --- 2. Insert TOC (will be placed at beginning, collecting headings) ---
    await bus.execute('writer.reference.tocInsert');
    
    // --- 3. Bảng 4x4: gộp ô ngang hàng 1 (A1:D1) - tạo bằng HTML table ---
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.margin = '14pt 0';
    // Row 1: merged across 4 columns
    const tr1 = document.createElement('tr');
    const td11 = document.createElement('td');
    td11.setAttribute('colspan', '4');
    td11.style.border = '2px solid #000000'; // double border
    td11.style.padding = '6pt 10pt';
    td11.style.backgroundColor = '#BDD7EE';
    td11.style.fontWeight = 'bold';
    td11.style.textAlign = 'center';
    td11.style.verticalAlign = 'middle';
    td11.textContent = 'Ô gộp ngang hàng 1';
    tr1.appendChild(td11);
    table.appendChild(tr1);
    // Rows 2-4: first cell merged vertically (simulated with rowspan), others normal
    for (let r = 1; r < 4; r++) {
      const tr = document.createElement('tr');
      // First column - use rowspan on row 2 only
      if (r === 1) {
        const td = document.createElement('td');
        td.setAttribute('rowspan', '3');
        td.style.border = '1px solid #000000';
        td.style.padding = '6pt 10pt';
        td.style.verticalAlign = 'middle';
        td.textContent = 'Hàng 2-4, Cột A';
        tr.appendChild(td);
      }
      // Columns 2-4
      for (let c = 1; c < 4; c++) {
        const td = document.createElement('td');
        td.style.border = '1px solid #000000';
        td.style.padding = '6pt 10pt';
        td.textContent = 'Hàng ' + (r + 1) + ', Cột ' + (c + 1);
        tr.appendChild(td);
      }
      table.appendChild(tr);
    }
    body.appendChild(table);
    
    // --- 4. Bề rộng cột 2 = 4cm, chiều cao hàng 3 = 1.2cm (exactly) ---
    // Set column 2 width
    for (let r = 0; r < 4; r++) {
      if (table.rows[r] && table.rows[r].cells[1]) {
        table.rows[r].cells[1].style.width = '4cm';
      }
    }
    // Set row 3 height exactly (index 2 = row 3)
    if (table.rows[2]) {
      table.rows[2].style.height = '1.2cm';
      for (let c = 0; c < table.rows[2].cells.length; c++) {
        table.rows[2].cells[c].style.height = '1.2cm';
      }
    }
    
    // --- 5. Ảnh inline 4x3cm rồi ảnh thứ hai bọc chữ vuông (square) căn phải ---
    const pImg1 = document.createElement('p');
    const img1 = document.createElement('img');
    img1.src = 'data:image/png;base64,' + PNG_1X1_RED;
    img1.width = 151; // ~4cm at 96dpi
    img1.height = 113; // ~3cm
    img1.style.verticalAlign = 'middle';
    img1.setAttribute('data-vno-wrap', 'inline');
    pImg1.appendChild(img1);
    body.appendChild(pImg1);
    
    const pImg2 = document.createElement('p');
    const img2 = document.createElement('img');
    img2.src = 'data:image/png;base64,' + PNG_1X1_RED;
    img2.width = 151;
    img2.height = 113;
    img2.style.cssText = 'float: right; margin: 5pt;'; // Square wrap approximation
    img2.setAttribute('data-vno-wrap', 'square');
    pImg2.appendChild(img2);
    pImg2.appendChild(document.createTextNode('Văn bản bọc quanh ảnh căn phải.'));
    body.appendChild(pImg2);
    
    // --- 6. Chú thích cuối trang (footnote) ---
    const pFootnote = document.createElement('p');
    pFootnote.textContent = 'Đoạn có chú thích cuối trang. ';
    const supFn = document.createElement('sup');
    supFn.className = 'vno-footnote-ref';
    supFn.setAttribute('data-vno-footnote-ref', 'fn-1');
    supFn.setAttribute('contenteditable', 'false');
    supFn.textContent = '1';
    pFootnote.appendChild(supFn);
    pFootnote.appendChild(document.createTextNode(' Nội dung tiếp theo.'));
    body.appendChild(pFootnote);
    
    // Insert footnote via adapter command
    await bus.execute('writer.reference.footnoteInsert', { text: 'Đây là nội dung chú thích cuối trang.' });
    
    // --- 7. Mục 2 chia 2 cột (columns) - insert section break then set columns ---
    const sectionId = 'section-columns';
    const breakStyle = 'break-before:page;page-break-before:always;';
    const marker = '<div class="vno-section-break" data-vno-section-break="nextPage" data-vno-section-id="' + sectionId + '" contenteditable="false" style="' + breakStyle + 'border-top:2px double #7c3aed;margin:20px 0;text-align:center;color:#6d28d9;font-size:11px;user-select:none">--- Ngắt mục (Trang kế tiếp) ---</div><p><br></p>';
    body.insertAdjacentHTML('beforeend', marker);
    
    const pSec2 = document.createElement('p');
    pSec2.textContent = 'Mục 2 được chia 2 cột.';
    body.appendChild(pSec2);
    
    // Set 2 columns for section 2
    await bus.execute('writer.page.columns2');
    
    // --- 8. Footer "Trang X / Y" - insert PAGE and NUMPAGES fields ---
    if (footer) {
      footer.innerHTML = '<p style="text-align:center; font-size:10pt; margin:0;">Trang <span class="vno-page-number" data-vno-field="PAGE">1</span> / <span class="vno-page-total" data-vno-field="NUMPAGES">1</span></p>';
    }
    
    // --- 9. Ảnh (logo) trong header, căn trái ---
    if (header) {
      header.innerHTML = '<p style="text-align:left; font-size:10pt; margin:0;"><img src="data:image/png;base64,' + PNG_1X1_RED + '" width="30" height="30" style="vertical-align:middle;"> Logo</p>';
    }
    
    // --- 10. Đoạn có border dưới + nền xám (paragraph shading) ---
    const pBorderShading = document.createElement('p');
    pBorderShading.style.borderBottom = '2px solid #334155';
    pBorderShading.style.backgroundColor = '#F3F4F6';
    pBorderShading.style.padding = '6pt 0';
    pBorderShading.textContent = 'Đoạn có viền dưới và nền xám.';
    body.appendChild(pBorderShading);
    
    // --- 11. Chữ có màu nền (shading) khác highlight: #FFE699 ---
    const pShading = document.createElement('p');
    pShading.textContent = 'Đoạn có ';
    const spanShading = document.createElement('span');
    spanShading.style.backgroundColor = '#FFE699';
    spanShading.textContent = 'chữ nền vàng nhạt';
    pShading.appendChild(spanShading);
    pShading.appendChild(document.createTextNode(' (khác highlight).'));
    body.appendChild(pShading);
    
    // --- 12. Ngắt dòng mềm (Shift+Enter) trong 1 đoạn ---
    const pSoftBreak = document.createElement('p');
    pSoftBreak.textContent = 'Dòng thứ nhất';
    const br = document.createElement('br');
    pSoftBreak.appendChild(br);
    pSoftBreak.appendChild(document.createTextNode('Dòng thứ hai sau ngắt mềm'));
    body.appendChild(pSoftBreak);
    
    // --- 13. Ký tự đặc biệt: →, ©, ₫, tab ở đầu dòng, khoảng trắng không ngắt ---
    const pSpecial = document.createElement('p');
    pSpecial.textContent = '\t→ © ₫\u00A0'; // Tab + arrow + copyright + dong + NBSP
    pSpecial.appendChild(document.createTextNode('Ký tự đặc biệt sau tab.'));
    body.appendChild(pSpecial);
    
    // --- 14. Danh sách bullet lồng 3 cấp với ký hiệu khác nhau (•, o, ▪) ---
    const ul = document.createElement('ul');
    const li1 = document.createElement('li');
    li1.textContent = 'Cấp 1: bullet chấm tròn';
    const ul2 = document.createElement('ul');
    const li2 = document.createElement('li');
    li2.textContent = 'Cấp 2: bullet tròn rỗng';
    const ul3 = document.createElement('ul');
    const li3 = document.createElement('li');
    li3.textContent = 'Cấp 3: bullet vuông nhỏ';
    ul3.appendChild(li3);
    li2.appendChild(ul3);
    ul2.appendChild(li2);
    li1.appendChild(ul2);
    ul.appendChild(li1);
    body.appendChild(ul);
    
    // --- 15. Bookmark + tham chiếu chéo ---
    await bus.execute('writer.insert.bookmark', { name: 'bookmark1' });
    const pBookmark = document.createElement('p');
    pBookmark.textContent = 'Đoạn có bookmark.';
    body.appendChild(pBookmark);
    await bus.execute('writer.insert.crossReference', { referenceType: 'bookmark', referenceItem: 'bookmark1', insertAsHyperlink: true });
    
    // --- 16. Bảo vệ tài liệu chỉ đọc / mật khẩu mở (nếu có lệnh) ---
    // Note: No direct command for document protection in current command set
    // Ghi "không có lệnh" trong handoff
    
    // --- 17. Thuộc tính tài liệu: tiêu đề, tác giả ---
    // Note: No direct command for document properties in current command set
    // Ghi "không có lệnh" trong handoff
    
    // Page setup
    adapter.setPageSetup({
      size: 'a4',
      orientation: 'portrait',
      margins: { top: 20, bottom: 20, left: 30, right: 20 }
    });
    
    adapter.isDirty = true;
    
    return 'ok';
  } catch (e) {
    return 'error: ' + (e && e.stack ? e.stack : String(e));
  }
})()
"""

EXPECTED3 = {
    "scenario": 3,
    "table1": {
        "rows": 4,
        "cols": 4,
        "mergedCellRow1": {"row": 1, "col": 1, "colspan": 4, "text": "Ô gộp ngang hàng 1"},
        "mergedCellColA": {"row": 2, "col": 1, "rowspan": 3, "text": "Hàng 2-4, Cột A"},
        "outerBorderDouble": True,
        "innerBorderSingle": True,
        "headerBgColor": "#BDD7EE",
        "headerBold": True,
        "headerVerticalAlign": "center"
    },
    "table1col2": {
        "widthPt": 113.4  # 4cm
    },
    "table1row3": {
        "heightPt": 34.0,  # 1.2cm exactly
        "heightRule": "exactly"
    },
    "images": {
        "inlineShapesCount": 1,
        "inlineWidthPt": 151.0,
        "inlineHeightPt": 113.0,
        "shapesCount": 1,
        "shapeWrapType": 0,  # wdWrapSquare
        "shapeRelativeHorizontal": "right"
    },
    "footnote": {
        "count": 1,
        "text": "Đây là nội dung chú thích cuối trang."
    },
    "headings": {
        "h1Count": 1,
        "h1Text": "Chương 1: Tổng quan",
        "h2Count": 1,
        "h2Text": "Mục 1.1: Giới thiệu"
    },
    "toc": {
        "count": 1,
        "entriesCount": 2
    },
    "columns": {
        "section2ColumnCount": 2
    },
    "footer": {
        "fieldsCount": 2,
        "hasPageField": True,
        "hasNumPagesField": True
    },
    "header": {
        "inlineShapesCount": 1
    },
    "paraBorderShading": {
        "borderBottom": True,
        "shadingColor": "#F3F4F6"
    },
    "textShading": {
        "color": "#FFE699"
    },
    "softBreak": {
        "hasVerticalTab": True,
        "lineCount": 2
    },
    "specialChars": {
        "arrow": "→",
        "copyright": "©",
        "dong": "₫",
        "hasTab": True,
        "hasNbsp": True
    },
    "multilevelList": {
        "level1Symbol": "•",
        "level2Symbol": "o",
        "level3Symbol": "▪",
        "maxLevel": 3
    },
    "bookmark": {
        "count": 1,
        "hasCrossRef": True
    },
    "docProtection": {
        "hasCommand": False
    },
    "docProperties": {
        "hasCommand": False
    }
}

def after_load(win):
    for _ in range(60):
        time.sleep(2)
        ready = win.evaluate_js("!!(window.__vnoAppInstance && window.__vnoAppInstance.adapter && window.__vnoAppInstance.adapter.bodyDom)")
        if ready: break
    print("READY:", ready, flush=True)
    if not ready:
        dbg = win.evaluate_js("({ hasInstance: !!window.__vnoAppInstance, hasAdapter: !!(window.__vnoAppInstance?.adapter), hasAdapterBody: !!(window.__vnoAppInstance?.adapter?.bodyDom), hasEditor: !!(window.__vnoAppInstance?.editorDom), appType: window.__vnoAppInstance?.constructor?.name })")
        print("DEBUG:", dbg, flush=True)
    time.sleep(3)
    
    if scenario_idx == 3:
        active_scenario = SCENARIO3
        active_expected = EXPECTED3
    elif scenario_idx == 2:
        active_scenario = SCENARIO2
        active_expected = EXPECTED2
    else:
        active_scenario = SCENARIO
        active_expected = EXPECTED
    
    result = win.evaluate_js(active_scenario)
    print("SCENARIO:", result, flush=True)
    time.sleep(3)
    
    dom_check = win.evaluate_js("({ bodyHtml: document.querySelector('.vno-writer-body')?.innerHTML?.substring(0, 800), tableCount: document.querySelectorAll('table').length, imgCount: document.querySelectorAll('img').length, h1Count: document.querySelectorAll('h1').length, pCount: document.querySelectorAll('p').length })")
    print("DOM CHECK:", dom_check, flush=True)
    time.sleep(2)
    
    win.create_file_dialog = lambda *a, **k: OUT
    win.evaluate_js("window.__saveDone=0; window.__saveErr=''; import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.save')).then(r => { window.__saveDone = 1; }, e => { window.__saveErr = String(e && e.stack || e); }); 'queued'")
    for _ in range(50):
        time.sleep(1)
        if win.evaluate_js("window.__saveDone") == 1 or win.evaluate_js("window.__saveErr") or (os.path.exists(OUT) and os.path.getsize(OUT) > 0):
            break
    time.sleep(1)
    print("SAVED:", os.path.exists(OUT), "ERR:", win.evaluate_js("window.__saveErr"), flush=True)
    with open(OUT + ".expected.json", "w", encoding="utf-8") as f:
        json.dump(active_expected, f, ensure_ascii=False, indent=1)
    win.evaluate_js("document.querySelectorAll('button').forEach(b => { if (/Đồng ý|OK/i.test(b.textContent)) b.click(); }); 1")
    time.sleep(1)
    win.destroy()

webview.start(after_load, window, debug=False)
