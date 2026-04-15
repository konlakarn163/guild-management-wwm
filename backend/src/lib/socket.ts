import type { Server as HttpServer } from "node:http";
import { Server as SocketIOServer } from "socket.io";
import { env } from "../config/env.js";

let io: SocketIOServer | null = null;

const isWeekId = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

export const initSocketServer = (server: HttpServer) => {
  io = new SocketIOServer(server, {
    cors: {
      origin: env.FRONTEND_ORIGIN,
      credentials: true,
    },
  });

  io.on("connection", (socket) => {
    socket.on("guildWar:joinWeek", (weekId: string) => {
      if (!isWeekId(weekId)) {
        return;
      }

      socket.join(`guildWar:week:${weekId}`);
    });

    socket.on("guildWar:leaveWeek", (weekId: string) => {
      if (!isWeekId(weekId)) {
        return;
      }

      socket.leave(`guildWar:week:${weekId}`);
    });

    socket.on(
      "guildWar:teamMoved",
      (payload: { weekId: string; memberKey: string; targetZone: string }) => {
        if (!payload || !isWeekId(payload.weekId)) {
          return;
        }

        socket.to(`guildWar:week:${payload.weekId}`).emit("guildWar:teamMoved", payload);
      },
    );
  });

  return io;
};

export const getSocketServer = () => {
  if (!io) {
    throw new Error("Socket server has not been initialized");
  }

  return io;
};
