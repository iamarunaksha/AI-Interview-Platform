import { io, Socket } from "socket.io-client";
import { getStoredAccessToken } from "./api-client";
import type {
  ConversationEvent,
  CodeExecutionResult,
  VideoLayoutMode,
} from "@interviewai/shared-types";

const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:4000";

export class InterviewSocketClient {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private isConnected = false;

  constructor() {}

  connect(
    sessionId: string,
    callbacks?: {
      onReady?: () => void;
      onEvent?: (event: ConversationEvent) => void;
      onError?: (err: { code: string; message: string }) => void;
      onDisconnect?: () => void;
      onCodeResult?: (result: CodeExecutionResult) => void;
      onCodeStatus?: (status: { status: string; message?: string }) => void;
    },
  ): Socket {
    if (this.socket && this.socket.connected && this.sessionId === sessionId) {
      return this.socket;
    }

    this.disconnect();
    this.sessionId = sessionId;

    const token = getStoredAccessToken();

    this.socket = io(`${WS_BASE_URL}/interview`, {
      transports: ["websocket", "polling"],
      auth: {
        token: token ?? undefined,
      },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    this.socket.on("connect", () => {
      this.isConnected = true;
      // Immediately emit session.join with the target sessionId
      this.socket?.emit("session.join", { sessionId });
    });

    this.socket.on("session.ready", (event: ConversationEvent) => {
      callbacks?.onReady?.();
      callbacks?.onEvent?.(event);
    });

    this.socket.on("conversation.event", (event: ConversationEvent) => {
      callbacks?.onEvent?.(event);
    });

    this.socket.on("code.result", (result: CodeExecutionResult) => {
      callbacks?.onCodeResult?.(result);
    });

    this.socket.on(
      "code.status",
      (status: { status: string; message?: string }) => {
        callbacks?.onCodeStatus?.(status);
      },
    );

    this.socket.on(
      "session.error",
      (err: { code: string; message: string }) => {
        callbacks?.onError?.(err);
      },
    );

    this.socket.on("disconnect", () => {
      this.isConnected = false;
      callbacks?.onDisconnect?.();
    });

    return this.socket;
  }

  sendAudioChunk(chunk: Uint8Array | ArrayBuffer | string): void {
    if (!this.socket || !this.isConnected || !this.sessionId) return;
    this.socket.emit("audio.chunk", {
      sessionId: this.sessionId,
      chunk,
    });
  }

  sendTextMessage(text: string): void {
    if (!this.socket || !this.isConnected || !this.sessionId) return;
    this.socket.emit("message.send", {
      sessionId: this.sessionId,
      text,
    });
  }

  sendCodeChange(code: string, language: string): void {
    if (!this.socket || !this.isConnected || !this.sessionId) return;
    this.socket.emit("code.change", {
      sessionId: this.sessionId,
      code,
      language,
    });
  }

  runCode(code: string, language: string, problemId?: string): void {
    if (!this.socket || !this.isConnected || !this.sessionId) return;
    this.socket.emit("code.run", {
      sessionId: this.sessionId,
      code,
      language,
      problemId,
    });
  }

  sendVideoToggle(isCameraActive: boolean, layoutMode?: VideoLayoutMode): void {
    if (!this.socket || !this.isConnected || !this.sessionId) return;
    this.socket.emit("video.toggle", {
      sessionId: this.sessionId,
      isCameraActive,
      layoutMode,
    });
  }

  setAudioLanguage(language: string): void {
    if (!this.socket || !this.isConnected || !this.sessionId) return;
    this.socket.emit("audio.config", {
      sessionId: this.sessionId,
      language,
    });
  }

  interrupt(): void {
    if (!this.socket || !this.isConnected || !this.sessionId) return;
    this.socket.emit("interview.interrupt", {
      sessionId: this.sessionId,
    });
  }

  pause(): void {
    if (!this.socket || !this.isConnected || !this.sessionId) return;
    this.socket.emit("interview.pause", {
      sessionId: this.sessionId,
    });
  }

  endInterview(reason = "candidate_ended"): void {
    if (!this.socket || !this.isConnected || !this.sessionId) return;
    this.socket.emit("interview.end", {
      sessionId: this.sessionId,
      reason,
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
      this.sessionId = null;
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const interviewSocket = new InterviewSocketClient();
