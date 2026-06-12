#!/usr/bin/env node

const path=require("path"); require("dotenv").config({path:path.join(__dirname,".env")});
const {Server}=require("@modelcontextprotocol/sdk/server/index.js");
const {StdioServerTransport}=require("@modelcontextprotocol/sdk/server/stdio.js");
const {ListToolsRequestSchema,CallToolRequestSchema,ListResourcesRequestSchema,ReadResourceRequestSchema,ListPromptsRequestSchema,GetPromptRequestSchema}=require("@modelcontextprotocol/sdk/types.js");
const fs=require("fs");

const _args=process.argv.slice(2);
if(_args.includes("--help")||_args.includes("-h")){console.log("AI Memory MCP Server v4.0\nUsage: node mcp-server.js [--http PORT] [--version]");process.exit(0)}
if(_args.includes("--version")||_args.includes("-v")){console.log("ai-memory-mcp-server v4.0.0");process.exit(0)}
const useHttp=_args.includes("--http")||_args.includes("--sse");const PORT=parseInt(_args[Math.max(_args.indexOf("--http"),_args.indexOf("--sse"))+1],10)||3100;
const API_KEY=process.env.AI_MEMORY_API_KEY;

let memory=null,currentProject=null;
try{memory=require(path.join(__dirname,"ai-memory.js"))}catch(e){process.stderr.write("[MCP] "+e.message+"\n")}

// --- Auth Middleware (for HTTP) ---
function validateAuth(req,res,next){
  if(!useHttp)return next();
  if(!API_KEY)return next();
  const key=req.headers["x-api-key"]||new URL(req.url,"http://localhost").searchParams.get("apiKey");
  if(key!==API_KEY){
    process.stderr.write("[MCP] Unauthorized access attempt\n");
    return res.status(401).send("Unauthorized");
  }
  next();
}
function getDb(){if(memory){if(memory.db)return memory.db;if(memory.mongoClient)return memory.mongoClient.db("ai_memory")}return null}
async function shutdown(s){process.stderr.write("[MCP] "+s+"\n");try{if(memory&&typeof memory.shutdown==="function")await memory.shutdown()}catch(_){}process.exit(0)}
process.on("SIGINT",()=>shutdown("SIGINT"));process.on("SIGTERM",()=>shutdown("SIGTERM"));
async function init(){if(!memory)return;try{currentProject=await memory.detectProject();await memory.ensureDb();process.stderr.write("[MCP] "+(currentProject?.project_id||"?")+"\n")}catch(e){process.stderr.write("[MCP] "+e.message+"\n")}}

const _SKILLS_DIR=path.join(__dirname,"skills");
const CATEGORIES={"define":{"l":"Define","i":"🎯","d":"Clarify requirements"},"plan":{"l":"Plan","i":"📋","d":"Plan architecture"},"build":{"l":"Build","i":"🔨","d":"Implement code"},"verify":{"l":"Verify","i":"🔍","d":"Review and harden"},"ship":{"l":"Ship","i":"🚀","d":"Deploy and monitor"},"maintain":{"l":"Maintain","i":"♻️","d":"Documentation"},"meta":{"l":"Meta","i":"⚙️","d":"About skills"}};
const SKILLS=[
  {"name":"api-and-interface-design","dir":"api-and-interface-design","desc":"Guides stable API and interface design. Use when designing APIs, module boundaries, or any public interface.","cat":"plan","source":"addyosmani"},
  {"name":"api-guard","dir":"api-guard","desc":"Audit and harden API endpoints for security","cat":"verify","source":"custom"},
  {"name":"browser-testing-with-devtools","dir":"browser-testing-with-devtools","desc":"Tests in real browsers via Chrome DevTools MCP.","cat":"verify","source":"addyosmani"},
  {"name":"ci-cd-and-automation","dir":"ci-cd-and-automation","desc":"Automates CI/CD pipeline setup.","cat":"ship","source":"addyosmani"},
  {"name":"cms-deploy","dir":"cms-deploy","desc":"Deploy CMS projects (frontend + backend + admin) to production safely","cat":"ship","source":"custom"},
  {"name":"code-review-and-quality","dir":"code-review-and-quality","desc":"Conducts multi-axis code review.","cat":"verify","source":"addyosmani"},
  {"name":"code-simplification","dir":"code-simplification","desc":"Simplifies code for clarity.","cat":"maintain","source":"addyosmani"},
  {"name":"claude-agent-browser","dir":"claude-best-practices/agent-browser","desc":"Browser automation and UI interaction workflows.","cat":"build","source":"external"},
  {"name":"claude-memory-pro","dir":"claude-best-practices/memory","desc":"Advanced context and memory loading strategies.","cat":"maintain","source":"external"},
  {"name":"claude-subagent-orchestration","dir":"claude-best-practices/subagents","desc":"Specialized subagent steering and resource management.","cat":"plan","source":"external"},
  {"name":"karpathy-guidelines","dir":"karpathy-guidelines","desc":"Behavioral guidelines to reduce common AI coding mistakes. Enforces thinking before coding, simplicity, surgical changes, and goal-driven execution.","cat":"define","source":"external"}
];
function readSkill(d,f){try{const p=path.join(_SKILLS_DIR,d,f);return fs.existsSync(p)?fs.readFileSync(p,"utf8"):null}catch(e){return null}}
function findSkill(n){return SKILLS.find(s=>s.name===n||s.dir===n)||null}

const server=new Server({name:"ai-memory",version:"4.0.0"},{capabilities:{tools:{},resources:{},prompts:{}}});
server.onerror=err=>process.stderr.write("[MCP] "+(err?.message||err)+"\n");

const TOOLS=[
  {name:"track-request",description:"Log user request",inputSchema:{type:"object",properties:{prompt:{type:"string",description:"The request text"}},required:["prompt"]}},
  {name:"track-decision",description:"Record architectural decision",inputSchema:{type:"object",properties:{title:{type:"string",description:"Decision title"},context:{type:"string",description:"Why needed"},decision:{type:"string",description:"What was decided"},status:{type:"string",description:"accepted/rejected"}},required:["title","context","decision","status"]}},
  {name:"track-task",description:"Track a task",inputSchema:{type:"object",properties:{description:{type:"string",description:"Task description"},status:{type:"string",description:"pending/completed"}},required:["description","status"]}},
  {name:"track-file-change",description:"Log file change",inputSchema:{type:"object",properties:{file_path:{type:"string",description:"File path"},change_type:{type:"string",description:"created/modified/deleted"}},required:["file_path","change_type"]}},
  {name:"save-session",description:"Save current session",inputSchema:{type:"object",properties:{}}},
  {name:"get-status",description:"Project status with skills",inputSchema:{type:"object",properties:{}}},
  {name:"get-decisions",description:"Recent decisions",inputSchema:{type:"object",properties:{}}},
  {name:"get-tasks",description:"Recent tasks",inputSchema:{type:"object",properties:{}}},
  {name:"get-history",description:"Session history",inputSchema:{type:"object",properties:{limit:{type:"number",description:"Sessions to return"}}}},
  {name:"get-summary",description:"Get high-density handoff summary",inputSchema:{type:"object",properties:{}}},
  {name:"search-memory",description:"Semantic search in project memory",inputSchema:{type:"object",properties:{query:{type:"string",description:"Natural language search query"},limit:{type:"number",description:"Number of results"}}}},
  {name:"ask-memory",description:"Ask a question to your project's memory (RAG)",inputSchema:{type:"object",properties:{query:{type:"string",description:"Natural language question"}},required:["query"]}},
  {name:"init-project",description:"Init .aimemory folder",inputSchema:{type:"object",properties:{}}},
  {name:"list-skills",description:"All skills organized by category",inputSchema:{type:"object",properties:{}}},
  {name:"list-skills-by-cat",description:"Skills in category",inputSchema:{type:"object",properties:{category:{type:"string",description:"Category name"}},required:["category"]}},
  {name:"get-skill",description:"Full skill content",inputSchema:{type:"object",properties:{skill:{type:"string",description:"Skill name"}},required:["skill"]}},
  {name:"apply-skill",description:"Apply skill to task",inputSchema:{type:"object",properties:{skill:{type:"string",description:"Skill name"},task:{type:"string",description:"Task description"}},required:["skill","task"]}},
  {name:"get-skill-tree",description:"Skill dependency tree",inputSchema:{type:"object",properties:{}}},
  {name:"list-categories",description:"Skill categories with counts",inputSchema:{type:"object",properties:{}}},
  {name:"list-commands",description:"Slash commands",inputSchema:{type:"object",properties:{}}},
  {name:"get-skill-stats",description:"Skill statistics",inputSchema:{type:"object",properties:{}}}
];
server.setRequestHandler(ListToolsRequestSchema,async()=>({tools:TOOLS}));

server.setRequestHandler(CallToolRequestSchema,async(request)=>{
  const{name,arguments:args}=request.params;
  if(!memory&&name!=="get-status"&&!name.startsWith("list-")&&name!=="get-skill"&&name!=="get-skill-tree"&&name!=="list-categories"&&name!=="get-skill-stats"&&name!=="list-commands")
    return{content:[{type:"text",text:"Error: ai-memory not loaded"}],isError:false};
  try{switch(name){
    case"track-request":if(!args?.prompt)return{content:[{type:"text",text:"prompt required"}],isError:true};await memory.trackRequest(args.prompt);return{content:[{type:"text",text:""+args.prompt.substring(0,200)}]};
    case"track-decision":if(!args?.title||!args?.context||!args?.decision||!args?.status)return{content:[{type:"text",text:"all fields required"}],isError:true};await memory.trackDecision(args.title,args.context,args.decision,args.status);return{content:[{type:"text",text:"OK: "+args.title}]};
    case"track-task":if(!args?.description||!args?.status)return{content:[{type:"text",text:"desc+status required"}],isError:true};await memory.trackTask(args.description,args.status);return{content:[{type:"text",text:"OK: "+args.description.substring(0,150)}]};
    case"track-file-change":if(!args?.file_path||!args?.change_type)return{content:[{type:"text",text:"path+type required"}],isError:true};await memory.trackFileChange(args.file_path,args.change_type);return{content:[{type:"text",text:"OK: "+args.file_path}]};
    case"save-session":await memory.saveSession();return{content:[{type:"text",text:"Session saved!"}]};
    case"get-status":const p1=currentProject||(memory?await memory.detectProject():null);return{content:[{type:"text",text:"# Status\nProject: "+(p1?.project_name||p1?.project_id||"?")+"\nDB: "+(getDb()?"Connected":"Offline")+"\nSkills: "+SKILLS.length+"\nCategories: "+Object.keys(CATEGORIES).length+"\nTools: "+TOOLS.length}]};
    case"get-decisions":const d1=getDb();if(!d1)return{content:[{type:"text",text:"DB offline"}],isError:true};const p2=(currentProject||(await memory.detectProject()))?.project_id;const docs1=await d1.collection("decisions").find({project_id:p2}).sort({timestamp:-1}).limit(20).toArray();return{content:[{type:"text",text:"# Decisions\n"+(docs1.length?docs1.map((d,i)=>(i+1)+". "+d.title+" ["+d.status+"]").join("\n"):"None")}]};
    case"get-tasks":const d2=getDb();if(!d2)return{content:[{type:"text",text:"DB offline"}],isError:true};const p3=(currentProject||(await memory.detectProject()))?.project_id;const docs2=await d2.collection("tasks").find({project_id:p3}).sort({timestamp:-1}).limit(20).toArray();return{content:[{type:"text",text:"# Tasks\n"+(docs2.length?docs2.map((d,i)=>(i+1)+". "+(d.description||"").substring(0,150)).join("\n"):"None")}]};
    case"get-history":const d3=getDb();if(!d3)return{content:[{type:"text",text:"DB offline"}],isError:true};const p4=(currentProject||(await memory.detectProject()))?.project_id;const limit=Math.min(args?.limit||5,20);const docs3=await d3.collection("sessions").find({project_id:p4}).sort({created_at:-1}).limit(limit).toArray();return{content:[{type:"text",text:"# Sessions\n"+(docs3.length?docs3.map((d,i)=>(i+1)+". "+(d.created_at?new Date(d.created_at).toLocaleDateString():"")+" "+(d.requests?.length||0)+"r").join("\n"):"None")}]};
    case"get-summary":if(!memory)return{content:[{type:"text",text:"Memory not loaded"}],isError:true};const sSum=await memory.generateSummary();return{content:[{type:"text",text:sSum}]};
    case"search-memory":if(!memory)return{content:[{type:"text",text:"Memory not loaded"}],isError:true};const sRes=await memory.searchMemory(args.query,args.limit||5);return{content:[{type:"text",text:"# Search Results\n"+(sRes.length?sRes.map((r,i)=>(i+1)+". ["+r.type+"] "+(typeof r.content==="string"?r.content:JSON.stringify(r.content))).join("\n"):"No results found")}]};
    case"ask-memory":if(!memory)return{content:[{type:"text",text:"Memory not loaded"}],isError:true};const aSum=await memory.askMemory(args.query);return{content:[{type:"text",text:aSum}]};
    case"auto-route":if(!memory)return{content:[{type:"text",text:"Memory not loaded"}],isError:true};const routeRes=memory.autoRoute(args.prompt);return{content:[{type:"text",text:routeRes}]};
    case"init-project":const p5=currentProject||(await memory.detectProject());if(!p5)return{content:[{type:"text",text:"No project"}],isError:true};if(fs.existsSync(path.join(p5.root||process.cwd(),".aimemory")))return{content:[{type:"text",text:"Already init"}]};await memory.initFolder();return{content:[{type:"text",text:"Init: "+(p5.project_name||p5.project_id)}]};
    case"list-skills":let out="# Skills ("+SKILLS.length+")\n\n";Object.keys(CATEGORIES).forEach(c=>{const ci=CATEGORIES[c];const sks=SKILLS.filter(s=>s.cat===c);if(sks.length){out+=ci.i+" **"+ci.l+"**\n";sks.forEach(s=>{const b=s.source==="custom"?" [CMS]":s.source==="claude"?" [Claude]":"";out+="  - "+s.name+b+": "+s.desc+"\n"})}});return{content:[{type:"text",text:out+"\nUse list-skills-by-cat <category> for filtered view."}]};
    case"list-skills-by-cat":if(!args?.category)return{content:[{type:"text",text:"Categories: "+Object.keys(CATEGORIES).join(", ")}],isError:true};const ci=CATEGORIES[args.category];if(!ci)return{content:[{type:"text",text:"Invalid category"}],isError:true};const s1=SKILLS.filter(s=>s.cat===args.category);return{content:[{type:"text",text:"# "+ci.i+" "+ci.l+" ("+s1.length+")\n\n"+s1.map(s=>{const b=s.source==="custom"?" [CMS]":s.source==="claude"?" [Claude]":"";return "- **"+s.name+b+"**: "+s.desc}).join("\n")}]};
    case"get-skill":if(!args?.skill)return{content:[{type:"text",text:"skill name required"}],isError:true};const s2=findSkill(args.skill);if(!s2)return{content:[{type:"text",text:"Not found: "+args.skill}],isError:true};const c1=readSkill(s2.dir,"SKILL.md")||"*empty*";return{content:[{type:"text",text:"# "+s2.name+"\n\n"+c1.substring(0,5000)+(c1.length>5000?"\n...(truncated)":"")}]};
    case"apply-skill":if(!args?.skill||!args?.task)return{content:[{type:"text",text:"skill+task required"}],isError:true};const s3=findSkill(args.skill);if(!s3)return{content:[{type:"text",text:"Not found: "+args.skill}],isError:true};const c2=readSkill(s3.dir,"SKILL.md")||"";return{content:[{type:"text",text:"# Applying: "+s3.name+"\n\n**Task:** "+args.task+"\n\n"+c2.substring(0,4000)}]};
    case"get-skill-tree":const tree=["# 🧠 Skill Tree ("+SKILLS.length+" skills)",""];Object.keys(CATEGORIES).forEach(c=>{const ci=CATEGORIES[c];const sks=SKILLS.filter(s=>s.cat===c);if(sks.length){tree.push("## "+ci.i+" "+ci.l);tree.push("");sks.forEach(s=>{const b=s.source==="custom"?" [CMS]":s.source==="claude"?" [Claude]":"";tree.push("- **"+s.name+b+"**: "+s.desc)});tree.push("")}});tree.push("**Flow:** Define→Plan→Build→Verify→Ship→Maintain");return{content:[{type:"text",text:tree.join("\n")}]};
    case"list-categories":const cats=Object.keys(CATEGORIES).map(c=>{const ci=CATEGORIES[c];const n=SKILLS.filter(s=>s.cat===c).length;const nc=SKILLS.filter(s=>s.cat===c&&s.source==="custom").length;const nd=SKILLS.filter(s=>s.cat===c&&s.source==="claude").length;return ci.i+" **"+ci.l+"**: "+n+" skills"+(nd?" ("+nd+" Claude)":"")+(nc?" ("+nc+" CMS)":"")}).join("\n");return{content:[{type:"text",text:"# Categories\n\n"+cats+"\n\nUse list-skills-by-cat to explore."}]};
    case"list-commands":return{content:[{type:"text",text:"# Commands\n\n/spec - Spec-Driven\n/plan - Planning\n/build - Build\n/test - TDD\n/review - Review\n/ship - Ship\n/webperf - Performance\n/code-simplify - Simplify"}]};
    case"get-skill-stats":const stats=Object.keys(CATEGORIES).map(c=>{const ci=CATEGORIES[c];const n=SKILLS.filter(s=>s.cat===c).length;const nc=SKILLS.filter(s=>s.cat===c&&s.source==="custom").length;const nd=SKILLS.filter(s=>s.cat===c&&s.source==="claude").length;return ci.i+" "+ci.l+": "+n+(nd?" ("+nd+" Claude)":"")+(nc?" ("+nc+" CMS)":"")}).join("\n");return{content:[{type:"text",text:"# Stats\n\nTotal: "+SKILLS.length+" skills\n\n"+stats}]};
    default:return{content:[{type:"text",text:"Unknown tool: "+name}],isError:true}
  }}catch(e){return{content:[{type:"text",text:"Error: "+(e?.message||e)}],isError:true}}
});

const RESOURCES=[
  {uri:"memory://project/status",name:"Status",mimeType:"text/markdown",description:"Project status"},
  {uri:"memory://project/context",name:"Context",mimeType:"text/markdown",description:"Project context"},
  {uri:"memory://decisions",name:"Decisions",mimeType:"text/markdown",description:"Decisions"},
  {uri:"memory://tasks",name:"Tasks",mimeType:"text/markdown",description:"Tasks"},
  {uri:"memory://changelog",name:"Changelog",mimeType:"text/markdown",description:"Changes"},
  {uri:"skills://list",name:"Skills List",mimeType:"text/markdown",description:"All skills"},
  {uri:"skills://tree",name:"Skill Tree",mimeType:"text/markdown",description:"Skill tree"},
  {uri:"skills://categories",name:"Categories",mimeType:"text/markdown",description:"Categories"},
  {uri:"skills://stats",name:"Stats",mimeType:"text/markdown",description:"Statistics"}
];
server.setRequestHandler(ListResourcesRequestSchema,async()=>({resources:RESOURCES}));
server.setRequestHandler(ReadResourceRequestSchema,async(request)=>{const uri=request.params.uri;try{const proj=currentProject||(memory?await memory.detectProject():null);const root=proj?.root||process.cwd();const rm=(f)=>{const p2=path.join(root,".aimemory",f);return fs.existsSync(p2)?(fs.readFileSync(p2,"utf8")||"(empty)"):"*No "+f+"*"};switch(uri){case"memory://project/status":return{contents:[{uri,mimeType:"text/markdown",text:"# Status\nProject: "+(proj?.project_name||proj?.project_id||"?")+"\nDB: "+(getDb()?"Connected":"Offline")+"\nSkills: "+SKILLS.length}]};case"memory://project/context":return{contents:[{uri,mimeType:"text/markdown",text:rm("project_context.md")}]};case"memory://decisions":return{contents:[{uri,mimeType:"text/markdown",text:rm("decisions.md")}]};case"memory://tasks":return{contents:[{uri,mimeType:"text/markdown",text:rm("tasks.md")}]};case"memory://changelog":return{contents:[{uri,mimeType:"text/markdown",text:rm("changelog.md")}]};case"skills://list":let s="# Skills ("+SKILLS.length+")\n\n";Object.keys(CATEGORIES).forEach(c=>{const ci=CATEGORIES[c];const n=SKILLS.filter(s=>s.cat===c).length;if(n)s+=ci.i+" "+ci.l+": "+n+"\n"});return{contents:[{uri,mimeType:"text/markdown",text:s}]};case"skills://tree":const t2=["# 🧠 Skill Tree",""];Object.keys(CATEGORIES).forEach(c=>{const ci=CATEGORIES[c];const sks=SKILLS.filter(s=>s.cat===c);if(!sks.length)return;t2.push("## "+ci.i+" "+ci.l);sks.forEach(s=>{const b=s.source==="custom"?" [CMS]":s.source==="claude"?" [Claude]":"";t2.push("- **"+s.name+b+"**: "+s.desc)});t2.push("")});t2.push("**Flow:** Define→Plan→Build→Verify→Ship→Maintain");return{contents:[{uri,mimeType:"text/markdown",text:t2.join("\n")}]};case"skills://categories":const c3=Object.keys(CATEGORIES).map(c=>{const ci=CATEGORIES[c];const n=SKILLS.filter(s=>s.cat===c).length;return ci.i+" **"+ci.l+"**: "+n+" skills"}).join("\n");return{contents:[{uri,mimeType:"text/markdown",text:"# Categories\n\n"+c3}]};case"skills://stats":const stats=Object.keys(CATEGORIES).map(c=>{const ci=CATEGORIES[c];const n=SKILLS.filter(s=>s.cat===c).length;return ci.i+" "+ci.l+": "+n}).join("\n");return{contents:[{uri,mimeType:"text/markdown",text:"# Stats\n\nTotal: "+SKILLS.length+" skills\n\n"+stats}]};default:return{contents:[{uri,mimeType:"text/plain",text:"Not found"}]}}}catch(e){return{contents:[{uri,mimeType:"text/plain",text:"Error: "+e.message}]}}});

server.setRequestHandler(ListPromptsRequestSchema,async()=>({prompts:[{name:"memory-check",description:"Check project memory"},{name:"save-session",description:"Save session"},{name:"explore-skills",description:"Explore skills by category"}]}));
server.setRequestHandler(GetPromptRequestSchema,async(request)=>{switch(request.params.name){case"memory-check":return{messages:[{role:"user",content:{type:"text",text:"Check memory: get-status, list-skills"}}]};case"save-session":return{messages:[{role:"user",content:{type:"text",text:"Track decisions/tasks then save-session"}}]};case"explore-skills":return{messages:[{role:"user",content:{type:"text",text:"Explore: list-categories, list-skills-by-cat, get-skill-tree"}}]};default:throw new Error("Unknown prompt")}});

async function main(){try{await init();if(useHttp){const{HttpServerTransport}=require("@modelcontextprotocol/sdk/server/http.js");await server.connect(new HttpServerTransport({port:PORT}));process.stderr.write("[MCP] HTTP on :"+PORT+"\n")}else{await server.connect(new StdioServerTransport())}}catch(e){process.stderr.write("[MCP] Fatal: "+(e?.message||e)+"\n");process.exit(1)}}main();