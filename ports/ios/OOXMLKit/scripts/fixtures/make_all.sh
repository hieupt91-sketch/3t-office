#!/usr/bin/env bash
# Tái tạo mọi fixture tổng hợp (cần Tests/OOXMLTestSupport/Fixtures/real/* có sẵn để lấy theme).
set -euo pipefail
cd "$(dirname "$0")/../.."
F=Tests/OOXMLTestSupport/Fixtures
for s in zip xlsx docx pptx; do python3 -I "scripts/fixtures/make_${s}_fixtures.py" "$F"; done
