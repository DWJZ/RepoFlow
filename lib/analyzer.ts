/**
 * EPIC 2: Codebase Understanding
 * US-03: Detect project structure, US-04: Identify basic data flow
 */

import * as fs from "fs";
import * as path from "path";

const IGNORE_DIRS = [
  "node_modules",
  ".git",
  "dist",
  "build",
  "out",
  ".next",
  "vendor",
  "__pycache__",
  ".venv",
  "venv",
  ".cache",
  "coverage",
  ".turbo",
];

const ENTRY_PATTERNS = {
  js: ["index.js", "main.js", "app.js", "server.js", "index.mjs", "index.cjs"],
  ts: ["index.ts", "main.ts", "app.ts", "server.ts", "index.tsx", "main.tsx", "app.tsx"],
  py: ["main.py", "app.py", "__main__.py", "manage.py", "wsgi.py", "asgi.py"],
  go: ["main.go", "cmd/**/main.go"],
  java: ["**/Application.java", "**/Main.java", "**/pom.xml", "**/build.gradle"],
};

const ROUTE_INDICATORS = [
  "router", "route", "express", "fastify", "koa", "hapi",
  "flask", "django", "fastapi", "app.get", "app.post", "app.use",
  "Router", "createRouter", "defineRoutes",
];

const DB_INDICATORS = [
  "prisma", "mongoose", "sequelize", "typeorm", "knex", "drizzle",
  "sqlalchemy", "django.db", "psycopg2", "mysql", "pg", "sqlite3",
  "mongodb", "redis", "createConnection", "DataSource",
];

const SERVICE_INDICATORS = [
  "service", "handler", "controller", "repository", "usecase",
  "Service", "Handler", "Controller", "Repository",
];

export interface ProjectNode {
  id: string;
  name: string;
  type: "entry" | "route" | "service" | "data_store" | "module";
  files: string[];
  inferred?: boolean;
}

export interface DataFlow {
  from: string;
  to: string;
  label?: string;
  inferred?: boolean;
}

export interface AnalysisResult {
  nodes: ProjectNode[];
  flows: DataFlow[];
  structure: Record<string, unknown>;
}

function shouldIgnore(relPath: string): boolean {
  const parts = relPath.split(path.sep);
  return parts.some((p) => IGNORE_DIRS.includes(p) || p.startsWith("."));
}

function getAllFiles(dir: string, base = ""): string[] {
  const results: string[] = [];
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const relPath = path.join(base, entry.name);
      if (shouldIgnore(relPath)) continue;
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results.push(...getAllFiles(fullPath, relPath));
      } else {
        results.push(relPath);
      }
    }
  } catch {
    // ignore
  }
  return results;
}

function readFileSafe(filePath: string): string {
  try {
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return "";
  }
}

function detectByContent(content: string, indicators: string[]): boolean {
  const lower = content.toLowerCase();
  return indicators.some((ind) => lower.includes(ind.toLowerCase()));
}

function toNodeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, "_").replace(/_+/g, "_").replace(/^_|_$/g, "") || "node";
}

export function analyzeCodebase(repoPath: string): AnalysisResult {
  const nodes: ProjectNode[] = [];
  const flows: DataFlow[] = [];
  const nodeIds = new Set<string>();

  const files = getAllFiles(repoPath);
  const codeFiles = files.filter(
    (f) =>
      /\.(js|ts|jsx|tsx|py|go|java|rb|php)$/i.test(f) && !f.includes(".test.") && !f.includes(".spec.")
  );

  const entryFiles: string[] = [];
  const routeFiles: string[] = [];
  const serviceFiles: string[] = [];
  const dbFiles: string[] = [];
  const moduleMap = new Map<string, string[]>();

  for (const file of codeFiles) {
    const fullPath = path.join(repoPath, file);
    const content = readFileSafe(fullPath);
    const ext = path.extname(file).toLowerCase();
    const baseName = path.basename(file);

    // Entry points
    if (
      (ext === ".js" && ENTRY_PATTERNS.js.includes(baseName)) ||
      (([".ts", ".tsx"].includes(ext) && ENTRY_PATTERNS.ts.includes(baseName))) ||
      (ext === ".py" && ENTRY_PATTERNS.py.includes(baseName))
    ) {
      entryFiles.push(file);
    }

    // Route handlers
    if (detectByContent(content, ROUTE_INDICATORS)) {
      routeFiles.push(file);
    }

    // Data stores
    if (detectByContent(content, DB_INDICATORS)) {
      dbFiles.push(file);
    }

    // Services
    if (detectByContent(content, SERVICE_INDICATORS)) {
      serviceFiles.push(file);
    }

    // Module grouping (folder level)
    const dir = path.dirname(file);
    if (dir && dir !== ".") {
      const topDir = dir.split(path.sep)[0];
      if (!moduleMap.has(topDir)) moduleMap.set(topDir, []);
      moduleMap.get(topDir)!.push(file);
    }
  }

  // Dedupe and create nodes
  const addNode = (name: string, type: ProjectNode["type"], files: string[], inferred = false) => {
    const id = toNodeId(name);
    if (nodeIds.has(id)) return;
    nodeIds.add(id);
    nodes.push({ id, name, type, files: [...new Set(files)], inferred });
  };

  // Entry points
  const entryNames = entryFiles.length
    ? entryFiles.map((f) => path.basename(f, path.extname(f)))
    : ["App"];
  for (let i = 0; i < entryFiles.length; i++) {
    addNode(entryNames[i] || `Entry${i}`, "entry", [entryFiles[i]], false);
  }
  if (entryFiles.length === 0 && codeFiles.length > 0) {
    const first = codeFiles[0];
    addNode(path.basename(first, path.extname(first)), "entry", [first], true);
  }

  // Routes
  if (routeFiles.length > 0) {
    addNode("Routes", "route", [...new Set(routeFiles)], false);
  }

  // Services (group by folder or single node)
  const serviceSet = new Set(serviceFiles);
  const serviceDirs = new Map<string, string[]>();
  for (const f of serviceSet) {
    const dir = path.dirname(f);
    const topDir = dir.split(path.sep)[0];
    if (!serviceDirs.has(topDir)) serviceDirs.set(topDir, []);
    serviceDirs.get(topDir)!.push(f);
  }
  if (serviceDirs.size > 0) {
    for (const [dir, files] of serviceDirs) {
      addNode(`${dir} (services)`, "service", files, false);
    }
  } else if (routeFiles.length === 0 && codeFiles.length > 1) {
    const otherFiles = codeFiles.filter((f) => !entryFiles.includes(f)).slice(0, 10);
    addNode("Services", "service", otherFiles, true);
  }

  // Data stores
  if (dbFiles.length > 0) {
    addNode("Database", "data_store", [...new Set(dbFiles)], false);
  } else {
    addNode("Data Store", "data_store", [], true);
  }

  // Infer flows
  const entryNode = nodes.find((n) => n.type === "entry");
  const routeNode = nodes.find((n) => n.type === "route");
  const serviceNodes = nodes.filter((n) => n.type === "service");
  const dbNode = nodes.find((n) => n.type === "data_store");

  if (entryNode && routeNode) {
    flows.push({ from: entryNode.id, to: routeNode.id, label: "HTTP", inferred: false });
  }
  if (routeNode && serviceNodes.length > 0) {
    for (const s of serviceNodes) {
      flows.push({ from: routeNode.id, to: s.id, label: "calls", inferred: false });
    }
  } else if (entryNode && serviceNodes.length > 0) {
    for (const s of serviceNodes) {
      flows.push({ from: entryNode.id, to: s.id, label: "calls", inferred: true });
    }
  }
  if (serviceNodes.length > 0 && dbNode) {
    for (const s of serviceNodes) {
      flows.push({ from: s.id, to: dbNode.id, label: "persists", inferred: dbNode.inferred });
    }
  } else if (routeNode && dbNode) {
    flows.push({ from: routeNode.id, to: dbNode.id, label: "persists", inferred: true });
  } else if (entryNode && dbNode) {
    flows.push({ from: entryNode.id, to: dbNode.id, label: "persists", inferred: true });
  }

  return {
    nodes,
    flows,
    structure: {
      entryPoints: entryFiles,
      routes: routeFiles,
      services: serviceFiles,
      dataStores: dbFiles,
      totalFiles: codeFiles.length,
    },
  };
}
