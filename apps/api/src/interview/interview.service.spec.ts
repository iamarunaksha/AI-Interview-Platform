import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InterviewService } from './interview.service.js';
import { InterviewSessionEntity } from './entities/interview-session.entity.js';
import { Question } from '../tracks/entities/question.entity.js';
import { InterviewOrchestratorService } from './orchestrator/interview-orchestrator.service.js';
import { ContextInjectorService } from './orchestrator/context-injector.service.js';
import type { ProviderRegistryService } from '../ai/provider-registry.service.js';
import type {
  IRealtimeVoiceProvider,
  IRealtimeSession,
} from '../ai/interfaces/realtime-provider.interface.js';
import type { Repository } from 'typeorm';
import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  InterviewStatus,
  InterviewStage,
  InterviewMode,
  InterviewerPersonality,
  MessageRole,
  type ConversationEvent,
} from '@interviewai/shared-types';

describe('InterviewService', () => {
  let service: InterviewService;
  let sessionRepo: Partial<Repository<InterviewSessionEntity>>;
  let questionRepo: Partial<Repository<Question>>;
  let providerRegistry: Partial<ProviderRegistryService>;
  let orchestratorService: InterviewOrchestratorService;
  let mockRealtimeSession: Partial<IRealtimeSession>;
  let mockRealtimeProvider: Partial<IRealtimeVoiceProvider>;

  const mockQuestion: Question = {
    id: 'question-1',
    competencyId: 'comp-1',
    competency: {
      id: 'comp-1',
      domain: ProfessionalDomain.SDE,
      name: 'System Design',
      slug: 'system-design',
      category: 'Architecture',
      description: 'Distributed systems design',
      isActive: true,
      questions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    domain: ProfessionalDomain.SDE,
    companyCategories: [CompanyCategory.PRODUCT_COMPANY],
    experienceLevels: [ExperienceLevel.SDE_1],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'Design Rate Limiter',
    stem: 'Design a distributed rate limiter.',
    contextPrompt: 'Probe on algorithm and race conditions.',
    expectedConcepts: ['Token Bucket', 'Redis'],
    commonMisconceptions: ['Single server counter'],
    probingQuestions: [],
    rubricGuide: [],
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSession: InterviewSessionEntity = {
    id: 'session-123',
    candidateId: 'user-456',
    candidate: {} as any,
    domain: ProfessionalDomain.SDE,
    companyCategory: CompanyCategory.PRODUCT_COMPANY,
    targetRole: 'Software Development Engineer',
    experienceLevel: ExperienceLevel.SDE_1,
    difficulty: InterviewDifficulty.MEDIUM,
    durationMinutes: 30,
    personality: InterviewerPersonality.PROFESSIONAL,
    mode: InterviewMode.PRACTICE,
    status: InterviewStatus.CREATED,
    currentStage: InterviewStage.GREETING,
    coveredConcepts: [],
    currentQuestionId: 'question-1',
    currentQuestion: mockQuestion,
    transcript: [],
    startedAt: null,
    endedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    let capturedHandler: ((event: ConversationEvent) => void) | null = null;

    mockRealtimeSession = {
      sessionId: 'session-123',
      sendAudio: vi.fn().mockResolvedValue(undefined),
      sendText: vi.fn().mockImplementation((text: string) => {
        if (capturedHandler) {
          capturedHandler({
            type: 'assistant.transcript.final',
            text: `Answer to: ${text}`,
            timestamp: Date.now(),
          });
        }
        return Promise.resolve();
      }),
      interrupt: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      onEvent: vi
        .fn()
        .mockImplementation((handler: (event: ConversationEvent) => void) => {
          capturedHandler = handler;
        }),
    };

    mockRealtimeProvider = {
      name: 'mock',
      isConfigured: true,
      testConnection: vi.fn().mockResolvedValue(true),
      createSession: vi
        .fn()
        .mockResolvedValue(mockRealtimeSession as IRealtimeSession),
    };

    sessionRepo = {
      create: vi.fn().mockImplementation((dto: any) => ({
        ...dto,
        id: 'session-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      save: vi
        .fn()
        .mockImplementation((entity: any) => Promise.resolve(entity)),
      findOne: vi.fn().mockImplementation(({ where }: any) => {
        if (where?.id === 'session-123') {
          return Promise.resolve(
            Object.assign(new InterviewSessionEntity(), mockSession),
          );
        }
        return Promise.resolve(null);
      }),
      find: vi
        .fn()
        .mockResolvedValue([
          Object.assign(new InterviewSessionEntity(), mockSession),
        ]),
    };

    questionRepo = {
      findOne: vi
        .fn()
        .mockResolvedValue(Object.assign(new Question(), mockQuestion)),
    };

    providerRegistry = {
      getActiveRealtimeProvider: vi
        .fn()
        .mockReturnValue(mockRealtimeProvider as IRealtimeVoiceProvider),
    };

    const contextInjector = new ContextInjectorService();
    orchestratorService = new InterviewOrchestratorService(
      sessionRepo as Repository<InterviewSessionEntity>,
      contextInjector,
    );

    service = new InterviewService(
      sessionRepo as Repository<InterviewSessionEntity>,
      questionRepo as Repository<Question>,
      providerRegistry as ProviderRegistryService,
      orchestratorService,
    );
  });

  it('should create an interview session with an initial question', async () => {
    const result = await service.createSession('user-456', {
      domain: ProfessionalDomain.SDE,
      targetRole: 'Backend Engineer',
      difficulty: InterviewDifficulty.MEDIUM,
    });

    expect(result).toBeDefined();
    expect(result.id).toBe('session-123');
    expect(result.candidateId).toBe('user-456');
    expect(result.status).toBe(InterviewStatus.CREATED);
    expect(result.currentQuestion?.title).toBe('Design Rate Limiter');
  });

  it('should retrieve an existing session by id', async () => {
    const session = await service.getSession('session-123');
    expect(session.id).toBe('session-123');
    expect(session.targetRole).toBe('Software Development Engineer');
  });

  it('should update session status when starting, pausing, and ending', async () => {
    const started = await service.startSession('session-123');
    expect(started.status).toBe(InterviewStatus.IN_PROGRESS);
    expect(started.startedAt).toBeDefined();

    const paused = await service.pauseSession('session-123');
    expect(paused.status).toBe(InterviewStatus.PAUSED);

    const ended = await service.endSession('session-123');
    expect(ended.status).toBe(InterviewStatus.COMPLETED);
    expect(ended.endedAt).toBeDefined();
  });

  it('should append transcript turns to the session', async () => {
    await service.appendTranscriptTurn('session-123', {
      id: 'turn-1',
      role: MessageRole.ASSISTANT,
      text: 'Tell me about Redis.',
      timestamp: Date.now(),
    });

    expect(sessionRepo.save).toHaveBeenCalled();
  });

  it('should establish a realtime AI bridge and handle text messages', async () => {
    const events: ConversationEvent[] = [];
    const bridge = await service.createRealtimeBridge('session-123', (ev) => {
      events.push(ev);
    });

    expect(bridge).toBeDefined();
    await service.sendClientText('session-123', 'I like Redis token bucket.');

    expect(mockRealtimeSession.sendText).toHaveBeenCalledWith(
      'I like Redis token bucket.',
    );
    expect(events.length).toBeGreaterThan(0);
    expect(events.some((e) => e.type === 'assistant.transcript.final')).toBe(
      true,
    );
  });
});
