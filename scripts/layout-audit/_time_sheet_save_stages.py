"""Usage: python _time_sheet_save_stages.py <worktree> <sent.fods> <source.xlsx> <out.xlsx>
Do thoi gian tung buoc cua duong luu Sheet (khong can mo app): toi uu FODS -> soffice convert -> hau xu ly.
Dung khi mot file lon (lan09: FODS 233 MB) khong luu xong trong 20 phut de biet nut nghen o dau."""
import os, sys, time, tempfile, shutil, subprocess
ROOT, SENT, SOURCE, OUT = [os.path.abspath(a) for a in sys.argv[1:5]]
sys.path.insert(0, ROOT)
import main as vnmain

t0 = time.time()
with open(SENT, "r", encoding="utf-8", errors="replace") as f:
    fods = f.read()
print(f"read {len(fods)/1e6:.1f} MB in {time.time()-t0:.1f}s", flush=True)

t1 = time.time()
optimized = vnmain._optimize_fods_for_sheet(fods)
print(f"optimize: {len(optimized)/1e6:.1f} MB in {time.time()-t1:.1f}s", flush=True)

tmp = tempfile.mkdtemp(prefix="vno_stage_")
src = os.path.join(tmp, "draft.fods")
with open(src, "w", encoding="utf-8") as f:
    f.write(optimized)
t2 = time.time()
try:
    xlsx = vnmain._run_soffice_convert(src, "xlsx", tmp, app_kind="sheet")
except Exception as exc:
    print(f"soffice: FAILED after {time.time()-t2:.1f}s: {exc}", flush=True)
    sys.exit(1)
print(f"soffice: {os.path.getsize(xlsx)/1e6:.1f} MB in {time.time()-t2:.1f}s", flush=True)
shutil.copyfile(xlsx, OUT + ".lo.xlsx")  # ban LibreOffice ghi ra TRUOC hau xu ly, de doi chieu tung buoc

t3 = time.time()
vnmain._apply_native_export_postprocess(src, xlsx, "sheet", "xlsx", source_path=SOURCE)
print(f"postprocess: {os.path.getsize(xlsx)/1e6:.1f} MB in {time.time()-t3:.1f}s", flush=True)
shutil.copyfile(xlsx, OUT)
print("OUT", OUT, flush=True)
