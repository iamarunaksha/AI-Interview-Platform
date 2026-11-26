import type { ConversationEvent } from '@interviewai/shared-types';

export interface RealtimeSessionConfig {
  sessionId: string;
  systemInstruction: string;
  voiceName?: string;
  sampleRate?: number;
  session?: any;
  llmProvider?: any;
}

export interface IRealtimeSession {
  readonly sessionId: string;

  /**
   * Send binary PCM audio chunk from candidate microphone.
   */
  sendAudio(pcmChunk: Buffer | Uint8Array): Promise<void>;

  /**
   * Send text message (e.g. candidate turn) to the AI session.
   */
  sendText(text: string): Promise<void>;

  /**
   * Update the dynamic orchestrator system instruction for subsequent turns.
   */
  updateSystemInstruction?(instruction: string): void;

  /**
   * Deliver an internal system context update (e.g. code execution result)
   * without storing it as spoken candidate dialogue.
   */
  sendSystemEvent?(eventDescription: string): Promise<void>;

  /**
   * Handle candidate interruption (cut off current assistant audio output).
   */
  interrupt(): Promise<void>;

  /**
   * Terminate the realtime session.
   */
  close(): Promise<void>;

  /**
   * Register event listener for canonical ConversationEvents.
   */
  onEvent(handler: (event: ConversationEvent) => void): void;
}

export interface IRealtimeVoiceProvider {
  readonly name: string;
  readonly isConfigured: boolean;

  testConnection(): Promise<boolean>;

  createSession(config: RealtimeSessionConfig): Promise<IRealtimeSession>;
}
