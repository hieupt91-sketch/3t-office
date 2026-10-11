# Testing Standard
Layers: unit → module → integration → compatibility → UI smoke → release smoke.

Impact matrix:
- app-only: app build/tests + common smoke
- platform: Writer + Sheet + Slides smoke
- adapter: all apps + integration
- core: all apps + OOXML compatibility + regression
- build/release: clean build + installer smoke

Test result vocabulary only: PASS / FAIL / NOT RUN / BLOCKED.
