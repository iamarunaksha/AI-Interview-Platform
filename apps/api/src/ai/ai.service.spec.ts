import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProviderRegistryService } from './provider-registry.service.js';
import { AiService } from './ai.service.js';
import { MockAiAdapter } from './adapters/mock-ai.adapter.js';
import { GeminiLlmAdapter } from './adapters/gemini-llm.adapter.js';
import { DeepgramAdapter } from './adapters/deepgram.adapter.js';
import type { ConfigService } from '@nestjs/config';
import {
  ProfessionalDomain,
  ExperienceLevel,
  EvaluationRating,
} from '@interviewai/shared-types';

describe('AI Provider Abstraction Layer', () => {
  let mockAdapter: MockAiAdapter;
  let geminiAdapter: GeminiLlmAdapter;
  let deepgramAdapter: DeepgramAdapter;
  let registryService: ProviderRegistryService;
  let aiService: AiService;
  let mockConfigService: Partial<ConfigService>;

  beforeEach(() => {
    mockConfigService = {
      get: vi.fn((key: string, defaultValue?: any) => {
        if (key === 'LLM_PROVIDER') return 'mock';
        if (key === 'REALTIME_PROVIDER') return 'mock';
        if (key === 'EVALUATION_PROVIDER') return 'mock';
        if (key === 'GEMINI_API_KEY') return '';
        if (key === 'GEMINI_MODEL') return 'gemini-2.0-flash';
        return defaultValue;
      }),
    };

    mockAdapter = new MockAiAdapter();
    geminiAdapter = new GeminiLlmAdapter(mockConfigService as ConfigService);
    deepgramAdapter = new DeepgramAdapter(mockConfigService as ConfigService);

    registryService = new ProviderRegistryService(
      mockConfigService as ConfigService,
      geminiAdapter,
      mockAdapter,
      deepgramAdapter,
    );

    aiService = new AiService(registryService);
  });

  describe('MockAiAdapter', () => {
    it('should generate text output', async () => {
      const result = await mockAdapter.generateText('What is Redis?');
      expect(result.text).toBeDefined();
      expect(result.modelName).toBe('mock-v1');
      expect(result.finishReason).toBe('STOP');
    });

    it('should return valid JSON when responseMimeType is application/json', async () => {
      const result = await mockAdapter.generateText('Analyze concurrency', {
        responseMimeType: 'application/json',
      });
      const parsed = JSON.parse(result.text);
      expect(parsed.acknowledged).toBe(true);
      expect(parsed.mode).toBe('mock');
    });

    it('should stream tokens in streamChat', async () => {
      const chunks: string[] = [];
      for await (const chunk of mockAdapter.streamChat([
        { role: 'user', content: 'hello' },
      ])) {
        chunks.push(chunk);
      }
      expect(chunks.length).toBeGreaterThan(5);
      expect(chunks.join('')).toContain('distributed');
    });

    it('should evaluate session and produce four-level rubric', async () => {
      const report = await mockAdapter.evaluateSession({
        sessionId: 'session-123',
        domain: ProfessionalDomain.SDE,
        targetRole: 'Backend Engineer',
        experienceLevel: ExperienceLevel.SDE_2,
        transcript: [
          {
            role: 'assistant',
            text: 'How do you prevent race conditions?',
            timestamp: 1,
          },
          { role: 'candidate', text: 'I use Redis Lua scripts.', timestamp: 2 },
        ],
        evidence: [],
        competencies: [
          {
            id: 'c-1',
            name: 'Concurrency',
            description: 'Thread safety',
          },
        ],
      });

      expect(report.sessionId).toBe('session-123');
      expect(report.overallRating).toBe(EvaluationRating.PROFICIENT);
      expect(report.competencyScores).toHaveLength(1);
      expect(report.strengths.length).toBeGreaterThan(0);
    });
  });

  describe('ProviderRegistryService', () => {
    it('should return mock adapter when configured as mock', () => {
      const active = registryService.getActiveLlmProvider();
      expect(active.name).toBe('mock');
    });

    it('should return full status snapshot', async () => {
      const status = await registryService.getStatus();
      expect(status.activeProviders.llm).toBe('mock');
      expect(status.providers.length).toBe(3);
      expect(status.providers.some((p) => p.name === 'gemini')).toBe(true);
      expect(status.providers.some((p) => p.name === 'mock')).toBe(true);
    });
  });

  describe('AiService', () => {
    it('should execute test generation and measure latency', async () => {
      const response = await aiService.testGenerate({
        prompt: 'Explain rate limiting in 1 sentence',
      });

      expect(response.provider).toBe('mock');
      expect(response.model).toBe('mock-v1');
      expect(response.output).toBeDefined();
      expect(response.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });
});
