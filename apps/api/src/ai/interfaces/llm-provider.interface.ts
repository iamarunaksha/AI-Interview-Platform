import type {
  ChatMessage,
  LlmGenerateOptions,
  LlmGenerateResult,
} from '@interviewai/shared-types';

/**
 * LLM Provider Interface.
 *
 * Core architectural contract. Any LLM provider (Google Gemini, OpenAI,
 * Anthropic, or Local Mock) must implement this interface.
 * The rest of the platform (Interview Orchestrator, Evaluation Engine)
 * depends solely on this interface, never on vendor SDKs.
 */
export interface ILlmProvider {
  readonly name: string;
  readonly modelName: string;
  readonly isConfigured: boolean;

  /**
   * Health check to test API key validity and remote connectivity.
   */
  testConnection(): Promise<boolean>;

  /**
   * Single prompt generation.
   */
  generateText(
    prompt: string,
    options?: LlmGenerateOptions,
  ): Promise<LlmGenerateResult>;

  /**
   * Multi-turn chat completion.
   */
  generateChat(
    messages: ChatMessage[],
    options?: LlmGenerateOptions,
  ): Promise<LlmGenerateResult>;

  /**
   * Streaming chat completion. Yields token deltas as they arrive.
   */
  streamChat(
    messages: ChatMessage[],
    options?: LlmGenerateOptions,
  ): AsyncIterable<string>;
}
