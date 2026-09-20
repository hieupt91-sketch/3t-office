"""Usage: python _canvas_para_metrics.py <worktree> <docx> <out.jsonl> -- open in the real app, dump every body block (page, top, height, line count, line-height, font, margins, tag, floats, text) as JSON lines"""
import sys, time, json
ROOT, DOCX, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
sys.path.insert(0, ROOT)
import webview
import main as vnmain
server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([DOCX])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(title="VN Writer - Metrics", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)
stem = DOCX.split("\\")[-1][:6]
JS = r"""(function(){
  const body = document.querySelector('.vno-writer-body');
  if (!body) return JSON.stringify({error:'no body'});
  const page = document.querySelector('.vno-writer-page');
  const pcs = getComputedStyle(page);
  let pageNo = 1; const rows = [];
  const kids = Array.from(body.children);
  // Danh sách (<ul>/<ol>) được tách thành từng <li> = một đoạn Word (List Paragraph); text/dòng/cao của <li> chỉ tính
  // phần của chính nó, không tính danh sách con lồng bên trong (danh sách con lại tách tiếp).
  const isList = el => el.tagName === 'UL' || el.tagName === 'OL';
  const ownText = t => { const li = t.parentElement.closest('li'); return !li || li === curLi; };
  let curLi = null;
  const measure = (el, i, page) => {
    const cs = getComputedStyle(el);
    const st = el.getAttribute('style') || '';
    curLi = el.tagName === 'LI' ? el : null;
    // first text run font
    let runEl = el; const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let tn;
    while ((tn = walker.nextNode())) { if (tn.textContent.trim() && (!curLi || ownText(tn))) { runEl = tn.parentElement; break; } }
    const rcs = getComputedStyle(runEl);
    const lh = parseFloat(cs.lineHeight);
    let h = el.offsetHeight;
    let text = el.innerText || '';
    if (curLi) {
      for (const sub of el.children) if (isList(sub)) { h -= sub.offsetHeight; text = text.replace(sub.innerText || '', ''); }
    }
    // Số dòng thật = số vị trí top khác nhau của các mảnh text node (mỗi dòng gãy = 1 rect);
    // selectNodeContents(el) đếm cả rect của phần tử inline bao ngoài nên đếm dư.
    const rects = (function(){ try {
      const tops = []; const w2 = document.createTreeWalker(el, NodeFilter.SHOW_TEXT); let t;
      while ((t = w2.nextNode())) { if (!t.textContent.trim()) continue; if (t.parentElement.closest('[data-vno-float]')) continue;
        if (curLi && !ownText(t)) continue;
        const r = document.createRange(); r.selectNodeContents(t);
        for (const x of r.getClientRects()) { if (x.width > 0 && x.height > 0 && !tops.some(y => Math.abs(y - x.top) < 3)) tops.push(x.top); } }
      return tops.length; } catch(e) { return -1; } })();
    rows.push({ i, page, tag: el.tagName, top: el.offsetTop, h, lh: Number.isFinite(lh) ? lh : null, lines: rects, mt: parseFloat(cs.marginTop)||0, mb: parseFloat(cs.marginBottom)||0,
      font: rcs.fontFamily.split(',')[0].replace(/"/g,''), size: parseFloat(rcs.fontSize), pb: /page-break-before|break-before/.test(st),
      floats: el.querySelectorAll('[data-vno-float]').length, tables: el.tagName === 'TABLE' ? 1 : el.querySelectorAll('table').length,
      text: text.replace(/\s+/g,' ').trim().slice(0,40) });
  };
  const gapTops = kids.filter(k => k.classList.contains('vno-page-auto-gap')).map(k => k.offsetTop);
  const pageOf = top => 1 + gapTops.filter(g => g <= top).length;
  const expandList = (list, i) => {
    for (const li of list.children) {
      if (li.tagName !== 'LI') { if (isList(li)) expandList(li, i); continue; }
      measure(li, i, pageOf(li.offsetTop));
      for (const sub of li.children) if (isList(sub)) expandList(sub, i);
    }
  };
  for (let i = 0; i < kids.length; i++) {
    const el = kids[i];
    if (el.classList.contains('vno-page-auto-gap')) { pageNo++; continue; }
    if (isList(el)) { expandList(el, i); continue; }
    measure(el, i, pageNo);
  }
  const status = ((document.querySelector('.vno-statusbar-left')||{}).textContent||'').replace(/\s+/g,' ');
  const headerEl = document.querySelector('.vno-writer-header');
  const footerEl = document.querySelector('.vno-writer-footer');
  const headerH = headerEl ? Math.round(headerEl.offsetHeight) : 0;
  const footerH = footerEl ? Math.round(footerEl.offsetHeight) : 0;
  const bodyTop = Math.round(body.offsetTop);
  return JSON.stringify({ status, pagePad: pcs.padding, pageW: page.offsetWidth, pageH: page.offsetHeight, headerH, footerH, bodyTop, rows });
})();"""
def after_load(win):
    for _ in range(300):
        time.sleep(3)
        name = win.evaluate_js("(document.querySelector('.vno-doc-tab span')||{}).textContent||''") or ''
        if stem in name: break
    time.sleep(8)
    d = json.loads(win.evaluate_js(JS))
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(json.dumps({"meta": {k: v for k, v in d.items() if k != "rows"}}, ensure_ascii=False) + "\n")
        for r in d.get("rows", []): f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print("OK blocks=", len(d.get("rows", [])), d.get("status", "")[:60], flush=True)
    win.destroy()
webview.start(after_load, window, debug=False)
