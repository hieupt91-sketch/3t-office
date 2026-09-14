import sys, time
sys.path.insert(0, '.')
import webview
import main as vnmain

server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args(['file test/AQUARA.docx'])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(title='VN Writer - AQUARA', url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)

def after_load(win):
    for i in range(30):
        time.sleep(2)
        name = win.evaluate_js('(document.querySelector(".vno-doc-tab span")||{}).textContent||""') or ''
        if 'AQUARA' in name:
            break
    time.sleep(3)
    result = win.evaluate_js('''(function(){
        const page = document.querySelector('.vno-writer-page');
        const cs = page ? getComputedStyle(page) : null;
        const container = page ? page.closest('.vno-writer-container') : null;
        const ccs = container ? getComputedStyle(container) : null;
        const header = document.querySelector('.vno-writer-header');
        const body = document.querySelector('.vno-writer-body');
        return JSON.stringify({
            pagePaddingTop: cs ? cs.paddingTop : null,
            pagePaddingRight: cs ? cs.paddingRight : null,
            pagePaddingBottom: cs ? cs.paddingBottom : null,
            pagePaddingLeft: cs ? cs.paddingLeft : null,
            headerTop: header ? getComputedStyle(header).top : null,
            headerPosition: header ? getComputedStyle(header).position : null,
            bodyMarginTop: body ? getComputedStyle(body).marginTop : null,
            bodyOffsetTop: body ? body.offsetTop : null,
            containerVars: ccs ? {
                headerDist: ccs.getPropertyValue('--vno-header-distance'),
                footerDist: ccs.getPropertyValue('--vno-footer-distance'),
                marginLeft: ccs.getPropertyValue('--vno-margin-left'),
                marginRight: ccs.getPropertyValue('--vno-margin-right')
            } : null
        });
    })();''')
    print('DEBUG:', result)
    win.destroy()

webview.start(after_load, window, debug=False)