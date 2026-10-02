# Agent Handoff

TASK: CH-9.1 - Cap nhat qua VPS va bao loi gui ve may chu cho 3T Office

AGENT/ROLE: Codex - Integration/Core + Shared Platform + QA

BRANCH: `feat/ch9-1-vps-update-report-codex`

WORKTREE: `E:\VNOffice-codex-vps`

OBJECTIVE: Hoan thien client bao loi dung token cai dat dong va schema VPS; updater thu lan luot kho LAN/Internet nhung chi dung nguon co manifest ky hop le; tao script dong bo kho cap nhat len VPS de nguoi phu trach chay sau; bo sung Help tieng Viet va bang chung test. Khong SSH, khong trien khai VPS, khong gui noi dung tai lieu.

FINDINGS:

- API may chu da du cho client; khong can sua branch `feat/3t-web-agy`. Client updater dung truc tiep kho tinh `/updates`, khong phu thuoc endpoint `/api/v1/updates/{product}/{channel}/latest` dang 404.
- Reporter cu dung token tinh/Bearer, gui nguyen record noi bo co truong thua va co duong gui tep dinh kem; khong khop `ReportPayload` cua VPS.
- Script dong goi cu ghi de config mau va chi giu mot nguon LAN, nen can cap nhat ca `scripts/build-pilot.ps1`, khong chi file config mau.
- May chay kiem co `ssh.exe`/`scp.exe`, chua co `rsync`; config SSH chi co cac khoa `host`, `user`, `port`, `password`. Gia tri mat khau khong duoc in/ghi vao log.
- Thu that: request token ban dau bi HTTP 403 khi reporter chua co User-Agent rieng. Sau khi them `3TOffice-ErrorReporter/1`, token endpoint tra HTTP 200. POST bao cao da duoc goi mot lan nhung client khong nhan duoc status truoc timeout co dinh, nen hang doi duoc giu lai. Khong tang timeout va khong gui lai de tranh trung bao cao neu server da nhan request.

IMPLEMENTATION SUMMARY:

- Tao va luu UUIDv4 an danh mot lan tai thu muc du lieu nguoi dung; tach khoi trang thai consent va co migration tu file consent cu.
- Lay token dong tai `<base>/api/v1/reports/token`, cache trong bo nho den `expires_at`, xoa/xin lai va retry mot lan khi POST tra 401. Bo doc token tinh tu config/bien moi truong.
- Dung lai payload mang bang allowlist dung 8 truong: `event_id`, `app`, `version`, `os`, `error_type`, `message`, `stack`, `installation_id`; loc lai message/stack ngay truoc POST; gioi han message 1.000 va stack 8.000 ky tu.
- Vo hieu gui attachment toi VPS. UI khong con dua lua chon dinh kem; tep duoc dua vao hang doi boi client cu chi bi xoa cuc bo sau khi metadata gui thanh cong, khong co request multipart.
- Giu consent va hang doi offline; khi chua dong y khong xin token/khong gui. Sender nen thu lai co backoff nhu cu.
- `update.sources` ho tro danh sach va van doc `update.source` cu. Updater thu metadata tung nguon, chi chon sau khi chu ky manifest qua khoa cong khai, sau do lay tat ca blob tu dung nguon da chon. Loi blob khong chuyen sang nguon khac giua lan cap nhat.
- Ghi `update-source-selected` vao `update-log.txt`; state UI co `selected_source` va `error_message` tieng Viet khi moi nguon deu hong.
- Config mau va config do build sinh ra co LAN truoc, `https://office.3tcomputer.com/updates` sau, endpoint bao loi la base `https://office.3tcomputer.com`.
- Tao `scripts/release/sync-updates-to-vps.ps1`: doc cau hinh ngoai repo, uu tien rsync va fallback scp, dung SSH_ASKPASS qua bien moi truong, giu host-key checking, chep blob truoc/version metadata sau/channel cuoi cung, kiem dem tep va SHA-256 mau. Script CHUA CHAY.
- Cap nhat Help dung chung cho Doc/Sheet/Slide: bai bao loi/quyen rieng tu va bai cap nhat tu kho noi bo/Internet, dung tab `Tro giup`/F1 hien co.

FILES CHANGED:

- `adapters/error_reporting/reporter.py`
- `adapters/updater/updater.py`
- `main.py`
- `vnoffice-config.example.json`
- `scripts/build-pilot.ps1`
- `scripts/release/sync-updates-to-vps.ps1`
- `platform/error_reporting/error-reporting-ui.js`
- `platform/help/entries-error-reporting.js`
- `platform/help/entries-updater.js`
- `tests/test_error_reporting.py`
- `tests/test_error_report_server.py`
- `tests/test_updater.py`
- `tests/unit/error-reporting.test.js`
- `docs/HANDOFF-CH9-1-VPS.md`

COMMANDS RUN:

- `python -m unittest tests.test_error_reporting tests.test_error_report_server`
- `python -m unittest tests.test_updater`
- `node tests/run-tests.js`
- `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs`
- PowerShell AST parse `scripts/release/sync-updates-to-vps.ps1`
- `python -m py_compile adapters/error_reporting/reporter.py adapters/updater/updater.py main.py`
- `git diff --check`
- Thu that bang `ErrorReporter('0.9.7', ..., endpoint='https://office.3tcomputer.com')`, consent true, `TestReport` / `kiem tra ket noi`.

BUILD RESULT: NOT RUN - khong dong goi lai kho 2,2 GB trong task nay. PowerShell syntax gate cho script release moi PASS; source Python compile PASS.

TEST RESULTS:

- PASS - reporter + error-report server: 28/28.
- PASS - updater: 19/19; 15 test hien co van PASS, 4 test moi phu failover/config cu/chu ky sai/hai nguon hong.
- PASS - `node tests/run-tests.js`: 2565/2565.
- PASS - PowerShell parser, Python compile va `git diff --check`.
- FAIL - thu that report: token HTTP 200; POST report khong nhan duoc HTTP status trong timeout co dinh, `send_once=False`, queue duoc giu lai. Khong tang timeout.
- FAIL - desktop regression: 26 PASS / 1 FAIL / 6 N/A. Fail duy nhat: `3T Sheet type detection`, chuoi gio `13:45` van la string thay vi duoc nhan la time; dung hien trang nguoi giao viec da neu.

KNOWN FAILURES:

- Can kiem tra log/reverse proxy VPS de xac dinh POST `TestReport` da den server hay bi cham qua timeout. Token endpoint da xac nhan HTTP 200 sau khi co User-Agent. Khong in token.
- Desktop CDP con loi nhan dang `13:45`; ngoai scope CH-9.1 va khong sua expected.

RISKS:

- `scp` fallback chep lai nhieu tep hon rsync voi kho lon; nen cai/co san rsync tren may release de dong bo hieu qua.
- Script khong xoa tep thua tren VPS de tranh hanh dong destructive; vi vay remote count co the lon hon local. Script bat buoc remote count khong nho hon local va SHA-256 mau phai khop.
- Neu reverse proxy thu that tiep tuc tra cham hon timeout client, bao cao se nam trong queue va sender retry theo backoff; can sua phia may chu/proxy thay vi tang timeout test/client tuy tien.

DEPENDENCIES/BLOCKERS:

- Claude/nguoi phu trach can review script, dam bao `rsync` neu muon dong bo nhanh, sau do tu chay `sync-updates-to-vps.ps1`; Codex chua chay va khong SSH VPS.
- Can review log VPS cho request thu that va xac nhan status POST. Day la blocker duy nhat de danh dau gate thu that PASS.
- Rollback: revert commit CH-9.1. Config `update.source` cu van duoc ho tro, nen co the bo `sources` ma app van dung LAN nhu truoc.

CORE PATCH ID (if any): N/A - khong sua LibreOffice Core/upstream.

NEXT ACTION:

1. Review diff va handoff; xac minh log VPS cho `TestReport`/reverse proxy timeout.
2. Chay script dong bo tu may release sau khi review, khong ghi mat khau vao log; xac nhan count/hash va channel duoc chep cuoi.
3. Chay lai thu that mot lan sau khi phia VPS xac minh/sua latency; yeu cau HTTP 2xx cua POST report.
4. Neu chap nhan 1 loi desktop da biet, commit nay san sang merge sau review; khong merge/push tu worktree nay.
