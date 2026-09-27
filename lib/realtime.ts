import { io, type Socket } from "socket.io-client";

const normalizeSocketBaseUrl = (value?: string) => {
  const fallback = "http://localhost:4000";
  const raw = value?.trim();

  if (!raw) {
    return fallback;
  }

  const withoutTrailingSlash = raw.replace(/\/+$/, "");

  if (withoutTrailingSlash.toLowerCase().endsWith("/api")) {
    return withoutTrailingSlash.slice(0, -4);
  }

  return withoutTrailingSlash;
};

const SOCKET_BASE_URL = normalizeSocketBaseUrl(process.env.NEXT_PUBLIC_API_BASE_URL);

let socketInstance: Socket | null = null;

export const getRealtimeSocket = () => {
  if (!socketInstance) {
    socketInstance = io(SOCKET_BASE_URL, {
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
    });
  }

  return socketInstance;
};
