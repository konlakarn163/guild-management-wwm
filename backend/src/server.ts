import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initSocketServer } from "./lib/socket.js";
import { startDiscordCodeAutomation } from "./services/discord-code-automation.service.js";

const server = createServer(app);
initSocketServer(server);

server.listen(env.PORT, () => {
  console.log(`Guild backend listening on port ${env.PORT}`);
  if (env.RUN_DISCORD_AUTOMATION_ON_WEB) {
    void startDiscordCodeAutomation();
  } else {
    console.log("[DiscordCodeAutomation] Disabled on web process (RUN_DISCORD_AUTOMATION_ON_WEB=false)");
  }
});