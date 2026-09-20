"""Usage: python _create_new_writer.py <worktree> <out.docx>
Chieu "tao moi trong VN Writer -> luu DOCX": mo app Writer KHONG co file, dung DOM truc tiep
de tao noi dung, luu qua common.file.save (hop thoai native bi thay),
ghi <out.docx> + <out>.expected.json (gia tri mong doi de _word_readback.ps1 doi chieu bang Word COM)."""
import sys, time, os, json, base64
ROOT, OUT = os.path.abspath(sys.argv[1]), os.path.abspath(sys.argv[2])
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
    
    result = win.evaluate_js(SCENARIO)
    print("SCENARIO:", result, flush=True)
    time.sleep(3)
    
    dom_check = win.evaluate_js("({ bodyHtml: document.querySelector('.vno-writer-body')?.innerHTML?.substring(0, 800), tableCount: document.querySelectorAll('table').length, imgCount: document.querySelectorAll('img').length, h1Count: document.querySelectorAll('h1').length, pCount: document.querySelectorAll('p').length })")
    print("DOM CHECK:", dom_check, flush=True)
    time.sleep(2)
    
    win.create_file_dialog = lambda *a, **k: OUT
    win.evaluate_js("window.__saveDone=0; window.__saveErr=''; import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.save')).then(r => { window.__saveDone = 1; }, e => { window.__saveErr = String(e && e.stack || e); }); 'queued'")
    for _ in range(100):
        time.sleep(2)
        if win.evaluate_js("window.__saveDone") == 1 or win.evaluate_js("window.__saveErr") or (os.path.exists(OUT) and os.path.getsize(OUT) > 0): break
    print("SAVED:", os.path.exists(OUT), "ERR:", win.evaluate_js("window.__saveErr"), flush=True)
    with open(OUT + ".expected.json", "w", encoding="utf-8") as f:
        json.dump(EXPECTED, f, ensure_ascii=False, indent=1)
    win.evaluate_js("document.querySelectorAll('button').forEach(b => { if (/Đồng ý|OK/i.test(b.textContent)) b.click(); }); 1")
    time.sleep(1)
    win.destroy()

webview.start(after_load, window, debug=False)