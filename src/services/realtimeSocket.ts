import { io, type Socket } from "socket.io-client";

import { environmentConfig } from "@/config/environment";
import { tokenStorage } from "@/services/tokenStorage";

const SOCKET_URL = environmentConfig.socketUrl;

type ConnectArgs = {
  salonId: string;
};

class RealtimeSocket {
  private joinedSalonId: string | null = null;
  private socket: Socket | null = null;

  get activeSocket() {
    return this.socket;
  }

  async connect({ salonId }: ConnectArgs) {
    const accessToken = await tokenStorage.getAccessToken();

    if (!accessToken) {
      this.disconnect();
      return null;
    }

    if (this.socket?.connected && this.joinedSalonId === salonId) {
      return this.socket;
    }

    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        auth: { token: accessToken },
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 700,
        reconnectionDelayMax: 5000,
        transports: ["websocket", "polling"],
      });

      this.socket.on("connect", () => {
        console.log("[Socket.IO] Socket connected", {
          socketId: this.socket?.id,
          salonId: this.joinedSalonId,
        });

        if (this.joinedSalonId) {
          this.joinSalon(this.joinedSalonId);
        }
      });
    } else {
      this.socket.auth = { token: accessToken };
    }

    this.joinedSalonId = salonId;

    if (!this.socket.connected) {
      this.socket.connect();
    } else {
      this.joinSalon(salonId);
    }

    return this.socket;
  }

  joinSalon(salonId: string) {
    if (this.joinedSalonId && this.joinedSalonId !== salonId) {
      this.socket?.emit("salon:leave", {
        room: `salon:${this.joinedSalonId}`,
        salonId: this.joinedSalonId,
      });
    }

    this.joinedSalonId = salonId;
    console.log("[Socket.IO] Emitting join_salon", { salonId });
    this.socket?.emit("join_salon", salonId, (ack?: unknown) => {
      console.log("[Socket.IO] join_salon acknowledgement", { salonId, ack });
    });
  }

  disconnect() {
    this.joinedSalonId = null;

    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const realtimeSocket = new RealtimeSocket();
