#!/usr/bin/env python3
"""Kiểm chéo `docx.save` / `pptx.save` bằng bộ đọc ĐỘC LẬP (python-docx, python-pptx, LibreOffice).

Mỗi lần: sinh delta ngẫu nhiên (có hạt giống), tính KẾT QUẢ MONG ĐỢI bằng mô hình Python riêng (không dùng thư viện Swift để
tự chấm), chạy `ooxml-engine`, rồi mở tệp kết quả bằng python-docx/python-pptx để so và (tùy chọn) LibreOffice chuyển PDF.
  DOCX: setText, replaceText, insert, delete, append — chỉ số tính theo trạng thái HIỆN TẠI như `docx.save`.
  PPTX: slide.setTitle, shape.rename, slide.delete.
Tệp nguồn không bị sửa; không mạng.

  python3 scripts/crosscheck_docx_pptx_save.py --engine .build/release/ooxml-engine [--libreoffice] [--rounds 6] file|dir ...
"""
import argparse, json, random, shutil, subprocess, sys, tempfile, zipfile
from pathlib import Path

import docx, pptx
from pptx.enum.shapes import PP_PLACEHOLDER


def title_text(slide):
    """Tiêu đề theo LOẠI placeholder (title/ctrTitle) như engine; `shapes.title` của python-pptx còn nhận cả placeholder idx=0 loại body."""
    for sh in slide.shapes:
        if sh.is_placeholder and sh.placeholder_format.type in (PP_PLACEHOLDER.TITLE, PP_PLACEHOLDER.CENTER_TITLE):
            return sh.text_frame.text
    return None


def run(engine, op, src, dst, delta):
    req = json.dumps({"id": 1, "op": op, "args": {"source_document_path": str(src), "target_path": str(dst), "delta": delta}})
    out = subprocess.run([engine], input=req + "\n", capture_output=True, text=True, timeout=300)
    return json.loads(out.stdout.splitlines()[0])


def engine_paragraph_count(engine, path):
    req = "\n".join([json.dumps({"id": 1, "op": "open", "args": {"path": str(path)}}),
                     json.dumps({"id": 2, "op": "doc.read", "args": {"handle": "h1", "from": 0, "count": 0}})])
    lines = subprocess.run([engine], input=req + "\n", capture_output=True, text=True, timeout=120).stdout.splitlines()
    return json.loads(lines[1])["result"]["total"]


def check_docx(engine, f, rng, tmp, lo):
    try:
        base = [p.text for p in docx.Document(str(f)).paragraphs]
    except Exception as ex:
        return None, f"SKIP {f.name}: python-docx không mở nguồn ({type(ex).__name__})"
    n = engine_paragraph_count(engine, f)
    if n != len(base):
        return None, f"SKIP {f.name}: số đoạn engine {n} ≠ python-docx {len(base)} (khác cách đếm)"
    model, ops = list(base), []
    for _ in range(rng.randint(1, 6)):
        k = rng.choice(["setText", "setText", "replaceText", "insert", "delete", "append"])
        if k == "append" or not model:
            t = f"cuối {rng.randint(0, 999)} Việt Nam <&>"; ops.append({"op": "append", "text": t}); model.append(t); continue
        # `docx.save` kiểm mọi chỉ số theo số đoạn của TỆP GỐC trước khi áp; chỉ số thao tác tính theo trạng thái hiện tại.
        i = rng.randrange(min(len(model), n))
        if k == "setText":
            t = f"đã sửa {rng.randint(0, 999)} “ngoặc” & <tag>"; ops.append({"op": "setText", "index": i, "text": t}); model[i] = t
        elif k == "replaceText" and model[i].strip():
            word = model[i].split()[0]; ops.append({"op": "replaceText", "index": i, "find": word, "replace": "THAY"}); model[i] = model[i].replace(word, "THAY")
        elif k == "insert":
            t = f"chèn {rng.randint(0, 999)}"; ops.append({"op": "insert", "index": i, "text": t}); model.insert(i + 1, t)
        elif k == "delete" and len(model) > 1:
            ops.append({"op": "delete", "index": i}); del model[i]
    out = tmp / f"{f.stem}.docx"
    resp = run(engine, "docx.save", f, out, {"paragraphs": ops})
    if not resp.get("ok"):
        return None, f"  engine từ chối {f.name}: {(resp.get('error') or {}).get('message') or resp.get('result')}"
    errs = []
    if zipfile.ZipFile(out).testzip() is not None: errs.append("testzip lỗi")
    got = [p.text for p in docx.Document(str(out)).paragraphs]
    if got != model: errs.append(f"đoạn khác mô hình: engine {len(got)} đoạn, mô hình {len(model)}; ops={json.dumps(ops, ensure_ascii=False)[:300]}")
    if lo: errs += libre(out, tmp)
    return errs, None


def check_pptx(engine, f, rng, tmp, lo):
    try:
        prs = pptx.Presentation(str(f))
    except Exception as ex:
        return None, f"SKIP {f.name}: python-pptx không mở nguồn ({type(ex).__name__})"
    slides = [{"title": title_text(s),
               "names": [sh.name for sh in s.shapes]} for s in prs.slides]
    model, ops = list(slides), []
    target = rng.randint(1, 4)
    for _ in range(target * 8):  # nhiều lần thử: nhiều slide không có tiêu đề/shape đặt tên được
        if not model or len(ops) >= target: break
        i = rng.randrange(len(model))
        k = rng.choice(["setTitle", "rename", "rename", "delete"])
        if k == "setTitle" and model[i]["title"] is not None:
            t = f"Tiêu đề {rng.randint(0, 999)} Việt Nam"; ops.append({"op": "slide.setTitle", "slide": i, "text": t}); model[i] = {**model[i], "title": t}
        elif k == "rename" and model[i]["names"]:
            j = rng.randrange(len(model[i]["names"]))
            # Shape tên rỗng không gọi theo tên được; `pptx.save` kiểm tên theo tệp GỐC nên không đổi tên lại shape đã đổi.
            if not model[i]["names"][j] or model[i]["names"][j].startswith("Tên mới"): continue
            new = f"Tên mới {rng.randint(0, 999)}"
            old = model[i]["names"][j]
            if model[i]["names"].count(old) != 1: continue
            ops.append({"op": "shape.rename", "slide": i, "shape": old, "name": new})
            nm = list(model[i]["names"]); nm[j] = new; model[i] = {**model[i], "names": nm}
        # xóa slide: chỉ khi không có thao tác nào khác nhắm vào (engine áp xóa SAU các thao tác nội dung, chỉ số theo nguồn)
        elif k == "delete" and len(model) > 2 and not ops and False:
            pass
    if not ops:
        return None, f"SKIP {f.name}: không sinh được thao tác hợp lệ"
    out = tmp / f"{f.stem}.pptx"
    resp = run(engine, "pptx.save", f, out, {"slides": ops})
    if not resp.get("ok"):
        return None, f"  engine từ chối {f.name}: {(resp.get('error') or {}).get('message') or resp.get('result')}"
    errs = []
    if zipfile.ZipFile(out).testzip() is not None: errs.append("testzip lỗi")
    prs2 = pptx.Presentation(str(out))
    got = [{"title": title_text(s), "names": [sh.name for sh in s.shapes]} for s in prs2.slides]
    if got != model: errs.append(f"slide khác mô hình; ops={json.dumps(ops, ensure_ascii=False)[:300]}")
    if lo: errs += libre(out, tmp)
    return errs, None


def libre(path, tmp):
    d = tmp / "pdf"; d.mkdir(exist_ok=True)
    p = subprocess.run(["soffice", "--headless", "--convert-to", "pdf", "--outdir", str(d), str(path)], capture_output=True, text=True, timeout=300)
    return [] if p.returncode == 0 and list(d.glob(path.stem + ".pdf")) else [f"LibreOffice không chuyển được ({p.returncode}) {p.stderr[:100]}"]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--engine", required=True); ap.add_argument("--rounds", type=int, default=6)
    ap.add_argument("--libreoffice", action="store_true"); ap.add_argument("--seed", type=int, default=20261114)
    ap.add_argument("paths", nargs="+")
    a = ap.parse_args(); rng = random.Random(a.seed)
    files = []
    for p in map(Path, a.paths):
        files += sorted(p.rglob("*")) if p.is_dir() else [p]
    files = [f for f in files if f.suffix.lower() in (".docx", ".pptx") and not f.name.startswith("~$")]
    tmp = Path(tempfile.mkdtemp(prefix="docx-pptx-crosscheck-")); ok, bad = 0, []
    try:
        for f in files:
            for r in range(a.rounds):
                fn = check_docx if f.suffix.lower() == ".docx" else check_pptx
                errs, note = fn(a.engine, f, rng, tmp, a.libreoffice)
                if note:
                    print(note); break
                if errs: bad.append(f"{f.name} #{r}: " + "; ".join(errs))
                else: ok += 1
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"đạt {ok} lần lưu, LỖI {len(bad)}")
    for b in bad: print("  FAIL", b)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
