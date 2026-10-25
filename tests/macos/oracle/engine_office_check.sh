#!/bin/bash
# engine_office_check.sh — Oracle Microsoft Office for Mac cho tệp do ooxml-engine lưu (ENGINE-MAC-2410).
#
# Mở từng tệp DOCX/XLSX/PPTX bằng Word/Excel/PowerPoint qua osascript (CHỈ nhắm 3 ứng dụng này),
# ghi: mở sạch / có hộp thoại sửa chữa (repair) hoặc treo / lỗi, số trang / số sheet / số slide,
# rồi đóng tài liệu KHÔNG lưu. Không gửi phím giả, không điều khiển ứng dụng khác.
#
# CHỈ dùng corpus TỔNG HỢP (synthetic) — không chạy trên tài liệu thật của người dùng.
#
# Dùng:
#   tests/macos/oracle/engine_office_check.sh --syntax-check
#       Chỉ biên dịch (osacompile) 3 AppleScript để kiểm cú pháp; KHÔNG gửi AppleEvent, KHÔNG mở tệp.
#   tests/macos/oracle/engine_office_check.sh <thư-mục-tệp> [--out <tệp.tsv>] [--timeout <giây>] [--kill-on-hang]
#       Chạy thật. Cần quyền Automation (System Settings > Privacy & Security > Automation:
#       Terminal/agent → Microsoft Word, Microsoft Excel, Microsoft PowerPoint). Hiện BLOCKED (-1712).
#
# Bước nặng (máy 8 GB): bọc bằng khóa dùng chung, ví dụ
#   /Volumes/Data/Worktrees/_lead/heavy-lock.sh <agent> -- tests/macos/oracle/engine_office_check.sh <dir>
#
# Trạng thái mỗi dòng (cột status):
#   OPENED_CLEAN   — mở được, không hộp thoại, đếm được trang/sheet/slide, đã đóng không lưu.
#   REPAIRED       — mở được nhưng tên tài liệu cho thấy Office đã sửa chữa ("Repaired"/"Đã sửa").
#   HANG_OR_PROMPT — quá thời gian chờ: gần như chắc chắn Office đang hiện hộp thoại (sửa chữa/chuyển đổi).
#                    Mặc định DỪNG cả lượt để người vận hành xem và tự đóng hộp thoại (không giết ứng dụng).
#   OPEN_ERROR     — Office/osascript trả lỗi (vd. -1712 Automation chưa cấp, -1743 bị từ chối).
#   SKIPPED        — đuôi tệp không hỗ trợ.
# Tiêu chí G0 (INBOX-MAC #2): 0 tệp REPAIRED/HANG_OR_PROMPT.
#
# Mã thoát: 0 mọi tệp OPENED_CLEAN; 1 có REPAIRED/OPEN_ERROR; 3 dừng giữa chừng vì HANG_OR_PROMPT; 64 sai tham số.
set -uo pipefail

TIMEOUT=90
OUT=""
DIR=""
SYNTAX_ONLY=0
KILL_ON_HANG=0
while [ $# -gt 0 ]; do
  case "$1" in
    --syntax-check) SYNTAX_ONLY=1 ;;
    --out) OUT="${2:-}"; shift ;;
    --timeout) TIMEOUT="${2:-}"; shift ;;
    --kill-on-hang) KILL_ON_HANG=1 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    -*) echo "tham số lạ: $1" >&2; exit 64 ;;
    *) DIR="$1" ;;
  esac
  shift
done

WORK="$(mktemp -d "${TMPDIR:-/tmp}/engine-office-check.XXXXXX")"
trap 'rm -rf "$WORK"' EXIT

# ---------------------------------------------------------------- AppleScript (mỗi ứng dụng một tệp)
# argv: 1 = đường dẫn POSIX tuyệt đối, 2 = timeout (giây). Trả 1 dòng: "OK<TAB>tên<TAB>số đếm<TAB>số tài liệu mở trước".
# `with timeout` làm AppleEvent trả -1712 khi Office kẹt ở hộp thoại modal (sửa chữa) thay vì chờ vô hạn.
cat > "$WORK/word.applescript" <<'APPLESCRIPT'
on run argv
	set p to item 1 of argv
	set t to (item 2 of argv) as integer
	set f to POSIX file p
	with timeout of t seconds
		tell application "Microsoft Word"
			set nBefore to count of documents
			open f
			set d to active document
			set nm to name of d
			set n to compute statistics d statistic statistic pages
			close d saving no
		end tell
	end timeout
	return "OK" & tab & nm & tab & (n as text) & tab & (nBefore as text)
end run
APPLESCRIPT

cat > "$WORK/excel.applescript" <<'APPLESCRIPT'
on run argv
	set p to item 1 of argv
	set t to (item 2 of argv) as integer
	set hfs to (POSIX file p) as text
	with timeout of t seconds
		tell application "Microsoft Excel"
			set nBefore to count of workbooks
			open workbook workbook file name hfs update links do not update links
			set wb to active workbook
			set nm to name of wb
			set n to count of sheets of wb
			close wb saving no
		end tell
	end timeout
	return "OK" & tab & nm & tab & (n as text) & tab & (nBefore as text)
end run
APPLESCRIPT

cat > "$WORK/powerpoint.applescript" <<'APPLESCRIPT'
on run argv
	set p to item 1 of argv
	set t to (item 2 of argv) as integer
	set f to POSIX file p
	with timeout of t seconds
		tell application "Microsoft PowerPoint"
			set nBefore to count of presentations
			open f
			set pr to active presentation
			set nm to name of pr
			set n to count of slides of pr
			close pr saving no
		end tell
	end timeout
	return "OK" & tab & nm & tab & (n as text) & tab & (nBefore as text)
end run
APPLESCRIPT

# Kiểm "ứng dụng đang có tài liệu mở?" — để không bao giờ đụng tài liệu của người dùng.
cat > "$WORK/opencount.applescript" <<'APPLESCRIPT'
on run argv
	set a to item 1 of argv
	with timeout of 20 seconds
		if a is "word" then
			tell application "Microsoft Word" to return (count of documents) as text
		else if a is "excel" then
			tell application "Microsoft Excel" to return (count of workbooks) as text
		else
			tell application "Microsoft PowerPoint" to return (count of presentations) as text
		end if
	end timeout
end run
APPLESCRIPT

compile_all() {
  local rc=0 s
  for s in word excel powerpoint opencount; do
    if osacompile -o "$WORK/$s.scpt" "$WORK/$s.applescript" 2>"$WORK/$s.err"; then
      echo "PASS osacompile $s.applescript"
    else
      echo "FAIL osacompile $s.applescript: $(cat "$WORK/$s.err")"; rc=1
    fi
  done
  return $rc
}

if [ "$SYNTAX_ONLY" = 1 ]; then
  compile_all; exit $?
fi

[ -n "$DIR" ] && [ -d "$DIR" ] || { echo "dùng: $0 <thư-mục-tệp> | --syntax-check" >&2; exit 64; }
DIR="$(cd "$DIR" && pwd)"
OUT="${OUT:-$DIR/office-check-results.tsv}"
compile_all >/dev/null || { echo "AppleScript không biên dịch được — chạy --syntax-check để xem lỗi" >&2; exit 1; }

app_of() {
  case "$1" in
    *.docx) echo word ;; *.xlsx) echo excel ;; *.pptx) echo powerpoint ;; *) echo "" ;;
  esac
}
proc_of() {
  case "$1" in word) echo "Microsoft Word" ;; excel) echo "Microsoft Excel" ;; powerpoint) echo "Microsoft PowerPoint" ;; esac
}

# Chạy osascript có trần thời gian cứng (phòng khi chính osascript treo); perl có sẵn trên macOS.
run_capped() { local cap="$1"; shift; perl -e 'alarm shift; exec @ARGV' "$cap" "$@"; }

# Preflight: ứng dụng nào ĐANG chạy thì phải không có tài liệu mở.
for a in word excel powerpoint; do
  if pgrep -xq "$(proc_of "$a")"; then
    c="$(run_capped 30 osascript "$WORK/opencount.scpt" "$a" 2>&1)"
    if [ "$c" != "0" ]; then
      echo "DỪNG: $(proc_of "$a") đang mở tài liệu hoặc không trả lời ($c). Đóng tài liệu của bạn trước khi chạy." >&2
      exit 1
    fi
  fi
done

printf 'file\tapp\tstatus\tcount\tdoc_name\telapsed_s\tdetail\n' > "$OUT"
total=0; clean=0; repaired=0; errors=0; hung=0
for f in "$DIR"/*; do
  [ -f "$f" ] || continue
  a="$(app_of "$f")"
  if [ -z "$a" ]; then continue; fi
  total=$((total+1))
  t0=$(date +%s)
  res="$(run_capped $((TIMEOUT+30)) osascript "$WORK/$a.scpt" "$f" "$TIMEOUT" 2>&1)"; rc=$?
  el=$(( $(date +%s) - t0 ))
  name=""; cnt=""; detail=""
  if [ $rc = 0 ] && [ "${res%%	*}" = "OK" ]; then
    name="$(printf '%s' "$res" | cut -f2)"; cnt="$(printf '%s' "$res" | cut -f3)"
    case "$name" in
      *Repaired*|*repaired*|*"Đã sửa"*) st=REPAIRED; repaired=$((repaired+1)) ;;
      *) st=OPENED_CLEAN; clean=$((clean+1)) ;;
    esac
  elif [ $rc = 142 ] || printf '%s' "$res" | grep -q -- '-1712'; then
    # -1712 = AppleEvent timed out. Nếu Automation đã cấp mà vẫn -1712 → Office kẹt ở hộp thoại modal.
    st=HANG_OR_PROMPT; hung=$((hung+1)); detail="$(printf '%s' "$res" | tr '\t\n' '  ' | cut -c1-200)"
  else
    st=OPEN_ERROR; errors=$((errors+1)); detail="$(printf '%s' "$res" | tr '\t\n' '  ' | cut -c1-200)"
  fi
  printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\n' "$(basename "$f")" "$a" "$st" "$cnt" "$name" "$el" "$detail" >> "$OUT"
  printf '%-15s %-10s %-4s %s\n' "$st" "$a" "$cnt" "$(basename "$f")"
  if [ "$st" = HANG_OR_PROMPT ]; then
    if [ "$KILL_ON_HANG" = 1 ]; then
      # Chỉ khi chắc chắn không có tài liệu người dùng nào (preflight đã kiểm lúc bắt đầu).
      pkill -x "$(proc_of "$a")"; sleep 3
    else
      echo "DỪNG: $(proc_of "$a") có thể đang hiện hộp thoại sửa chữa cho $(basename "$f"). Xem màn hình, tự đóng hộp thoại (KHÔNG lưu), rồi chạy lại. Kết quả một phần: $OUT" >&2
      exit 3
    fi
  fi
done

echo "TỔNG: $total tệp — OPENED_CLEAN $clean, REPAIRED $repaired, HANG_OR_PROMPT $hung, OPEN_ERROR $errors. Kết quả: $OUT"
[ $total -gt 0 ] && [ $clean = $total ] && exit 0
[ $hung -gt 0 ] && exit 3
exit 1
