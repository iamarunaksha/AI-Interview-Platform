import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type {
  IRealtimeVoiceProvider,
  IRealtimeSession,
  RealtimeSessionConfig,
} from '../interfaces/realtime-provider.interface.js';
import { MockAiAdapter } from './mock-ai.adapter.js';
import type { ConversationEvent } from '@interviewai/shared-types';

/**
 * GeminiRealtimeAdapter — connects to Gemini Live API via official @google/genai SDK.
 *
 * Implements IRealtimeVoiceProvider.
 * If GEMINI_API_KEY is not configured or in an offline sandbox, falls back
 * automatically to MockAiAdapter's deterministic real-time session.
 */
@Injectable()
export class GeminiRealtimeAdapter implements IRealtimeVoiceProvider {
  private readonly logger = new Logger(GeminiRealtimeAdapter.name);
  private readonly client: GoogleGenAI | null = null;
  private readonly fallbackMock: MockAiAdapter;

  readonly name = 'gemini';
  readonly isConfigured: boolean;
  readonly modelName: string;

  constructor(configService: ConfigService) {
    this.fallbackMock = new MockAiAdapter();
    const apiKey = configService.get<string>('GEMINI_API_KEY', '').trim();
    this.modelName = configService.get<string>(
      'GEMINI_LIVE_MODEL',
      'gemini-2.0-flash-exp',
    );

    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
      this.isConfigured = true;
      this.logger.log(
        `✅ Gemini Realtime adapter initialized with model ${this.modelName}`,
      );
    } else {
      this.client = null;
      this.isConfigured = false;
      this.logger.warn(
        `⚠️ GEMINI_API_KEY not configured. Gemini Realtime adapter running in simulated fallback mode.`,
      );
    }
  }

  async testConnection(): Promise<boolean> {
    if (!this.client || !this.isConfigured) {
      return false;
    }
    return true;
  }

  async createSession(
    config: RealtimeSessionConfig,
  ): Promise<IRealtimeSession> {
    if (!this.client || !this.isConfigured) {
      this.logger.debug(
        `[GeminiRealtime] Falling back to mock session for ${config.sessionId}`,
      );
      return this.fallbackMock.createSession(config);
    }

    try {
      this.logger.log(
        `[GeminiRealtime] Establishing live session for ${config.sessionId}`,
      );
      return new GeminiLiveSessionWrapper(this.client, this.modelName, config);
    } catch (error) {
      this.logger.error(
        `Failed to establish Gemini Live session: ${error instanceof Error ? error.message : String(error)}`,
      );
      return this.fallbackMock.createSession(config);
    }
  }
}

class GeminiLiveSessionWrapper implements IRealtimeSession {
  private readonly logger = new Logger(GeminiLiveSessionWrapper.name);
  private eventHandlers: Array<(event: ConversationEvent) => void> = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private liveSession: any = null;
  private isClosed = false;

  constructor(
    private readonly client: GoogleGenAI,
    private readonly model: string,
    private readonly config: RealtimeSessionConfig,
  ) {
    void this.initSession();
  }

  get sessionId(): string {
    return this.config.sessionId;
  }

  private async initSession() {
    try {
      // Connect to Gemini live API
      // Note: @google/genai ai.live.connect accepts model and callbacks
      this.liveSession = await this.client.live.connect({
        model: this.model,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config: {
          systemInstruction: this.config.systemInstruction
            ? { parts: [{ text: this.config.systemInstruction }] }
            : undefined,
        } as any,
        callbacks: {
          onopen: () => {
            this.emit({ type: 'session.ready', timestamp: Date.now() });
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onmessage: (msg: any) => {
            this.handleServerMessage(msg);
          },
          onerror: (err: unknown) => {
            this.logger.error('Gemini Live error:', err);
            this.emit({
              type: 'session.error',
              code: 'GEMINI_LIVE_ERROR',
              message: err instanceof Error ? err.message : 'Live stream error',
              timestamp: Date.now(),
            });
          },
          onclose: () => {
            if (!this.isClosed) {
              this.emit({
                type: 'session.ended',
                reason: 'remote_closed',
                timestamp: Date.now(),
              });
            }
          },
        },
      });

      this.emit({ type: 'session.ready', timestamp: Date.now() });
    } catch (err) {
      this.logger.error('Failed to connect to Gemini Live:', err);
      this.emit({
        type: 'session.error',
        code: 'CONNECTION_FAILED',
        message: err instanceof Error ? err.message : 'Connection failed',
        timestamp: Date.now(),
      });
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handleServerMessage(message: any) {
    if (!message) return;

    // Check serverContent parts
    const serverContent = message.serverContent;
    if (serverContent) {
      if (serverContent.modelTurn) {
        this.emit({
          type: 'assistant.response.started',
          timestamp: Date.now(),
        });

        const parts = serverContent.modelTurn.parts || [];
        for (const part of parts) {
          if (part.text) {
            this.emit({
              type: 'assistant.transcript.delta',
              text: part.text,
              timestamp: Date.now(),
            });
          }
          if (part.inlineData && part.inlineData.data) {
            const audioBuffer = Buffer.from(part.inlineData.data, 'base64');
            this.emit({
              type: 'assistant.audio.chunk',
              audio: new Uint8Array(audioBuffer),
              timestamp: Date.now(),
            });
          }
        }
      }

      if (serverContent.turnComplete) {
        this.emit({ type: 'turn.completed', timestamp: Date.now() });
      }

      if (serverContent.interrupted) {
        this.emit({ type: 'assistant.interrupted', timestamp: Date.now() });
      }
    }
  }

  async sendAudio(pcmChunk: Buffer | Uint8Array): Promise<void> {
    if (this.isClosed || !this.liveSession) return;
    try {
      const base64Data = Buffer.from(pcmChunk).toString('base64');
      if (typeof this.liveSession.sendRealtimeInput === 'function') {
        this.liveSession.sendRealtimeInput({
          media: {
            mimeType: 'audio/pcm;rate=16000',
            data: base64Data,
          },
        });
      }
    } catch (err) {
      this.logger.error('Error sending audio to Gemini Live:', err);
    }
  }

  async sendText(text: string): Promise<void> {
    if (this.isClosed || !this.liveSession) return;
    try {
      if (typeof this.liveSession.sendClientContent === 'function') {
        this.liveSession.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        });
      }
    } catch (err) {
      this.logger.error('Error sending text to Gemini Live:', err);
    }
  }

  async interrupt(): Promise<void> {
    this.emit({ type: 'assistant.interrupted', timestamp: Date.now() });
  }

  async close(): Promise<void> {
    if (this.isClosed) return;
    this.isClosed = true;
    try {
      if (this.liveSession && this.liveSession.conn) {
        this.liveSession.conn.close();
      }
    } catch {
      // ignore
    }
    this.emit({
      type: 'session.ended',
      reason: 'client_closed',
      timestamp: Date.now(),
    });
  }

  onEvent(handler: (event: ConversationEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  private emit(event: ConversationEvent) {
    for (const h of this.eventHandlers) {
      try {
        h(event);
      } catch (err) {
        this.logger.error('Error in live event listener:', err);
      }
    }
  }
}
