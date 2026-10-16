import { io, type Socket } from "socket.io-client";

import { environmentConfig, getEnvironmentConfigurationError } from "@/config/environment";
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
    const configurationError = getEnvironmentConfigurationError();

    if (configurationError) {
      return null;
    }

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
        // Read on every (re)connect so a refreshed access token is used. The
        // server checks it and keeps staff phones out of the owner's room.
        auth: (callback) => {
          void tokenStorage.getAccessToken().then(
            (token) => callback({ token, client: "mobile" }),
            () => callback({ client: "mobile" }),
          );
        },
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: Infinity,
        reconnectionDelay: 700,
        reconnectionDelayMax: 5000,
        transports: ["websocket", "polling"],
      });

      this.socket.on("connect", () => {
        if (this.joinedSalonId) {
          this.joinSalon(this.joinedSalonId);
        }
      });

      // A server-side rejection (e.g. an access token that expired while the
      // app was idle) stops Socket.IO's own reconnects; retry so the next
      // attempt picks up the refreshed token.
      this.socket.on("connect_error", () => {
        const socket = this.socket;
        if (!socket || socket.active) return;
        setTimeout(() => {
          if (this.socket === socket && !socket.connected) socket.connect();
        }, 5000);
      });
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
    this.socket?.emit("join_salon", salonId, () => {});
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
