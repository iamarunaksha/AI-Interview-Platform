import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ILlmProvider } from './interfaces/llm-provider.interface.js';
import type { IRealtimeVoiceProvider } from './interfaces/realtime-provider.interface.js';
import type { IEvaluationProvider } from './interfaces/evaluation-provider.interface.js';
import { GeminiLlmAdapter } from './adapters/gemini-llm.adapter.js';
import { MockAiAdapter } from './adapters/mock-ai.adapter.js';
import { DeepgramAdapter } from './adapters/deepgram.adapter.js';
import type {
  AiSystemStatusResponse,
  AiProviderInfo,
} from '@interviewai/shared-types';

/**
 * ProviderRegistryService — central dispatcher for all AI adapters.
 *
 * Implements Dependency Inversion & Adapter Pattern (ADR-003):
 * 1. Business logic (Orchestrator, Evaluation Engine) requests providers from here.
 * 2. Swapping providers requires only a config/env change (e.g. LLM_PROVIDER=gemini -> mock).
 * 3. Gracefully degrades to local mock simulator if external provider credentials are missing.
 */
@Injectable()
export class ProviderRegistryService {
  private readonly logger = new Logger(ProviderRegistryService.name);

  private readonly llmProviders = new Map<string, ILlmProvider>();
  private readonly realtimeProviders = new Map<
    string,
    IRealtimeVoiceProvider
  >();
  private readonly evaluationProviders = new Map<string, IEvaluationProvider>();

  constructor(
    private readonly configService: ConfigService,
    private readonly geminiAdapter: GeminiLlmAdapter,
    private readonly mockAdapter: MockAiAdapter,
    private readonly deepgramAdapter: DeepgramAdapter,
  ) {
    this.registerProviders();
  }

  private registerProviders() {
    // LLM Providers
    this.llmProviders.set(this.geminiAdapter.name, this.geminiAdapter);
    this.llmProviders.set(this.mockAdapter.name, this.mockAdapter);

    // Realtime Voice Providers
    this.realtimeProviders.set(this.mockAdapter.name, this.mockAdapter);
    // (Gemini Live realtime WebSocket adapter will be wired in Phase 5)

    // Evaluation Providers
    this.evaluationProviders.set(this.geminiAdapter.name, this.geminiAdapter);
    this.evaluationProviders.set(this.mockAdapter.name, this.mockAdapter);

    this.logger.log(
      `AI Provider Registry initialized with [${Array.from(this.llmProviders.keys()).join(', ')}]`,
    );
  }

  /**
   * Get the active LLM provider based on LLM_PROVIDER configuration.
   */
  getActiveLlmProvider(): ILlmProvider {
    const configuredName = this.configService
      .get<string>('LLM_PROVIDER', 'gemini')
      .toLowerCase();
    const provider = this.llmProviders.get(configuredName);

    if (provider && provider.isConfigured) {
      return provider;
    }

    // If configured provider lacks credentials, return mock with clear notice
    this.logger.debug(
      `Configured LLM provider '${configuredName}' not available or unconfigured; using mock provider.`,
    );
    return this.mockAdapter;
  }

  /**
   * Get specific LLM provider by name.
   */
  getLlmProvider(name: string): ILlmProvider {
    const provider = this.llmProviders.get(name.toLowerCase());
    return provider ?? this.mockAdapter;
  }

  /**
   * Get active Realtime Voice provider.
   */
  getActiveRealtimeProvider(): IRealtimeVoiceProvider {
    const configuredName = this.configService
      .get<string>('REALTIME_PROVIDER', 'mock')
      .toLowerCase();
    const provider = this.realtimeProviders.get(configuredName);
    return provider ?? this.mockAdapter;
  }

  /**
   * Get active Evaluation provider.
   */
  getActiveEvaluationProvider(): IEvaluationProvider {
    const configuredName = this.configService
      .get<string>('EVALUATION_PROVIDER', 'gemini')
      .toLowerCase();
    const provider = this.evaluationProviders.get(configuredName);

    if (provider && provider.isConfigured) {
      return provider;
    }

    return this.mockAdapter;
  }

  /**
   * Returns a complete status snapshot of all AI providers.
   */
  async getStatus(): Promise<AiSystemStatusResponse> {
    const activeLlm = this.getActiveLlmProvider();
    const activeRealtime = this.getActiveRealtimeProvider();
    const activeEval = this.getActiveEvaluationProvider();

    const providers: AiProviderInfo[] = [
      {
        name: 'gemini',
        role: 'llm',
        modelName: this.geminiAdapter.modelName,
        isConfigured: this.geminiAdapter.isConfigured,
        isAvailable: this.geminiAdapter.isConfigured,
        details: this.geminiAdapter.isConfigured
          ? 'Ready for generation'
          : 'GEMINI_API_KEY not configured in .env',
      },
      {
        name: 'mock',
        role: 'llm',
        modelName: this.mockAdapter.modelName,
        isConfigured: true,
        isAvailable: true,
        details: 'Local deterministic offline simulator',
      },
      {
        name: 'deepgram',
        role: 'stt',
        modelName: 'nova-2 / aura',
        isConfigured: this.deepgramAdapter.isConfigured,
        isAvailable: this.deepgramAdapter.isConfigured,
        details: this.deepgramAdapter.isConfigured
          ? 'Deepgram fallback configured'
          : 'DEEPGRAM_API_KEY optional fallback',
      },
    ];

    return {
      activeProviders: {
        llm: activeLlm.name,
        realtime: activeRealtime.name,
        stt: this.deepgramAdapter.isConfigured ? 'deepgram' : 'gemini',
        tts: this.deepgramAdapter.isConfigured ? 'deepgram' : 'gemini',
        evaluation: activeEval.name,
      },
      providers,
    };
  }
}
