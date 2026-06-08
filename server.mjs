import { createServer } from "node:http";
import { extname, join, resolve } from "node:path";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { buildStatus } from "./src/selectionStore.mjs";
import { createStore } from "./src/storage.mjs";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = join(__dirname, "public");
const store = createStore();

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml"
};

function json(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(data));
}

async function parseBody(req) {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 20_000) throw new Error("Body too large");
  }
  return body ? JSON.parse(body) : {};
}

async function loadState() {
  const texts = await store.texts();
  const entries = await store.entries();
  return { texts, entries };
}

async function handleApi(req, res) {
  if (req.method === "GET" && req.url === "/api/status") {
    const { texts, entries } = await loadState();
    return json(res, 200, {
      title: "Topographie des Verbrechens - Berlin-Thriller",
      assignment: "Webspecial mit einem in Berlin vor Ort gedrehten Video",
      texts: buildStatus(texts, entries)
    });
  }

  if (req.method === "GET" && req.url === "/api/export") {
    const { texts, entries } = await loadState();
    return json(res, 200, {
      exportedAt: new Date().toISOString(),
      entries,
      texts: buildStatus(texts, entries)
    });
  }

  if (req.method === "POST" && req.url === "/api/selections") {
    const payload = await parseBody(req);
    const result = await store.createSelection(payload);

    if (!result.ok) return json(res, result.status, { message: result.message });
    return json(res, 201, { entry: result.entry });
  }

  return false;
}

async function serveStatic(req, res) {
  const url = new URL(req.url, "http://localhost");
  const requestedPath = url.pathname === "/" ? "/index.html" : url.pathname;
  const filePath = resolve(PUBLIC_DIR, `.${requestedPath}`);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  try {
    const content = await readFile(filePath);
    res.writeHead(200, {
      "content-type": contentTypes[extname(filePath)] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(content);
  } catch {
    res.writeHead(404);
    res.end("Not found");
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.url.startsWith("/api/")) {
      const handled = await handleApi(req, res);
      if (handled === false) json(res, 404, { message: "Nicht gefunden." });
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    json(res, 500, { message: "Serverfehler.", detail: error.message });
  }
});

server.listen(PORT, () => {
  console.log(`Berlin-Thriller-Auswahl läuft auf http://localhost:${PORT}`);
});
