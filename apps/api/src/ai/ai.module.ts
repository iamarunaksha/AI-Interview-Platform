import { Module } from '@nestjs/common';
import { GeminiLlmAdapter } from './adapters/gemini-llm.adapter.js';
import { MockAiAdapter } from './adapters/mock-ai.adapter.js';
import { DeepgramAdapter } from './adapters/deepgram.adapter.js';
import { ProviderRegistryService } from './provider-registry.service.js';
import { AiService } from './ai.service.js';
import { AiController } from './ai.controller.js';

@Module({
  providers: [
    GeminiLlmAdapter,
    MockAiAdapter,
    DeepgramAdapter,
    ProviderRegistryService,
    AiService,
  ],
  controllers: [AiController],
  exports: [
    AiService,
    ProviderRegistryService,
    GeminiLlmAdapter,
    MockAiAdapter,
    DeepgramAdapter,
  ],
})
export class AiModule {}
