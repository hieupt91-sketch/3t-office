# Git & Worktrees

Long-lived: `main`; optional `develop`.
Short-lived:
`feature/writer-*`, `feature/sheet-*`, `feature/slides-*`, `feature/platform-*`,
`feature/adapter-*`, `fix/*`, `upstream-sync/*`, `release/*`.

One agent = one branch = one worktree.

Example:
```bash
git worktree add ../VNOffice-writer -b feature/writer-home-ribbon
git worktree add ../VNOffice-sheet -b feature/sheet-formula-bar
git worktree add ../VNOffice-slides -b feature/slides-navigator
git worktree add ../VNOffice-platform -b feature/platform-theme
```

No long-lived app branches.

Commit prefixes:
`writer:`, `sheet:`, `slides:`, `platform:`, `adapter:`, `core:`, `build:`, `test:`, `docs:`, `branding:`.
