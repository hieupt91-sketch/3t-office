#!/bin/bash
# W0 lan 2: dung nguon xac thuc tu git archive (khong bi autocrlf lam corruptions)
set -u
export PATH=/opt/swift/usr/bin:$PATH
cd /tmp/ooxml-src/ports/ios/OOXMLKit || exit 1
START=$(date +%s)
/usr/bin/time -v swift test > /tmp/w0-run2-full.log 2>&1
RC=$?
END=$(date +%s)
tail -6 /tmp/w0-run2-full.log
echo "push"
grep -E "Executed .*(tests|suites)" /tmp/w0-run2-full.log | tail -5
echo "rc=$RC seconds=$((END-START))"
cp /tmp/w0-run2-full.log /mnt/e/VNOffice-briefs/logs/w0-agy-swifttest-full-run2.log
exit "$RC"
