import { io, type Socket } from "socket.io-client";

const SOCKET_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

let socketInstance: Socket | null = null;

export const getRealtimeSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_BASE_URL, {
      transports: ["websocket"],
    });
  }

  return socketInstance;
};
