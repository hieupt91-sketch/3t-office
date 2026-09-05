# SmartArt PPTX parts

These XML files are the native DrawingML SmartArt package (`ppt/diagrams/*`)
used to pack `sample-slides-smartart.pptx`. They are **not** produced by
VN Office `serializeToFodp()`.

- `data1.xml` — diagram data model with Vietnamese node text
- `layout1.xml` — list layout `urn:microsoft.com/office/officeart/2005/8/layout/default`
- `quickStyle1.xml` — `simple1` quick style
- `colors1.xml` — `accent1_2` color definition
- `drawing1.xml` — cached DrawingML fallback (`dsp:drawing`) with the same labels

Pack:

```
node tests/scripts/pack-slides-smartart-pptx.mjs
```
