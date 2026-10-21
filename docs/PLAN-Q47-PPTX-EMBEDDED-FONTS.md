# Q47 plan — preserve embedded fonts in PPTX round-trips

## Objective

Keep existing `ppt/embeddedFontLst`, its `presentation.xml.rels` font relationships, and referenced `.fntdata` parts when a PPTX is opened and saved through the Slides adapter.

## Current capability

The app already passes the original PPTX bytes into `postprocess_slides_pptx`, which restores selected native OOXML details. A CDP save of the current 10-slide fixture produced identical dev and packaged ZIPs, but both dropped all 10 embedded-font parts and the embedded-font list from the source. Shape order and the ten slide XML files remained stable.

## Files/modules

- `adapters/libreoffice/common/ooxml_zip_patch.py`: add a focused source-font restoration helper and call it in the existing PPTX postprocess path.
- `tests/test_slides_pptx_embedded_fonts.py`: synthetic OOXML regression for payloads, relationships, list references, and content types.
- `09-templates/AGENT-HANDOFF.md`: append Q47 findings after verification.

## Dependencies

No new dependencies. Reuse the existing ZIP reader/writer and Python `zipfile`/`xml.etree.ElementTree`.

## Risks

Relationship IDs can collide with converter-generated relationships; restoration must remap IDs and update the embedded-font list. Preserve only font parts referenced by the source list, avoid overwriting conflicting output parts, and keep content types valid. This restores source metadata that the app cannot currently edit.

## Test plan

- Run the new pytest before implementation and record the expected failure.
- Run the new pytest after implementation.
- Re-run a CDP save/reopen on `sample-3.pptx`, inspect screenshots, and compare dev/package OOXML including embedded fonts and slide order.
- Run the Q47 gates: test runner, i18n parity, checklist evidence, and related pytest selection. PowerPoint COM remains hidden-only and is BLOCKED if the host rejects hidden mode.

## Rollback

Revert only the dedicated embedded-font preservation commit; retain the separate taskbar fix commit.
