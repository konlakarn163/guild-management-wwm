import { commandAnnouncementService } from "./services/command-announcement.service.js";

console.log("[DiscordWorker] Command announcement scheduler starting");
commandAnnouncementService.startScheduler();
