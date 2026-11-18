import { Injectable, Logger } from '@nestjs/common';
import { ProviderRegistryService } from './provider-registry.service.js';
import type {
  TestGenerateRequest,
  TestGenerateResponse,
  AiSystemStatusResponse,
} from '@interviewai/shared-types';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly registry: ProviderRegistryService) {}

  /**
   * Return status of all AI providers and current active selections.
   */
  async getStatus(): Promise<AiSystemStatusResponse> {
    return this.registry.getStatus();
  }

  /**
   * Run a test generation via specified or default LLM provider,
   * tracking latency and returned token output.
   */
  async testGenerate(
    request: TestGenerateRequest,
  ): Promise<TestGenerateResponse> {
    const startTime = Date.now();
    const provider = request.provider
      ? this.registry.getLlmProvider(request.provider)
      : this.registry.getActiveLlmProvider();

    this.logger.log(
      `Running test generate via provider: ${provider.name} (${provider.modelName})`,
    );

    const result = await provider.generateText(request.prompt, {
      systemInstruction: request.systemInstruction,
    });

    const latencyMs = Date.now() - startTime;

    return {
      provider: provider.name,
      model: result.modelName,
      output: result.text,
      latencyMs,
    };
  }
}
