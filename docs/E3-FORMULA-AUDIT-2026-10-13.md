# E3 formula cache gate — 2026-10-13

## Method

Ran `node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_cache.mjs` against all 28 `file test/lan/lanNN.xlsx` fixtures. The desktop app was launched from this worktree; the audit script compares FormulaEngine values with the XLSX cached values. Baseline percentages were read from commit `d520d04c` (0.9.9). Generated full report and JSON are retained in `E:\VNOffice-profiles\codex-fe3\formulas-cache-e3.md` and `.json`.

## Per-file comparison

| # | Fixture | 0.9.9 baseline | E3 worktree | Gate |
|---:|---|---:|---:|---|
| 1 | `lan01.xlsx` | 25.90% | 24.28% | BELOW |
| 2 | `lan02.xlsx` | 50.00% | 0.00% | BELOW |
| 3 | `lan03.xlsx` | 85.26% | 2.11% | BELOW |
| 4 | `lan04.xlsx` | 16.33% | 51.02% | same/above |
| 5 | `lan05.xlsx` | 100.00% | 0.00% | BELOW |
| 6 | `lan06.xlsx` | 40.27% | 8.21% | BELOW |
| 7 | `lan07.xlsx` | 92.05% | 1.53% | BELOW |
| 8 | `lan08.xlsx` | 100.00% | 0.00% | BELOW |
| 9 | `lan09.xlsx` | 50.00% | 100.00% | same/above |
| 10 | `lan10.xlsx` | 100.00% | 33.33% | BELOW |
| 11 | `lan11.xlsx` | 100.0% | 100.0% | same/above |
| 12 | `lan12.xlsx` | 100.0% | 100.0% | same/above |
| 13 | `lan13.xlsx` | 100.00% | 4.68% | BELOW |
| 14 | `lan14.xlsx` | 49.84% | 0.00% | BELOW |
| 15 | `lan15.xlsx` | 100.00% | 100.00% | same/above |
| 16 | `lan16.xlsx` | 100.00% | 1.56% | BELOW |
| 17 | `lan17.xlsx` | 95.45% | 1.17% | BELOW |
| 18 | `lan18.xlsx` | 100.00% | 100.00% | same/above |
| 19 | `lan19.xlsx` | 80.00% | 0.00% | BELOW |
| 20 | `lan20.xlsx` | 100.00% | 100.00% | same/above |
| 21 | `lan21.xlsx` | 100.0% | 100.0% | same/above |
| 22 | `lan22.xlsx` | 0.00% | 0.00% | same/above |
| 23 | `lan23.xlsx` | N/A | N/A | same/above |
| 24 | `lan24.xlsx` | 100.00% | 18.52% | BELOW |
| 25 | `lan25.xlsx` | 100.0% | 100.0% | same/above |
| 26 | `lan26.xlsx` | 50.00% | 0.00% | BELOW |
| 27 | `lan27.xlsx` | 100.0% | 100.0% | same/above |
| 28 | `lan28.xlsx` | 97.09% | 7.64% | BELOW |

The gate fails: 16 of 28 fixtures are below 0.9.9; the current aggregate match rate is 0.55%. The E3 input changes do not edit FormulaEngine or formula serialization. This regression scope predates/extends beyond the E3 interaction work and needs a separate Sheet formula-engine owner investigation before an overall release PASS.
