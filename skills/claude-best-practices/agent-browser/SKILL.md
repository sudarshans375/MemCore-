---
name: claude-agent-browser
description: Browser automation and web interaction best practices for agents. Use for navigating web pages, capturing snapshots, and interacting with UI elements.
cat: build
source: external
---

# Agent Browser Skill

## Overview
A browser automation CLI for agents to navigate, click, fill forms, and take screenshots.

## Workflow
1. **Navigate**: Go to the target URL.
2. **Snapshot**: Capture the page state (DOM + Screenshots).
3. **Interact**: Click, type, or scroll using semantic locators or element refs (@e1).
4. **Re-snapshot**: Verify the result of the interaction.

## Features
- Interactive element refs (@e1, @e2)
- Semantic locators
- State persistence (auth)
- Mobile simulation via iOS Simulator
