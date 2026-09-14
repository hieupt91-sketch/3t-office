import sys, time
sys.path.insert(0, '.')
import webview
import main as vnmain

server, port = vnmain._start_static_server()
app_kind, initial_file = vnmain.parse_launch_args(['file test/QUYETDINH.docx'])
api = vnmain.VnOfficeApi(app_kind=app_kind, initial_file=initial_file)
window = webview.create_window(title='VN Writer - Test3', url=vnmain.build_launch_url(app_kind, initial_file, port=port), width=1400, height=900, js_api=api)

def after_load(win):
    for i in range(30):
        time.sleep(2)
        name = win.evaluate_js('(document.querySelector(".vno-doc-tab span")||{}).textContent||""') or ''
        if 'QUYETDINH' in name:
            break
    time.sleep(3)
    result = win.evaluate_js('''(function(){
        const header = document.querySelector('.vno-writer-header');
        if (!header) return JSON.stringify({error: 'no header'});
        const style = getComputedStyle(header);
        const inline = header.getAttribute('style') || '';
        return JSON.stringify({
            position: style.position,
            top: style.top,
            left: style.left,
            right: style.right,
            inlineStyle: inline,
            className: header.className
        });
    })();''')
    print('DEBUG:', result)
    win.destroy()

webview.start(after_load, window, debug=False)