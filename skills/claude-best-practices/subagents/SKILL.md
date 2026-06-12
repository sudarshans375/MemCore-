---
name: claude-subagent-orchestration
description: Best practices for orchestrating and steering subagents. Use when delegating complex tasks to specialized agents.
cat: plan
source: external
---

# Claude Subagent Orchestration

## Configuration Fields
- `tools`: Whitelist of tools the subagent can use.
- `disallowedTools`: Blacklist of tools.
- `permissionMode`: Security level.
- `maxTurns`: Resource limit.
- `memory`: Scope of memory to pass.
- `isolation`: Context isolation (e.g., `worktree`).

## Official Agent Types
- **General-Purpose**: Standard task execution.
- **Explore**: Read-only research.
- **Plan**: Deep analysis and strategy.
- **Statusline-Setup**: UI/Environment configuration.
