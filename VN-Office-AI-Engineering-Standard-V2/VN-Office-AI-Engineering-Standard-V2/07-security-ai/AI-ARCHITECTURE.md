# AI Architecture
```text
AI UI
→ VN AI Service
→ Context/Permission Layer
→ Provider Interface
   ├── Cloud Provider
   ├── Alternative Provider
   └── Local Model
```

Every AI feature defines:
- user intent/action
- selected document scope
- data leaving device
- provider
- consent requirement
- auth
- timeout
- retry
- streaming
- cancellation
- cost/rate controls
- retention assumptions
- log redaction
- offline/failure behavior

AI suggestions must not destructively replace document content without explicit user action.
Keys are never hard-coded.
