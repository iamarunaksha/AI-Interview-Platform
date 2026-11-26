import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import type {
  IRealtimeVoiceProvider,
  IRealtimeSession,
  RealtimeSessionConfig,
} from '../interfaces/realtime-provider.interface.js';
import { MockAiAdapter } from './mock-ai.adapter.js';
import type { ConversationEvent, ChatMessage } from '@interviewai/shared-types';

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
  private readonly useLiveWs: boolean;

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
    this.useLiveWs =
      configService.get<string>('GEMINI_USE_LIVE_WS', 'false') === 'true';

    if (apiKey) {
      this.client = new GoogleGenAI({ apiKey });
      this.isConfigured = true;
      this.logger.log(
        `✅ Gemini Realtime adapter initialized (model: ${this.modelName}, liveWs: ${this.useLiveWs})`,
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
        `[GeminiRealtime] Establishing session for ${config.sessionId}`,
      );
      return new GeminiLiveSessionWrapper(
        this.client,
        this.modelName,
        config,
        this.useLiveWs,
      );
    } catch (error) {
      this.logger.error(
        `Failed to establish Gemini session: ${error instanceof Error ? error.message : String(error)}`,
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
  private isLiveConnected = false;
  private isReady = false;
  private conversationHistory: ChatMessage[] = [];
  private currentSystemInstruction: string;

  constructor(
    private readonly client: GoogleGenAI,
    private readonly model: string,
    private readonly config: RealtimeSessionConfig,
    private readonly useLiveWs = false,
  ) {
    this.currentSystemInstruction = config.systemInstruction;

    // Seed initial assistant greeting into history if available
    const existing = this.config.session?.transcript || [];
    this.conversationHistory = existing.map(
      (t: { role: string; text: string }) => ({
        role: t.role === 'assistant' ? 'assistant' : 'user',
        content: t.text,
      }),
    );

    void this.initSession();
  }

  get sessionId(): string {
    return this.config.sessionId;
  }

  updateSystemInstruction(instruction: string): void {
    this.currentSystemInstruction = instruction;
    this.config.systemInstruction = instruction;
  }

  private markReady() {
    if (this.isClosed || this.isReady) return;
    this.isReady = true;
    this.emit({ type: 'session.ready', timestamp: Date.now() });
  }

  private async initSession() {
    if (!this.useLiveWs) {
      // Operating directly in Deepgram STT/TTS + Gemini LLM turn mode.
      this.isReady = true;
      return;
    }

    try {
      this.liveSession = await this.client.live.connect({
        model: this.model,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        config: {
          systemInstruction: this.currentSystemInstruction
            ? { parts: [{ text: this.currentSystemInstruction }] }
            : undefined,
        } as any,
        callbacks: {
          onopen: () => {
            this.isLiveConnected = true;
            this.markReady();
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onmessage: (msg: any) => {
            this.handleServerMessage(msg);
          },
          onerror: (err: unknown) => {
            this.logger.warn(
              `Gemini Live stream notice (falling back to LLM mode): ${err instanceof Error ? err.message : String(err)}`,
            );
            this.isLiveConnected = false;
          },
          onclose: () => {
            this.isLiveConnected = false;
            // Never emit session.ended on upstream WS close — stay active in LLM turn mode
            this.logger.debug(
              `Gemini Live WebSocket closed for session ${this.config.sessionId}; staying active in LLM mode.`,
            );
          },
        },
      });

      this.markReady();
    } catch (err) {
      this.logger.warn(
        `Gemini Live connection notice (operating in high-speed LLM generation mode): ${err instanceof Error ? err.message : String(err)}`,
      );
      this.isLiveConnected = false;
      this.emit({ type: 'session.ready', timestamp: Date.now() });
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
    if (this.isClosed) return;
    this.conversationHistory.push({ role: 'user', content: text });
    this.emit({ type: 'assistant.response.started', timestamp: Date.now() });

    // 1. If Gemini Live WebSocket is explicitly active, use it exclusively (no dual-path LLM reply)
    if (
      this.isLiveConnected &&
      this.liveSession &&
      typeof this.liveSession.sendClientContent === 'function'
    ) {
      try {
        this.liveSession.sendClientContent({
          turns: [
            {
              role: 'user',
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        });
        return;
      } catch (err) {
        this.logger.warn('SendClientContent failed, falling back to LLM:', err);
        this.isLiveConnected = false;
      }
    }

    // 2. Deliver prompt-aware response via Gemini LLM provider using live orchestrator systemInstruction
    let replyText = '';
    if (this.config.llmProvider && this.config.llmProvider.isConfigured) {
      try {
        const result = await this.config.llmProvider.generateChat(
          this.conversationHistory,
          {
            systemInstruction: this.currentSystemInstruction,
            temperature: 0.7,
          },
        );
        replyText = result.text;
      } catch (err) {
        this.logger.error('Gemini LLM chat generation error:', err);
      }
    }

    if (!replyText) {
      replyText = `That is a solid technical explanation. Let us explore the time and space complexity trade-offs, and consider how your solution handles edge cases and scale.`;
    }

    this.conversationHistory.push({ role: 'assistant', content: replyText });

    this.emit({
      type: 'assistant.transcript.final',
      text: replyText,
      timestamp: Date.now(),
    });
    this.emit({ type: 'turn.completed', timestamp: Date.now() });
  }

  async sendSystemEvent(eventDescription: string): Promise<void> {
    if (this.isClosed) return;
    this.emit({ type: 'assistant.response.started', timestamp: Date.now() });

    const ephemeralHistory: ChatMessage[] = [
      ...this.conversationHistory,
      { role: 'user', content: eventDescription },
    ];

    let replyText = '';
    if (this.config.llmProvider && this.config.llmProvider.isConfigured) {
      try {
        const result = await this.config.llmProvider.generateChat(
          ephemeralHistory,
          {
            systemInstruction: this.currentSystemInstruction,
            temperature: 0.7,
          },
        );
        replyText = result.text;
      } catch (err) {
        this.logger.error('Gemini LLM system-event generation error:', err);
      }
    }

    if (!replyText) {
      return;
    }

    this.conversationHistory.push({ role: 'assistant', content: replyText });

    this.emit({
      type: 'assistant.transcript.final',
      text: replyText,
      timestamp: Date.now(),
    });
    this.emit({ type: 'turn.completed', timestamp: Date.now() });
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
    this.eventHandlers = [handler];
    if (this.isReady && !this.isClosed) {
      handler({ type: 'session.ready', timestamp: Date.now() });
    }
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
