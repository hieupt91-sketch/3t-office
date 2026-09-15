"""Usage: python _probe_blocks.py <worktree> <docx> <out.json> -- dump body blocks (tag, top, height, break, gap, floats, text) after live pagination"""
import sys, time, json
ROOT, DOCX, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
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
  const page = document.querySelector('.vno-writer-page');
  if (!body) return JSON.stringify({error:'no body'});
  const kids = Array.from(body.children);
  let pageNo = 1;
  const rows = kids.map((el, i) => {
    const style = el.getAttribute('style') || '';
    const gap = el.classList.contains('vno-page-auto-gap');
    const brk = /page-break-before|break-before/i.test(style);
    if (gap) pageNo++;
    const floats = el.querySelectorAll('[data-vno-float]').length;
    const imgs = el.querySelectorAll('img').length;
    const tables = el.querySelectorAll('table').length;
    const cs2 = getComputedStyle(el); const mt = cs2.marginTop + '/' + cs2.marginBottom + '/' + cs2.lineHeight + '/' + cs2.fontSize + '/' + cs2.fontFamily.slice(0,12); const txt = mt + ' ' + (el.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 40);
    return { i, page: pageNo, tag: el.tagName, gap, brk, top: el.offsetTop, h: el.offsetHeight, floats, imgs, tables, txt };
  });
  const status = (document.querySelector('.vno-statusbar-left')||{}).textContent || '';
  const cs = getComputedStyle(page);
  return JSON.stringify({ status: status.replace(/\s+/g,' ').trim(), pagePadding: cs.padding, pageH: page.offsetHeight, bodyH: body.offsetHeight, rows });
})();"""

def after_load(win):
    name = ''
    for _ in range(200):
        time.sleep(3)
        name = win.evaluate_js("(document.querySelector('.vno-doc-tab span')||{}).textContent||''") or ''
        if stem in name:
            break
    print("LOADED:", name, flush=True)
    time.sleep(8)
    info = win.evaluate_js(JS)
    with open(OUT, "w", encoding="utf-8") as f:
        f.write(info)
    d = json.loads(info)
    print(d.get('status'), 'pagePadding', d.get('pagePadding'), 'pageH', d.get('pageH'), 'bodyH', d.get('bodyH'))
    for r in d.get('rows', []):
        if r['gap']:
            print('---- gap ---- page', r['page'])
            continue
        print(f"{r['i']:3} p{r['page']:2} {r['tag']:5} {'PB' if r['brk'] else '  '} top={r['top']:6} h={r['h']:5} fl={r['floats']:3} img={r['imgs']:2} tbl={r['tables']} {r['txt']!r}")
    win.destroy()

webview.start(after_load, window, debug=False)

