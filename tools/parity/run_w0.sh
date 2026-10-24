#!/bin/bash
# W0 (lan chay chinh thuc): lam moi nguon OOXMLKit trong WSL va chay swift test.
# Nguon: worktree Windows /mnt/e/VNOffice-agy-parity/ports/ios/OOXMLKit (qua rsync).
# Loi moi truong da do: git tren Windows co core.autocrlf=true -> file text (moi file
# .swift, fixture text *.raw) bi chuyen LF->CRLF khi checkout/archive, lam:
#   - DeflateTests.testInflateZlibStreamsAllStrategies: inflate ra 29710 byte vs
#     fixture xml.raw 29711 byte (CRLF them 1 byte) -> FAIL 6 lan (xml.*),
#   - OfflineGuaranteeTests.testOnlyFoundationAndInternalModulesAreImported:
#     module doc ra la "OOXMLPackage\r" va khong nam trong allowed list -> FAIL
#     tren moi file Sources (27 lan).
# Cach vuot: chuan hoa lai CRLF -> LF cho .swift va fixture text (*.raw) trong
# ban copy /root/ooxml truoc khi test (khong sua ma nguon trong repo).
export PATH=/opt/swift/usr/bin:$PATH
SRC="/mnt/e/VNOffice-briefs/logs/w2-work/ooxmlkit-clean/ports/ios/OOXMLKit"
# Nguon "sach" do tools/parity/stage_ooxmlkit.py tao ra (blob git goc cho moi file,
# khong bi autocrlf tua len checkout Windows). Neu staging chua co, quy tu worktree
# va thuan hoa CRLF -> LF cho file text (.swift va *.raw) nhu phuong phap du phong.
mkdir -p /root/ooxml
rsync -a --delete "$SRC/" /root/ooxml/
cd /root/ooxml || exit 2
python3 - <<'PY'
import pathlib
root = pathlib.Path('/root/ooxml')
n = 0
for p in list(root.rglob('*.swift')) + list(root.rglob('*.raw')):
    b = p.read_bytes()
    if b'\r\n' in b:
        p.write_bytes(b.replace(b'\r\n', b'\n'))
        n += 1
print('normalized CRLF->LF (du phong):', n, 'files')
PY
rm -rf /root/ooxml/.build /root/ooxml/Ports 2>/dev/null
START=$(date +%s)
swift test > /tmp/w0-final-full.log 2>&1
RC=$?
END=$(date +%s)
grep -E "Executed [0-9]+ tests" /tmp/w0-final-full.log | tail -2
echo "rc=$RC seconds=$((END-START))"
cp /tmp/w0-final-full.log /mnt/e/VNOffice-briefs/logs/w0-agy-swifttest-final.log
exit "$RC"
