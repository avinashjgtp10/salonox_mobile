import { io, Socket } from "socket.io-client";
import { API_ORIGIN } from "../api/baseUrl";

let socket: Socket | null = null;
let joinedSalonId: string | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(API_ORIGIN, {
      transports: ["websocket", "polling"],
      autoConnect: false,
      withCredentials: true,
    });

    // Re-join salon room automatically on every (re)connect
    socket.on("connect", () => {
      if (joinedSalonId) {
        socket!.emit("join_salon", joinedSalonId);
      }
    });
  }
  return socket;
}

export function connectSocket(salonId: string): Socket {
  joinedSalonId = salonId;
  const s = getSocket();

  if (s.connected) {
    // Already connected — join the room immediately
    s.emit("join_salon", salonId);
  } else {
    // connect() will trigger the "connect" handler above which emits join_salon
    s.connect();
  }

  return s;
}

export function disconnectSocket(): void {
  joinedSalonId = null;
  if (socket?.connected) {
    socket.disconnect();
  }
}

export { getSocket };
