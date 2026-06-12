# MemCore MCP Server — Universal Installation Guide

## 📋 Overview

MemCore MCP server ko **kisi bhi project folder** me kholo aur **kisi bhi AI tool** se connect karo.

Sab global config files ban gayi hain — ek baar setup karo, har project me kaam karega!

---

## ✅ What's Already Configured

| Tool | Config File | Key Format | Status |
|------|-------------|-----------|--------|
| **Codebuff / Claude CLI** | `~/.claude/settings.json` | `mcpServers` | ✅ Global |
| **Cursor** | `~/.cursor/mcp.json` | `mcpServers` | ✅ Global |
| **VS Code** | `%APPDATA%\Code\User\mcp.json` | `servers` | ✅ Global |
| **Windsurf** | `~/.windsurf/mcp.json` | `mcpServers` | ✅ Global |

> ⚠️ **Note:** VS Code uses `"servers"` as root key, not `"mcpServers"`. This is already handled.

---

## 🔧 How To Use

### In Cursor
1. Open **any** project folder
2. `Ctrl+Shift+P` → Search "MCP" → Toggle `ai-memory` server ON
3. In Composer, AI automatically has access to MemCore tools

### In VS Code
1. `Ctrl+Shift+P` → Run **MCP: Open User Configuration** (opens the file we created)
2. Or just open any project — Copilot will detect MCP servers from user config
3. AI can call tools like `track-request`, `get-decisions`, etc.

### In Codebuff / Claude CLI
1. Already configured globally in `~/.claude/settings.json`
2. AI will auto-detect and use the MCP server

### In Windsurf
1. Already configured globally in `~/.windsurf/mcp.json`
2. Open any project — MCP servers auto-detect

---

## 🔌 Available MCP Tools (20+)

| Tool | Function |
|------|----------|
| `track-request` | Save a prompt / request to memory |
| `track-decision` | Record a decision with reasoning |
| `track-task` | Track a todo item |
| `track-file-change` | Log a file change |
| `save-session` | Save current session |
| `get-status` | Get project memory status |
| `get-summary` | Get high-density handoff briefing |
| `search-memory` | Semantic vector search |
| `ask-memory` | RAG-powered Q&A from past memory |
| `get-decisions` | Fetch decisions from MongoDB |
| `get-tasks` | Fetch tasks from MongoDB |
| `get-history` | Fetch session history |
| `init-project` | Initialize .aimemory for a project |
| `list-skills` | Browse all 30+ engineering skills |
| `apply-skill` | Activate a skill for a task |
| `get-skill-tree` | View skill dependency tree |
| ... and more! | |

## 📂 Available MCP Resources

| Resource URI | Content |
|-------------|---------|
| `memory://project/status` | Project info + stats |
| `memory://project/context` | Full context from markdown |
| `memory://decisions` | Decisions list |
| `memory://tasks` | Tasks list |
| `memory://changelog` | File changes log |
| `skills://list` | All skills list |
| `skills://tree` | Skill dependency tree |
| `skills://categories` | Categories with counts |
| `skills://stats` | Skill statistics |

---

## 🧪 Test MCP Server

```bash
# From your MemCore directory:
node mcp-server.js

# Or use stdin to test:
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node mcp-server.js
```

## 🌍 What About Gemini / ChatGPT / Other AI Tools?

- **Google Gemini**: Supports MCP via UI (Connected Apps) — no JSON config
- **ChatGPT Desktop**: Supports MCP via UI (Connected Apps) — no JSON config
- **Claude Desktop**: Supports MCP via UI (Connected Apps)

For these tools, you'd connect via their respective settings UI.

---

> 📍 **Server Location:** `./mcp-server.js` (relative to your MemCore clone)
> 🔐 **MongoDB:** Auto-read from `.env` in the same folder
