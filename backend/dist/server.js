import { createServer } from "node:http";
import { app } from "./app.js";
import { env } from "./config/env.js";
import { initSocketServer } from "./lib/socket.js";
import { commandAnnouncementService } from "./services/command-announcement.service.js";
const server = createServer(app);
initSocketServer(server);
server.listen(env.PORT, () => {
    console.log(`Guild backend listening on port ${env.PORT}`);
    if (env.RUN_COMMAND_ANNOUNCER_ON_WEB) {
        commandAnnouncementService.startScheduler();
    }
    else {
        console.log("[CommandAnnouncements] Scheduler disabled on web process (RUN_COMMAND_ANNOUNCER_ON_WEB=false)");
    }
});
