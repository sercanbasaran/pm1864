import { createServer } from "node:http";
import { handler, getApp } from "./app.js";
const port = Number(process.env.PORT || 8787);
const server = createServer(async (req, res) => {
  try {
    const host = req.headers.host;
    if (!host) {
      res.writeHead(400);
      res.end();
      return;
    }
    const chunks = [];
    let bytes = 0;
    for await (const chunk of req) {
      bytes += chunk.length;
      if (bytes > 2900000) {
        res.writeHead(413, { "content-type": "application/json" });
        res.end(
          JSON.stringify({ error: { message: "İstek boyutu sınırı aşıldı." } }),
        );
        return;
      }
      chunks.push(chunk);
    }
    const request = new Request(`http://${host}${req.url}`, {
      method: req.method,
      headers: req.headers,
      ...(!["GET", "HEAD"].includes(req.method)
        ? { body: Buffer.concat(chunks) }
        : {}),
    });
    const response = await handler(request, { ip: req.socket.remoteAddress });
    res.writeHead(response.status, Object.fromEntries(response.headers));
    res.end(Buffer.from(await response.arrayBuffer()));
  } catch {
    res.writeHead(500);
    res.end("Internal server error");
  }
});
server.listen(port, "127.0.0.1", () =>
  console.log(`PM1864 API: http://127.0.0.1:${port}`),
);
async function stop() {
  server.close();
  try {
    await (await getApp()).close();
  } finally {
    process.exit();
  }
}
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
