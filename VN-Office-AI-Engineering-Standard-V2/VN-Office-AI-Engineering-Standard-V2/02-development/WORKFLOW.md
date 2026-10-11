# Development Workflow
`DISCOVER → PLAN → IMPLEMENT → BUILD → TEST → REVIEW → DOCUMENT → MERGE`

## Discover
- locate existing LibreOffice behavior
- identify owner/layer
- identify reuse point
- identify compatibility/security/upstream impact

## Implement
- smallest correct change
- no unrelated refactor
- preserve upstream diff locality
- reuse shared components
- explicit error handling

## Build
Build smallest relevant target first; broaden according to impact.

## Test
App change → app tests.
Platform → all 3 smoke.
Adapter/Core → all 3 + compatibility.

## Review
Architecture, duplication, UX, security, performance, upstream diff, tests.

## Document
Update only meaningful architecture/API/build/security/upstream changes.
