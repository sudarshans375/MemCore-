---
name: claude-memory-pro
description: Advanced memory and context management for Claude agents. Use for optimizing context usage across large codebases and monorepos.
cat: maintain
source: external
---

# Claude Memory Best Practices

## Loading Mechanisms
- **Ancestor Loading**: Claude walks **up** the tree from the CWD to the root, loading all `CLAUDE.md` files at startup.
- **Descendant Loading**: Files in subdirectories are **lazy-loaded** only when interacting with files in those directories.

## Monorepo Strategy
- Shared conventions go in the root `CLAUDE.md`.
- Component-specific rules stay in local `CLAUDE.md` files to optimize context.
- Use path-based scoping to ensure agents only load relevant instructions.
