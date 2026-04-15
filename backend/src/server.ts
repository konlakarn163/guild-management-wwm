import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initSocketServer } from "./lib/socket.js";

const server = createServer(app);
initSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`Guild backend listening on port ${env.PORT}`);
});