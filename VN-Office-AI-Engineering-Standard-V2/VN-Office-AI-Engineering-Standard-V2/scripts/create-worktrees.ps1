$ErrorActionPreference = "Stop"
git worktree add ../VNOffice-writer -b feature/writer-work
git worktree add ../VNOffice-sheet -b feature/sheet-work
git worktree add ../VNOffice-slides -b feature/slides-work
git worktree add ../VNOffice-platform -b feature/platform-work
git worktree list
