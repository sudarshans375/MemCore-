# MemCore

The Universal AI Memory System — Your AI Never Forgets.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18-brightgreen)](https://nodejs.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB-Atlas-green)](https://www.mongodb.com/atlas)
[![MCP Protocol](https://img.shields.io/badge/MCP-v1.0-purple)](https://modelcontextprotocol.io)

---

## Table of Contents

- [What is MemCore?](#what-is-memcore)
- [Architecture](#architecture)
- [Features](#features)
- [Quick Start (Local)](#quick-start-local)
- [CLI Commands](#cli-commands)
- [MCP Server Setup](#mcp-server-setup)
- [Cloud Deployment](#cloud-deployment)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)
- [License](#license)
- [Contributing](#contributing)

---

## What is MemCore?

MemCore is a persistent memory layer for AI coding agents. It works with **Claude, Cursor, Codebuff, Windsurf, VS Code Copilot**, and any tool that supports the Model Context Protocol (MCP).

Instead of your AI starting from zero every session, MemCore remembers:

- Every request and response you have made
- Every architectural decision with full reasoning
- Every pending and completed task
- Every file change across your projects
- **Semantic vector search** — find past context by meaning, not by keywords
- **RAG-powered Q&A** — Ask your project's past in plain language

It comes bundled with **30+ production-grade engineering skills** (from Addy Osmani's Agent Skills) that make AI agents follow senior-engineer workflows automatically.

---

## Architecture

```
+--------------------------------------------------------------------+
|                         MemCore System                              |
|                                                                     |
|   +--------------+    +-----------------+    +------------------+   |
|   |  AI Tools     |    |   MCP Protocol   |    |   CLI Interface  |   |
|   |  +---------+ |    |   (Stdio/HTTP)   |    |   +------------+ |   |
|   |  | Claude  | |    |                  |    |   |  aimemory  | |   |
|   |  +---------+ |    |  mcp-server.js   |    |   |  (bash/bat)| |   |
|   |  | Cursor  | |    |  +-----------+   |    |   +------------+ |   |
|   |  +---------+ |    |  | 22 Tools  |   |    |   +------------+ |   |
|   |  | Codebuff| |    |  | 9 Resources|   |    |   |node ai-    | |   |
|   |  +---------+ |    |  | 3 Prompts |   |    |   |memory.js   | |   |
|   |  | Windsurf | |    |  +-----------+   |    |   +------------+ |   |
|   |  +---------+ |    +--------+----------+    +--------+---------+   |
|   +--------------+             |                         |           |
|                                |           +-------------+--------+  |
|                                +---------->   ai-memory.js        |  |
|                                           |   (Core Engine)        |  |
|                                           |   +-----------------+  |  |
|                                           |   | Project Detect  |  |  |
|                                           |   | Session Track   |  |  |
|                                           |   | Vector Search   |  |  |
|                                           |   | RAG (Gemini)    |  |  |
|                                           |   | Auto-Router     |  |  |
|                                           |   +-----------------+  |  |
|                                           +------------------------+  |
|                                                      |               |
|                         +----------------------------+-----------+   |
|                         |                            |           |   |
|                         v                            v           v   |
|  +--------------------------+  +-------------+  +----------------+   |
|  |    MongoDB Atlas         |  |  .aimemory/ |  |  skills/       |   |
|  |  +--------------------+  |  |  +---------+|  |  +------------+|   |
|  |  | projects           |  |  |  |decisions||  |  | interview  ||   |
|  |  | sessions           |  |  |  |.md      ||  |  | -me        ||   |
|  |  | decisions          |  |  |  +---------+|  |  +------------+|   |
|  |  | tasks              |  |  |  |tasks.md ||  |  | spec-driven||   |
|  |  | file_changes       |  |  |  +---------+|  |  +------------+|   |
|  |  | vectors (768-dim)  |  |  |  |changelog||  |  | tdd        ||   |
|  |  | project_memory     |  |  |  |.md      ||  |  +------------+|   |
|  |  +--------------------+  |  |  +---------+|  |  | ...30+more ||   |
|  |  Atlas Vector Search    |  |  |project   ||  |  +------------+|   |
|  |  Cosine Similarity      |  |  |context   ||  |                |   |
|  |  + Project Filter       |  |  |.md       ||  |                |   |
|  +--------------------------+  +-------------+  +----------------+   |
|                                                                      |
|                     +---------------------------+                    |
|                     |    Gemini AI (Google)     |                    |
|                     |  +---------------------+  |                    |
|                     |  | text-embedding-004  |  |  Vector embedding |
|                     |  | (768-dim vectors)   |  |                   |
|                     |  +---------------------+  |                   |
|                     |  | gemini-1.5-flash    |  |  RAG Q&A          |
|                     |  +---------------------+  |                   |
|                     +---------------------------+                    |
+--------------------------------------------------------------------+
```

### Data Flow

```
User Prompt
    |
    v
AI Tool (Claude / Cursor / Codebuff)
    |
    +---> MCP Client ---> mcp-server.js ---> ai-memory.js
    |                                               |
    |                       +-----------------------+-------+
    |                       |                               |
    |                       v                               v
    |               +---------------+               +---------------+
    |               |   MongoDB     |               |  .aimemory/   |
    |               |   (Cloud)     |               |  (Local MD)   |
    |               +---------------+               +---------------+
    |
    +---> Direct CLI ---> aimemory [command]
```

---

## Features

### Memory System

| Feature | Description |
|---------|-------------|
| Session Tracking | Every request, file change, decision, and task logged automatically |
| Project Isolation | Each project gets its own namespace -- never mix contexts |
| Auto-Detection | Detects project from `.aimemory/`, git remote, or folder path |
| Semantic Search | Vector similarity search -- find by meaning, not by keywords |
| RAG Q&A | Ask questions in plain language, get answers from past context |
| Session Handoff | `summary` command generates handoff briefing for AI model switching |
| Dual Persistence | MongoDB cloud storage + local markdown files |

### MCP Protocol (22 Tools)

| Tool | Description |
|------|-------------|
| `track-request` | Log a prompt or request to memory |
| `track-decision` | Record an architecture decision with reasoning |
| `track-task` | Add a todo item |
| `track-file-change` | Log a file modification |
| `save-session` | Persist current session |
| `get-status` | Project overview and DB status |
| `get-summary` | High-density handoff briefing |
| `search-memory` | Semantic vector search |
| `ask-memory` | RAG-powered Q&A |
| `list-skills` | Browse 30+ engineering skills |
| `apply-skill` | Activate a skill for a task |
| + 11 more tools | Resources, prompts, categories, stats |

### Engineering Skills (30+)

Pre-built production-grade workflows:

```
DEFINE          PLAN            BUILD           VERIFY          SHIP
+--------+    +--------+     +--------+     +--------+     +--------+
| Spec  |--->| Plan   |--->| Code   |--->| Test   |--->| Deploy |
| Driven|    | & Task |    | Increm |    | & Debug|    | & Ship |
+--------+    +--------+    +--------+    +--------+    +--------+
```

Skills activate automatically based on your prompt -- mention "review" and code-review kicks in, mention "test" and TDD activates.

### Supported AI Tools

| Tool | Connection | Status |
|------|-----------|--------|
| Claude Code / Codebuff | Global MCP config | Auto |
| Cursor | Global MCP config | Auto |
| VS Code (Copilot) | Global MCP config | Auto |
| Windsurf | Global MCP config | Auto |
| Gemini CLI | Skills install | Supported |
| Any MCP Client | Stdio or HTTP | Supported |

---

## Quick Start (Local)

### Prerequisites

- **Node.js** v18 or later (v20 recommended)
- **MongoDB Atlas** account (free tier is sufficient)
- **(Optional) Google Gemini API Key** — required for vector search and RAG

### Setup Steps

```bash
# 1. Clone the repository
git clone https://github.com/sudarshans375/MemCore-.git
cd MemCore-

# 2. Install dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env with your MongoDB Atlas URI and optionally Gemini API key

# 4. Initialize MemCore in your project
node ai-memory.js init

# 5. Verify the setup
node ai-memory.js status

# 6. (One-time) Setup Atlas Vector Search
node ai-memory.js setup-db
```

---

## CLI Commands

```bash
# Initialize in any project folder
node ai-memory.js init

# View project status
node ai-memory.js status

# See recent session history
node ai-memory.js history

# Log an architectural decision
node ai-memory.js decision "Use MCP" "Need AI integration" "Chose MCP over REST" "accepted"

# Add a task
node ai-memory.js task "Add authentication" "pending"

# Semantic vector search
node ai-memory.js search "database schema decision"

# RAG-powered Q&A (requires Gemini API key)
node ai-memory.js ask "Why did we choose this architecture?"

# Generate AI handoff summary (run before switching models)
node ai-memory.js summary

# Save session and close database connection
node ai-memory.js shutdown
```

---

## MCP Server Setup

```bash
# Stdio mode (for local AI tools like Codebuff, Claude)
node mcp-server.js

# HTTP mode (for remote AI tools)
node mcp-server.js --http 3100

# HTTP mode with custom port
node mcp-server.js --http 3200

# With authentication (set AI_MEMORY_API_KEY in .env)
node mcp-server.js --http 3100
```

The MCP server is auto-configured for:
- **Claude Code / Codebuff** -- via `~/.claude/settings.json`
- **Cursor** -- via `~/.cursor/mcp.json`
- **VS Code** -- via `%APPDATA%\Code\User\mcp.json`
- **Windsurf** -- via `~/.windsurf/mcp.json`

---

## Cloud Deployment

### Docker

```bash
# Build and run using Docker Compose
docker-compose up -d

# View logs
docker logs ai-memory-server
```

### PM2 (Production Process Manager)

```bash
# Install PM2 globally
npm install -g pm2

# Start the server
pm2 start ecosystem.config.js

# Save the process list
pm2 save

# Configure PM2 to restart on system boot
pm2 startup
```

### VPS Deployment

```bash
# Run the automated deployment script
bash deploy-vps.sh
```

The deployment script will:
1. Install Node.js 20 if not already installed
2. Install PM2 globally
3. Install project dependencies
4. Create `.env` from template if missing
5. Start the MCP server on port 3100 using PM2
6. Configure PM2 to auto-start on system reboot

### MongoDB Atlas Configuration

1. Create a free cluster at [MongoDB Atlas](https://www.mongodb.com/atlas)
2. Create a database user with read/write permissions
3. Whitelist your IP address (or use `0.0.0.0/0` for cloud deployments)
4. Get your connection URI
5. Add it to `.env`:
   ```
   AI_MEMORY_MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/
   ```

### Gemini API (for Vector Search and RAG)

1. Get an API key from [Google AI Studio](https://aistudio.google.com/)
2. Add it to `.env`:
   ```
   GOOGLE_API_KEY=your_api_key_here
   ```
3. Run `node ai-memory.js setup-db` to create the Atlas Vector Search Index

---

## Project Structure

```
memcore/
+-- ai-memory.js              # Core engine
+-- mcp-server.js             # MCP protocol server v4.0
+-- aimemory                  # Bash CLI wrapper
+-- aimemory.bat              # Windows CLI wrapper
+-- package.json              # Dependencies and scripts
+-- .env.example              # Environment configuration template
+-- .gitignore                # Git exclusions
+-- README.md                 # This file
+-- LICENSE                   # MIT License
+-- CONTRIBUTING.md           # Contribution guidelines
+-- CODE_OF_CONDUCT.md        # Code of conduct
+-- SKILL_TREE.md             # Skill dependency tree
|
+-- .aimemory/                # Per-project memory (auto-generated)
|   +-- project.json          # Project identity
|   +-- project_context.md    # Active context
|   +-- decisions.md          # Architecture decisions
|   +-- tasks.md              # Task list
|   +-- changelog.md          # Change log
|
+-- skills/                   # 30+ Engineering Skills
|   +-- interview-me/         # Requirements discovery
|   +-- spec-driven-dev/      # Spec before code
|   +-- test-driven-dev/      # Red-Green-Refactor
|   +-- code-review/          # Multi-axis review
|   +-- frontend-ui/          # Component architecture
|   +-- ... (30+ total)
|
+-- Dockerfile                # Container setup
+-- docker-compose.yml        # Docker orchestration
+-- ecosystem.config.js       # PM2 process manager config
+-- deploy-vps.sh             # VPS deployment script
+-- mcp-config.json           # MCP AI tool configuration
+-- mcp-auto-setup.bat        # Windows auto-installer
+-- mcp-install.md            # MCP installation guide
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | JavaScript (Node.js 18+) |
| Protocol | Model Context Protocol (MCP) v1.0 |
| Database | MongoDB Atlas with Vector Search |
| Vector Embeddings | Google Gemini text-embedding-004 (768 dimensions) |
| RAG LLM | Google Gemini 1.5 Flash |
| Container | Docker + Docker Compose |
| Process Manager | PM2 for production |
| Skills Framework | Addy Osmani's Agent Skills (30+) |

---

## License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidelines.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## Acknowledgments

- [Addy Osmani](https://github.com/addyosmani) -- Agent Skills framework
- Anthropic -- Model Context Protocol (MCP)
- MongoDB -- Atlas Vector Search
- Google -- Gemini AI (Embeddings and RAG)

---

<p align="center">
  Made by <a href="https://github.com/sudarshans375">sudarshans375</a>
  <br>
  Star this repository if your AI remembers everything.
</p>
