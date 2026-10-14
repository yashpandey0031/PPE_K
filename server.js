const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 4173);
const dataPath = path.join(root, "data", "mock-api.json");

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
};

function readData() {
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body, null, 2));
}

function sendFile(response, filePath) {
  fs.readFile(filePath, (error, content) => {
    if (error) {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      response.end("Not found");
      return;
    }
    response.writeHead(200, { "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream" });
    response.end(content);
  });
}

function handleApi(request, response) {
  const data = readData();

  if (request.method === "POST" && request.url === "/api/login") {
    sendJson(response, 200, {
      token: "demo-token",
      user: { name: "Site Supervisor", role: "Safety Admin" },
    });
    return true;
  }

  const routes = {
    "/api/summary": data.summary,
    "/api/violations": data.violations,
    "/api/zones": data.zones,
    "/api/violation-mix": data.violationMix,
    "/api/dashboard": data,
  };

  if (request.method === "GET" && routes[request.url]) {
    sendJson(response, 200, routes[request.url]);
    return true;
  }

  if (request.url.startsWith("/api/")) {
    sendJson(response, 404, { error: "Unknown API route" });
    return true;
  }

  return false;
}

const server = http.createServer((request, response) => {
  if (handleApi(request, response)) return;

  const requestPath = request.url === "/" ? "/index.html" : decodeURIComponent(request.url.split("?")[0]);
  const filePath = path.normalize(path.join(root, requestPath));

  if (!filePath.startsWith(root)) {
    response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Forbidden");
    return;
  }

  sendFile(response, filePath);
});

server.listen(port, () => {
  console.log(`Anzen demo running at http://localhost:${port}`);
});
