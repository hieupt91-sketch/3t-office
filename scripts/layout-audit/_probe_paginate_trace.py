"""Usage: python _probe_paginate_trace.py <worktree> <docx> -- remove auto gaps, then replay _recomputeLivePagination's rule per block (top, h, mt, extent) and print where pages break and why"""
import sys, time, json
ROOT, DOCX = sys.argv[1], sys.argv[2]
sys.path.insert(0, ROOT)
import webview
import main as vnmain
server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args([DOCX])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(title="VN Writer - Probe", url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)
stem = DOCX.split("\\")[-1][:6]
JS = r"""(function(){
  const body = document.querySelector('.vno-writer-body');
  document.querySelectorAll('.vno-page-auto-gap').forEach(g => g.remove());
  const page = document.querySelector('.vno-writer-page');
  const cs = getComputedStyle(page);
  const usable = page.offsetHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const rows = Array.from(body.children).map((el, i) => { const c = getComputedStyle(el); const st = el.getAttribute('style') || '';
    return { i, tag: el.tagName, top: el.offsetTop, h: el.offsetHeight, mt: parseFloat(c.marginTop)||0, mb: parseFloat(c.marginBottom)||0, minH: c.minHeight, pb: /page-break-before|break-before/.test(st), floats: el.querySelectorAll('[data-vno-float]').length, txt: (el.innerText||'').replace(/\s+/g,' ').slice(0,28) }; });
  return JSON.stringify({ usable, pageH: page.offsetHeight, pad: cs.padding, minH: cs.minHeight, bodyH: body.offsetHeight, rows });
})();"""
def after_load(win):
    for _ in range(200):
        time.sleep(3)
        name = win.evaluate_js("(document.querySelector('.vno-doc-tab span')||{}).textContent||''") or ''
        if stem in name: break
    time.sleep(8)
    d = json.loads(win.evaluate_js(JS))
    print('usable(page box)', d['usable'], 'pageH', d['pageH'], 'pad', d['pad'], 'bodyH', d['bodyH'])
    # replay: the adapter uses _getUsablePageHeight (printable height); approximate with A4/Letter from pad
    pageStart = None; page = 1
    for r in d['rows']:
        top, h, mt = r['top'], r['h'], r['mt']
        note = ''
        if r['pb']:
            if pageStart is not None: page += 1; note = 'MANUAL BREAK'
            pageStart = top - mt
        elif pageStart is None:
            pageStart = top - mt
        else:
            ext = top + h - pageStart
            note = f'extent={ext:.0f}'
        print(f"{r['i']:3} p{page:2} {r['tag']:4} top={top:6} h={h:4} mt={mt:5.1f} mb={r['mb']:5.1f} minH={r['minH']:>8} fl={r['floats']} {note:16} {r['txt']!r}")
    win.destroy()
webview.start(after_load, window, debug=False)
