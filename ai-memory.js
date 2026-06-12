#!/usr/bin/env node
/**
 * AI Memory System v2.0 - Multi-Project Universal Memory
 * Works across any project. Auto-detects project from git remote or folder name.
 * Each project gets its own namespace in MongoDB with complete session history.
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const { MongoClient } = require("mongodb");
const crypto = require("crypto");
const { execSync } = require("child_process");

// --- Configuration ---
const MONGO_URI = process.env.AI_MEMORY_MONGO_URI || process.env.AI_MEMORY_MONGO_URL;
const DB_NAME = "ai_memory";
const AI_DIR = ".aimemory";
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;

const COLLS = { PROJECTS: "projects", SESSIONS: "sessions", MEMORY: "project_memory", DECISIONS: "decisions", TASKS: "tasks", FILES: "file_changes", VECTORS: "vectors" };

// --- State ---
let mongoClient = null, db = null, connectPromise = null, currProject = null;
let session = { id: null, requests: [], files: [], decisions: [], tasks: [], started_at: new Date().toISOString() };

// --- MongoDB ---
async function connectMongo() {
  if (db) return true;
  if (!MONGO_URI) return false;
  try {
    mongoClient = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 8000 });
    await mongoClient.connect();
    db = mongoClient.db(DB_NAME);
    return true;
  } catch (e) {
    console.error("  Failed to connect to MongoDB:", e.message);
    return false;
  }
}

async function ensureDb() {
  if (db) return true;
  if (!connectPromise) connectPromise = connectMongo();
  return connectPromise;
}

function closeDb() { if (mongoClient) try { mongoClient.close(); } catch(e) {} mongoClient = null; db = null; connectPromise = null; }

// --- Project Detection ---
function detectProject() {
  const cwd = process.cwd();
  // 1. .aimemory/project.json
  const pj = path.join(cwd, AI_DIR, "project.json");
  if (fs.existsSync(pj)) {
    try {
      const d = JSON.parse(fs.readFileSync(pj, "utf-8"));
      if (d.project_id) return { project_id: d.project_id, name: d.name || path.basename(cwd), root: cwd, git_remote: d.git_remote || "" };
    } catch(e) {}
  }
  // 2. git remote
  try {
    const r = execSync("git remote get-url origin", { cwd, encoding: "utf-8", stdio: ["pipe","pipe","pipe"] }).trim();
    if (r) {
      const pid = r.replace(/^https?:\/\//,"").replace(/^git@/,"").replace(/\.git$/,"").replace(/[^a-zA-Z0-9_-]/g,"_");
      return { project_id: pid, name: path.basename(cwd), root: cwd, git_remote: r };
    }
  } catch(e) {}
  // 3. Hash of absolute path
  const fname = path.basename(cwd);
  const fhash = crypto.createHash("md5").update(path.resolve(cwd)).digest("hex").slice(0,8);
  return { project_id: fname.replace(/[^a-zA-Z0-9_-]/g,"_") + "_" + fhash, name: fname, root: cwd, git_remote: "" };
}

// --- DB Helpers ---
async function ensureProject(proj) {
  if (!db) return proj;
  try {
    const exists = await db.collection(COLLS.PROJECTS).findOne({ project_id: proj.project_id });
    if (!exists) {
      await db.collection(COLLS.PROJECTS).insertOne({ project_id: proj.project_id, name: proj.name, root: proj.root, git_remote: proj.git_remote, created_at: new Date().toISOString(), last_session: new Date().toISOString(), session_count: 0 });
      console.log("  Created project:", proj.name);
    } else {
      await db.collection(COLLS.PROJECTS).updateOne({ project_id: proj.project_id }, { $set: { last_session: new Date().toISOString(), root: proj.root } });
    }
  } catch(e) { console.error("Project DB error:", e.message); }
  return proj;
}

function initFolder(proj) {
  const dir = path.join(proj.root, AI_DIR);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  // project.json
  const pf = path.join(dir, "project.json");
  if (!fs.existsSync(pf)) {
    fs.writeFileSync(pf, JSON.stringify({ project_id: proj.project_id, name: proj.name, git_remote: proj.git_remote, created_at: new Date().toISOString() }, null, 2));
  }
  // .gitignore inside .aimemory
  const gi = path.join(dir, ".gitignore");
  if (!fs.existsSync(gi)) fs.writeFileSync(gi, "*.tmp\nsession_*.md\n");
  // Markdown files
  const mds = ["project_context.md","decisions.md","tasks.md","changelog.md"];
  const today = new Date().toISOString().split("T")[0];
  for (const f of mds) {
    const fp = path.join(dir, f);
    if (!fs.existsSync(fp)) {
      const header = f.replace(".md","").replace("_"," ").replace(/\b\w/g, c => c.toUpperCase());
      fs.writeFileSync(fp, "# " + header + "\n\nProject: " + proj.name + " (" + proj.project_id + ")\nCreated: " + today + "\n\n---\n\n");
    }
  }
  return dir;
}

// --- Semantic Search Helpers ---
async function getEmbedding(text) {
  if (!GOOGLE_API_KEY) return null;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { parts: [{ text }] } })
    });
    const json = await response.json();
    return json.embedding.values;
  } catch (e) {
    console.error("Embedding error:", e.message);
    return null;
  }
}

async function saveVector(projectId, type, content, metadata = {}) {
  if (!db) return;
  const embedding = await getEmbedding(typeof content === 'string' ? content : JSON.stringify(content));
  if (embedding) {
    try {
      await db.collection(COLLS.VECTORS).insertOne({
        project_id: projectId,
        type,
        content,
        metadata,
        embedding,
        timestamp: new Date().toISOString()
      });
    } catch (e) {}
  }
}

async function searchMemory(query, limit = 5) {
  await ensureDb();
  if (!db || !currProject) return [];
  const embedding = await getEmbedding(query);
  if (!embedding) return [];

  try {
    const pipeline = [
      {
        "$vectorSearch": {
          "index": "vector_index",
          "path": "embedding",
          "queryVector": embedding,
          "numCandidates": limit * 10,
          "limit": limit,
          "filter": { "project_id": currProject.project_id }
        }
      },
      { "$project": { "embedding": 0 } }
    ];
    return await db.collection(COLLS.VECTORS).aggregate(pipeline).toArray();
  } catch (e) {
    console.error("Search error:", e.message);
    return await db.collection(COLLS.VECTORS).find({ 
      project_id: currProject.project_id,
      $text: { $search: query } 
    }).limit(limit).toArray();
  }
}

// --- Tracking Functions ---
async function trackRequest(msg) {
  await ensureDb();
  session.requests.push({ message: msg || "", timestamp: new Date().toISOString() });
  if (db && currProject) {
    try {
      await db.collection(COLLS.MEMORY).updateOne({ project_id: currProject.project_id, key: "requests" }, { $push: { value: { message: msg || "", timestamp: new Date().toISOString() } }, $setOnInsert: { created_at: new Date().toISOString() } }, { upsert: true });
      await saveVector(currProject.project_id, "request", msg);
    } catch(e) {}
  }
}

async function trackFileChange(file, type) {
  await ensureDb();
  session.files.push({ file, type: type || "modified", timestamp: new Date().toISOString() });
  if (db && currProject) {
    try {
      await db.collection(COLLS.FILES).insertOne({ project_id: currProject.project_id, file, type: type || "modified", timestamp: new Date().toISOString(), session_id: session.id });
    } catch(e) {}
  }
}

async function trackDecision(title, context, decision, status) {
  await ensureDb();
  const d = { title: title || "", context: context || "", decision: decision || "", status: status || "accepted", timestamp: new Date().toISOString() };
  session.decisions.push(d);
  if (db && currProject) {
    try {
      await db.collection(COLLS.DECISIONS).insertOne({ project_id: currProject.project_id, decision: d });
      await saveVector(currProject.project_id, "decision", `${title}: ${decision}`, { context, status });
    } catch(e) {}
  }
  try {
    const mdPath = path.join(currProject.root, AI_DIR, "decisions.md");
    if (fs.existsSync(mdPath)) fs.appendFileSync(mdPath, "### " + d.timestamp + "\n\n**Title:** " + d.title + "\n**Context:** " + d.context + "\n**Decision:** " + d.decision + "\n**Status:** " + d.status + "\n\n---\n\n");
  } catch(e) {}
}

async function trackTask(desc, status) {
  await ensureDb();
  const t = { description: desc || "", status: status || "pending", timestamp: new Date().toISOString() };
  session.tasks.push(t);
  if (db && currProject) {
    try {
      await db.collection(COLLS.TASKS).insertOne({ project_id: currProject.project_id, task: t });
      await saveVector(currProject.project_id, "task", desc, { status });
    } catch(e) {}
  }
  try {
    const mdPath = path.join(currProject.root, AI_DIR, "tasks.md");
    if (fs.existsSync(mdPath)) fs.appendFileSync(mdPath, "- [" + (status === "completed" ? "x" : " ") + "] " + desc + " (" + new Date().toISOString().slice(0,10) + ")\n");
  } catch(e) {}
}

async function saveSession() {
  await ensureDb();
  if (!session.id) session.id = crypto.randomUUID();
  if (!currProject) return { saved: false };
  const data = { project_id: currProject.project_id, session_id: session.id, started_at: session.started_at, ended_at: new Date().toISOString(), requests: session.requests, files: session.files, decisions: session.decisions, tasks: session.tasks };
  if (db) {
    try {
      await db.collection(COLLS.SESSIONS).insertOne(data);
      await db.collection(COLLS.PROJECTS).updateOne({ project_id: currProject.project_id }, { $inc: { session_count: 1 } });
    } catch(e) { console.error("Save error:", e.message); }
  }
  // Save locally
  const sessionFile = path.join(currProject.root, AI_DIR, "session_" + session.id.slice(0,8) + ".json");
  try { fs.writeFileSync(sessionFile, JSON.stringify(data, null, 2)); } catch(e) {}
  return data;
}

// --- CLI Commands ---
async function cmdStatus() {
  if (!currProject) { console.log("No project detected."); return; }
  const p = currProject;
  console.log("");
  console.log("=== Project Status ===");
  console.log("  Name:   " + p.name);
  console.log("  ID:     " + p.project_id);
  console.log("  Root:   " + p.root);
  if (p.git_remote) console.log("  Git:    " + p.git_remote);
  if (db) {
    try {
      const proj = await db.collection(COLLS.PROJECTS).findOne({ project_id: p.project_id });
      if (proj) {
        const sCount = await db.collection(COLLS.SESSIONS).countDocuments({ project_id: p.project_id });
        const dCount = await db.collection(COLLS.DECISIONS).countDocuments({ project_id: p.project_id });
        const tCount = await db.collection(COLLS.TASKS).countDocuments({ project_id: p.project_id });
        const fCount = await db.collection(COLLS.FILES).countDocuments({ project_id: p.project_id });
        console.log("  Sessions: " + sCount);
        console.log("  Decisions: " + dCount);
        console.log("  Tasks: " + tCount);
        console.log("  Files: " + fCount);
      }
    } catch(e) {}
  }
  const aiDir = path.join(p.root, AI_DIR);
  if (fs.existsSync(aiDir)) {
    const files = fs.readdirSync(aiDir);
    console.log("  .aimemory/ files: " + files.length);
  }
  console.log("");
}

async function cmdHistory() {
  if (!db || !currProject) { console.log("No DB connected."); return; }
  try {
    const sessions = await db.collection(COLLS.SESSIONS).find({ project_id: currProject.project_id }).sort({ started_at: -1 }).limit(10).toArray();
    console.log("");
    console.log("=== Recent Sessions ===");
    if (!sessions.length) { console.log("  No sessions yet."); return; }
    for (const s of sessions) {
      const reqs = s.requests?.length || 0;
      const fs2 = s.files?.length || 0;
      const decs = s.decisions?.length || 0;
      console.log("  " + (s.started_at?.slice(0,10) || "?") + " | " + reqs + " reqs, " + fs2 + " files, " + decs + " decs | " + (s.session_id?.slice(0,8) || "?"));
    }
  } catch(e) { console.error(e.message); }
}

async function generateSummary() {
  await ensureDb();
  if (!currProject) return "# No Project Detected";
  
  const pId = currProject.project_id;
  // Get more deep context
  const lastDecisions = db ? await db.collection(COLLS.DECISIONS).find({ project_id: pId }).sort({ "decision.timestamp": -1 }).limit(5).toArray() : [];
  const pendingTasks = db ? await db.collection(COLLS.TASKS).find({ project_id: pId, "task.status": "pending" }).sort({ "task.timestamp": -1 }).limit(5).toArray() : [];
  const completedTasks = db ? await db.collection(COLLS.TASKS).find({ project_id: pId, "task.status": "completed" }).sort({ "task.timestamp": -1 }).limit(3).toArray() : [];
  const lastFiles = session.files.slice(-10);

  let out = "<!-- AI_RESUME_MARKER -->\n";
  out += "# 🚀 MISSION BRIEFING: PROJECT RESUME\n\n";
  out += `> **Project:** ${currProject.name}\n`;
  out += `> **Handoff Time:** ${new Date().toLocaleString()}\n`;
  out += `> **Status:** ACTIVE DEVELOPMENT\n\n`;
  
  out += "## 🎯 Current Objective\n";
  if (pendingTasks.length > 0) {
    out += `Working on: **${pendingTasks[0].task.description}**\n`;
  } else {
    out += "All current tasks completed. Ready for new instructions.\n";
  }

  out += "\n## 🏁 State of Play\n";
  out += "### ✅ Verified (Working)\n";
  if (completedTasks.length) {
    completedTasks.forEach(t => out += `- ${t.task.description}\n`);
  } else { out += "- (Check history for long-term stability)\n"; }

  out += "\n### 🛠️ In-Flight (Draft/Changes)\n";
  if (lastFiles.length) {
    const uniqueFiles = [...new Set(lastFiles.map(f => f.file))];
    uniqueFiles.forEach(f => out += `- \`${f}\` is currently being modified.\n`);
  }

  out += "\n## 🧠 Why we did what we did (Context)\n";
  if (lastDecisions.length) {
    lastDecisions.slice(0, 2).forEach(d => {
      out += `**Decision:** ${d.decision.title}\n`;
      out += `> ${d.decision.context} -> **${d.decision.decision}**\n\n`;
    });
  }

  out += "\n## ⚠️ Technical Debt / Risks\n";
  out += "- **Model Switch:** Context was just handed off. Verify local file states before major edits.\n";
  if (currProject.name.includes("cms")) {
    out += "- **Security:** Raw SQL in use. Always audit queries with `api-guard` skill.\n";
  }

  out += "\n## 🤖 NEXT MODEL: START HERE\n";
  out += "```bash\n";
  out += "# 1. Scan files mentioned in 'In-Flight' section.\n";
  out += "# 2. Run: aimemory status\n";
  out += "# 3. Address this task first: " + (pendingTasks[0]?.task.description || "Next logical feature") + "\n";
  out += "```\n";

  // 1. Double save: in .aimemory/ and as a beacon RESUME.md in root
  const summaryPath = path.join(currProject.root, AI_DIR, "session_summary.md");
  const beaconPath = path.join(currProject.root, "RESUME.md");
  const contextPath = path.join(currProject.root, AI_DIR, "project_context.md");
  
  fs.writeFileSync(summaryPath, out);
  fs.writeFileSync(beaconPath, out);

  // 2. Proactive Context Update (Append latest progress to project_context.md)
  if (fs.existsSync(contextPath)) {
    const contextUpdate = `\n\n## Update: ${new Date().toLocaleDateString()}\n- **Latest Progress:** ${pendingTasks[0]?.task.description || "Feature development"}\n- **Key Decision:** ${lastDecisions[0]?.decision.title || "Standard maintenance"}\n- **Status:** Handed off to new session.\n`;
    fs.appendFileSync(contextPath, contextUpdate);
  }
  
  return out;
}

async function initDatabase() {
  await ensureDb();
  if (!db) { console.log("❌ DB not connected. Check .env"); return; }

  console.log("🚀 Starting Auto-DB Setup...");

  // 1. Create collection & Insert dummy data to ensure it exists
  // We use direct string 'vectors' to avoid any object reference issues
  const colName = "vectors";
  const count = await db.collection(colName).countDocuments().catch(() => 0);
  
  if (count === 0) {
    console.log(`📦 Creating '${colName}' collection...`);
    // Insert a dummy record with a zero-vector if no API key
    const dummyVector = new Array(768).fill(0);
    await db.collection(colName).insertOne({
      project_id: "system",
      type: "system",
      content: "Initial Vector Search Setup",
      embedding: dummyVector,
      timestamp: new Date().toISOString()
    });
  }

  if (!GOOGLE_API_KEY) {
    console.log("⚠️ WARNING: GOOGLE_API_KEY not set in .env. Search will not work until added.");
  }

  // 2. Programmatically create the Vector Search Index
  try {
    console.log(`🔍 Requesting Vector Search Index 'vector_index' on collection '${colName}'...`);
    const indexName = "vector_index";
    
    // Check if index already exists
    const indexes = await db.collection(colName).listSearchIndexes().toArray().catch(() => []);
    if (indexes.some(idx => idx.name === indexName)) {
      console.log("✅ Vector Index already exists.");
    } else {
      await db.collection(colName).createSearchIndex({
        name: indexName,
        type: "vectorSearch",
        definition: {
          "fields": [
            {
              "numDimensions": 768,
              "path": "embedding",
              "similarity": "cosine",
              "type": "vector"
            },
            {
              "path": "project_id",
              "type": "filter"
            }
          ]
        }
      });
      console.log("⏳ Index creation requested! It will take 1-2 minutes to become ACTIVE on Atlas.");
    }
  } catch (e) {
    console.error("⚠️ Atlas Index Error:", e.message);
    console.log("💡 Tip: If you are on a Free Tier, you MUST create the index manually via Atlas UI -> Search -> Create Search Index -> JSON Editor.");
  }
}

async function askMemory(query) {
  const results = await searchMemory(query, 10);
  if (!results.length) return "Bhai, is baare mai kuch yaad nahi aa raha.";

  const context = results.map(r => `[${r.type}] ${typeof r.content === 'string' ? r.content : JSON.stringify(r.content)}`).join("\n");
  
  if (!GOOGLE_API_KEY) return "Bhai, Gemini key nahi hai, results ye hain:\n" + context;

  try {
    const prompt = `You are a Senior Architect. Based on these project memories, answer the user's question concisely in Hinglish.
    Question: ${query}
    Memories:
    ${context}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    const json = await response.json();
    return json.candidates[0].content.parts[0].text;
  } catch (e) {
    return "Error analyzing memory: " + e.message;
  }
}

// --- Auto-Router ---
function autoRoute(prompt) {
  const skillsList = [
    { name: "code-review-and-quality", keywords: ["review", "pr", "merge", "check code"] },
    { name: "debugging-wizard", keywords: ["bug", "fix", "error", "crash", "not working"] },
    { name: "cms-deploy", keywords: ["deploy", "production", "launch", "ship"] },
    { name: "api-guard", keywords: ["auth", "security", "sql", "injection", "protect"] },
    { name: "karpathy-guidelines", keywords: ["complex", "refactor", "new feature", "architecture"] },
    { name: "test-master", keywords: ["test", "jest", "coverage", "verify"] },
    { name: "claude-agent-browser", keywords: ["ui", "button", "screenshot", "navigate"] },
    { name: "frontend-ui-engineering", keywords: ["css", "tailwind", "design", "responsive", "component"] }
  ];

  const pLower = prompt.toLowerCase();
  let matchedSkills = [];

  for (const skill of skillsList) {
    if (skill.keywords.some(kw => pLower.includes(kw))) {
      matchedSkills.push(skill.name);
    }
  }

  // Fallback to Karpathy guidelines if no specific intent is found but it's a coding task
  if (matchedSkills.length === 0 && (pLower.includes("write") || pLower.includes("create") || pLower.includes("build") || pLower.includes("code"))) {
    matchedSkills.push("karpathy-guidelines");
  }

  if (matchedSkills.length > 0) {
    let out = `🧠 **Auto-Routing Detected Intent:**\n`;
    out += `Based on your prompt, I recommend automatically applying these skills:\n`;
    matchedSkills.forEach(s => out += `- **${s}**\n`);
    out += `\n*Applying these guidelines in the background...*`;
    return out;
  } else {
    return `🤖 **Standard Mode:** No specific advanced skill detected. Proceeding normally.`;
  }
}

async function cmdHelp() {
  console.log(`
=== AI Memory Universal v2.0 - HELP ===

🚀 CLI COMMANDS:
  node ai-memory.js init         : Initialize .aimemory in current folder
  node ai-memory.js status       : Show project stats & DB status
  node ai-memory.js setup-db     : Auto-setup Atlas Vector Index (One-click)
  node ai-memory.js summary      : Generate RESUME.md handoff briefing
  node ai-memory.js search "q"   : Semantic vector search for old memories
  node ai-memory.js track "msg"  : Manually log a request/thought
  node ai-memory.js task "msg"   : Add a new pending task

🧠 MCP TOOLS (Use inside AI chat):
  get-status     : Quick project overview
  get-summary    : Get the handoff mission briefing
  search-memory  : Find similar past events
  ask-memory     : Q&A with your project's past (RAG)
  track-decision : Log an architectural choice
  apply-skill    : Activate one of 80+ engineering skills

🌐 DEPLOYMENT:
  VPS Setup      : run 'bash deploy-vps.sh'
  Docker         : run 'docker-compose up -d'
  Port           : 3100 (Default)
  Security       : Set AI_MEMORY_API_KEY in .env

💡 TIP: Use 'node ai-memory.js summary' before switching models!
`);
}

// --- Main ---
async function main() {
  const args = process.argv.slice(2);
  const cmd = args[0] || "";
  currProject = detectProject();
  await ensureDb();
  if (db) currProject = await ensureProject(currProject);
  switch(cmd) {
    case "help": await cmdHelp(); break;
    case "init": initFolder(currProject); console.log("  .aimemory/ initialized in " + currProject.root); break;
    case "setup-db": await initDatabase(); break;
    case "status": initFolder(currProject); await cmdStatus(); break;
    case "history": await cmdHistory(); break;
    case "summary": const s = await generateSummary(); console.log(s); break;
    case "search": const sRes = await searchMemory(args.slice(1).join(" ")); console.log(sRes.map(r => `[${r.type}] ${typeof r.content === 'string' ? r.content : JSON.stringify(r.content)}`).join("\n")); break;
    case "ask": const aRes = await askMemory(args.slice(1).join(" ")); console.log("\n🤖 " + aRes + "\n"); break;
    case "auto": const routeRes = autoRoute(args.slice(1).join(" ")); console.log("\n" + routeRes + "\n"); break;
    case "track": initFolder(currProject); await trackRequest(args.slice(1).join(" ") || ""); console.log("  Request tracked."); break;
    case "file": initFolder(currProject); await trackFileChange(args[1] || "", args[2] || "modified"); console.log("  File tracked."); break;
    case "decision": initFolder(currProject); await trackDecision(args[1] || "", args[2] || "", args[3] || "", args[4] || "accepted"); console.log("  Decision tracked."); break;
    case "task": initFolder(currProject); await trackTask(args[1] || "", args[2] || "pending"); console.log("  Task tracked."); break;
    case "shutdown":
      if (session.requests.length > 0 || session.files.length > 0) {
        await saveSession();
        console.log("  Session saved.");
      }
      closeDb();
      break;
    default:
      initFolder(currProject);
      await cmdStatus();
      break;
  }
  closeDb();
}

if (require.main === module) {
  main().catch(e => { console.error("Fatal:", e.message); process.exit(1); });
}

module.exports = { detectProject, ensureDb, trackRequest, trackFileChange, trackDecision, trackTask, saveSession, shutdown: closeDb, initFolder, get db() { return db; }, get mongoClient() { return mongoClient; }, generateSummary, searchMemory, askMemory, autoRoute };