#!/usr/bin/env python3
"""Đo lệnh xlsx.save qua tiến trình ooxml-engine (đúng đường ứng dụng gọi): thời gian, RAM đỉnh, đường đã đi.

dùng: measure_xlsx_save.py <ooxml-engine> <nguồn.xlsx> <đích.xlsx> <delta.json>

Sinh tệp thử:  ooxml-bench gen 10000000 /tmp/s10.xlsx   (sheet tên "Sheet1")
Delta chỉ giá trị (đường vá, kết quả path=patch):
  {"cells":[{"sheet":"Sheet1","ref":"A1","type":"string","value":"x"}]}
Thêm một ô công thức để buộc đường DOM cũ (path=dom), đối chứng trên cùng bản dựng:
  {"cells":[{"sheet":"Sheet1","ref":"A1","type":"string","value":"x"},{"sheet":"Sheet1","ref":"B1","formula":"1+1","cached":2}]}

RAM đo bằng resource.getrusage (Linux, macOS); trên Windows dùng tools/bench_ooxml_engine.py (PeakWorkingSet).
"""
import json, os, resource, subprocess, sys, time
engine, src, dst, delta_path = sys.argv[1:5]
delta = json.load(open(delta_path, encoding="utf-8"))
if os.path.exists(dst): os.remove(dst)
req = json.dumps({"id": 1, "op": "xlsx.save", "args": {"source_document_path": src, "target_path": dst, "delta": delta}})
t = time.time()
p = subprocess.Popen([engine], stdin=subprocess.PIPE, stdout=subprocess.PIPE, text=True, encoding="utf-8")
out, _ = p.communicate(req + "\n", timeout=600)
wall = time.time() - t
rss_mb = resource.getrusage(resource.RUSAGE_CHILDREN).ru_maxrss / 1024
r = json.loads(out.strip().splitlines()[-1])
res = r.get("result", r)
print(f"wall={wall:.2f}s peakRSS={rss_mb:.0f}MB ok={r.get('ok')} path={res.get('path')} changed={res.get('changedParts')} err={r.get('error')}")
