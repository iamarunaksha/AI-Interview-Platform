import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  InterviewStage,
  type OrchestratorState,
  type OrchestratorTransitionEvent,
  type ProbingQuestion,
} from '@interviewai/shared-types';
import { InterviewSessionEntity } from '../entities/interview-session.entity.js';
import { InterviewStageMachine } from './interview-stage.machine.js';
import { ContextInjectorService } from './context-injector.service.js';

export interface TurnOrchestrationResult {
  state: OrchestratorState;
  transition: OrchestratorTransitionEvent | null;
  systemInstruction: string;
}

@Injectable()
export class InterviewOrchestratorService {
  private readonly logger = new Logger(InterviewOrchestratorService.name);
  private readonly sessionStates = new Map<string, OrchestratorState>();

  constructor(
    @InjectRepository(InterviewSessionEntity)
    private readonly sessionRepo: Repository<InterviewSessionEntity>,
    private readonly contextInjector: ContextInjectorService,
  ) {}

  /**
   * Initialize or retrieve the orchestrator state for a session.
   */
  initSession(session: InterviewSessionEntity): OrchestratorState {
    const existing = this.sessionStates.get(session.id);
    if (existing) {
      return existing;
    }

    const durationSeconds = (session.durationMinutes || 30) * 60;
    const timeAllocations: Record<InterviewStage, number> = {
      [InterviewStage.GREETING]: Math.max(
        60,
        Math.round(durationSeconds * 0.05),
      ),
      [InterviewStage.PROBLEM_FRAMING]: Math.max(
        120,
        Math.round(durationSeconds * 0.15),
      ),
      [InterviewStage.PROBING]: Math.max(
        300,
        Math.round(durationSeconds * 0.45),
      ),
      [InterviewStage.DEEP_DIVE]: Math.max(
        180,
        Math.round(durationSeconds * 0.25),
      ),
      [InterviewStage.WRAP_UP]: Math.max(
        120,
        Math.round(durationSeconds * 0.1),
      ),
      [InterviewStage.CONCLUDED]: 0,
    };

    const expectedConcepts = session.currentQuestion?.expectedConcepts || [];
    const initialCovered = session.coveredConcepts || [];
    const remaining = expectedConcepts.filter(
      (c) => !initialCovered.includes(c),
    );

    const state: OrchestratorState = {
      sessionId: session.id,
      stage: session.currentStage || InterviewStage.GREETING,
      turnCount: 0,
      stageTurnCount: 0,
      stageStartedAt: Date.now(),
      coveredConcepts: [...initialCovered],
      remainingConcepts: remaining,
      activeProbingQuestion: null,
      timeAllocations,
      elapsedSeconds: 0,
    };

    this.sessionStates.set(session.id, state);
    this.logger.log(
      `Orchestrator initialized for session ${session.id} at stage [${state.stage}]`,
    );
    return state;
  }

  /**
   * Get the current state of an active session orchestrator.
   */
  getState(sessionId: string): OrchestratorState | null {
    return this.sessionStates.get(sessionId) ?? null;
  }

  /**
   * Clear orchestrator in-memory state for a concluded session to prevent memory leaks.
   */
  clearSession(sessionId: string): void {
    this.sessionStates.delete(sessionId);
    this.logger.debug(`Cleared orchestrator state for session ${sessionId}`);
  }

  /**
   * Check candidate transcript against safety and focus guardrails.
   */
  checkGuardrails(candidateText: string) {
    return this.contextInjector.checkGuardrails(candidateText);
  }

  /**
   * Build the initial system instruction for a session.
   */
  getInitialInstruction(session: InterviewSessionEntity): string {
    const state = this.initSession(session);
    return this.contextInjector.buildSystemInstruction({
      session,
      stage: state.stage,
      question: session.currentQuestion,
      coveredConcepts: state.coveredConcepts,
      remainingConcepts: state.remainingConcepts,
      activeProbing: state.activeProbingQuestion,
      remainingMinutes: session.durationMinutes,
    });
  }

  /**
   * Rebuild the current system instruction without advancing turn counters
   * (e.g., when editor code changes or tests execute).
   */
  buildCurrentInstruction(
    session: InterviewSessionEntity,
    activeCode?: {
      code: string;
      language: string;
      lastRunSummary?: string;
    } | null,
  ): string {
    const state = this.initSession(session);
    const totalDuration = (session.durationMinutes || 30) * 60;
    const totalElapsed = session.startedAt
      ? Math.round(
          (Date.now() - new Date(session.startedAt).getTime()) / 1000,
        )
      : state.elapsedSeconds;
    const remainingMinutes = Math.max(0, (totalDuration - totalElapsed) / 60);

    return this.contextInjector.buildSystemInstruction({
      session,
      stage: state.stage,
      question: session.currentQuestion,
      coveredConcepts: state.coveredConcepts,
      remainingConcepts: state.remainingConcepts,
      activeProbing: state.activeProbingQuestion,
      remainingMinutes,
      activeCode,
    });
  }

  /**
   * Process a candidate's turn: detect concept coverage, select probing branch,
   * evaluate stage advance, and inject new context instructions.
   */
  async processCandidateTurn(
    session: InterviewSessionEntity,
    candidateTranscript: string,
    activeCode?: {
      code: string;
      language: string;
      lastRunSummary?: string;
    } | null,
  ): Promise<TurnOrchestrationResult> {
    const state = this.initSession(session);
    state.turnCount += 1;
    state.stageTurnCount += 1;

    const now = Date.now();
    const stageElapsed = Math.round((now - state.stageStartedAt) / 1000);
    const totalElapsed = session.startedAt
      ? Math.round((now - new Date(session.startedAt).getTime()) / 1000)
      : state.turnCount * 30;
    state.elapsedSeconds = totalElapsed;

    // 1. Concept Coverage Detection
    this.detectConcepts(candidateTranscript, state);

    // 2. Select Probing Branch from Question Bank
    this.selectProbingBranch(session, state);

    // 3. Stage Advance Evaluation via State Machine
    const advanceEval = InterviewStageMachine.evaluateAdvance({
      currentStage: state.stage,
      stageTurnCount: state.stageTurnCount,
      totalTurnCount: state.turnCount,
      stageElapsedSeconds: stageElapsed,
      stageTimeAllocationSeconds: state.timeAllocations[state.stage] || 300,
      totalElapsedSeconds: totalElapsed,
      totalDurationSeconds: (session.durationMinutes || 30) * 60,
      coveredConceptsCount: state.coveredConcepts.length,
      totalExpectedConcepts:
        session.currentQuestion?.expectedConcepts?.length || 0,
    });

    let transition: OrchestratorTransitionEvent | null = null;

    if (advanceEval.shouldAdvance && advanceEval.nextStage !== state.stage) {
      const fromStage = state.stage;
      state.stage = advanceEval.nextStage;
      state.stageTurnCount = 0;
      state.stageStartedAt = now;

      transition = {
        fromStage,
        toStage: state.stage,
        reason: advanceEval.reason,
        timestamp: now,
      };

      this.logger.log(
        `[Session ${session.id}] Stage transition: ${fromStage} -> ${state.stage} (${advanceEval.reason})`,
      );

      // Persist stage in database
      session.currentStage = state.stage;
      session.coveredConcepts = state.coveredConcepts;
      await this.sessionRepo.save(session);
    }

    // 4. Calculate remaining duration
    const totalDuration = (session.durationMinutes || 30) * 60;
    const remainingMinutes = Math.max(0, (totalDuration - totalElapsed) / 60);

    // 5. Generate dynamically injected system instruction
    const systemInstruction = this.contextInjector.buildSystemInstruction({
      session,
      stage: state.stage,
      question: session.currentQuestion,
      coveredConcepts: state.coveredConcepts,
      remainingConcepts: state.remainingConcepts,
      activeProbing: state.activeProbingQuestion,
      remainingMinutes,
      activeCode,
    });

    return {
      state,
      transition,
      systemInstruction,
    };
  }

  private static readonly CONCEPT_STOP_WORDS = new Set([
    'for',
    'and',
    'the',
    'with',
    'when',
    'that',
    'from',
    'into',
    'using',
    'via',
    'both',
    'each',
    'all',
    'are',
    'was',
    'where',
    'without',
    'eliminate',
    'operations',
    'operation',
    'control',
    'handling',
    'avoiding',
    'checks',
    'check',
    'pointers',
    'nodes',
    'such',
    'than',
    'over',
    'under',
    'time',
    'space',
    'complexity',
  ]);

  private normalizeTechnicalText(raw: string): string {
    return raw
      .toLowerCase()
      .replace(/\bof\s+one\b|\bo\s+of\s+1\b|\border\s+of\s+(one|1)\b/g, 'o(1)')
      .replace(/\bo\s+of\s+n\b|\border\s+of\s+n\b/g, 'o(n)')
      .replace(/\bo\s+of\s+log\s+n\b|\border\s+of\s+log\s+n\b/g, 'o(log n)')
      .replace(/\bget\s+input\b/g, 'get and put')
      .replace(/\bhashmap\b/g, 'hash map')
      .replace(/\blinkedlist\b/g, 'linked list')
      .replace(/\bindegree\b/g, 'in-degree')
      .replace(/\bin\s+degree\b/g, 'in-degree')
      .replace(/[-_/,:;()]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Scans candidate transcript for technical concepts and moves them to covered.
   * Normalizes spoken STT variations (e.g. "o of one" -> "o 1", hyphenated phrases)
   * and evaluates core keyword coverage instead of rigid verbatim sentence matching.
   */
  private detectConcepts(transcript: string, state: OrchestratorState): void {
    if (!transcript || state.remainingConcepts.length === 0) return;

    const normalizedTranscript = this.normalizeTechnicalText(transcript);
    const newlyCovered: string[] = [];

    for (const concept of state.remainingConcepts) {
      const normalizedConcept = this.normalizeTechnicalText(concept);
      if (!normalizedConcept) continue;

      if (normalizedTranscript.includes(normalizedConcept)) {
        newlyCovered.push(concept);
        continue;
      }

      const coreWords = Array.from(
        new Set(
          normalizedConcept
            .split(/\s+/)
            .filter(
              (w) =>
                w.length > 2 &&
                !InterviewOrchestratorService.CONCEPT_STOP_WORDS.has(w),
            ),
        ),
      );

      if (coreWords.length === 0) continue;

      const matchedCount = coreWords.filter((w) =>
        normalizedTranscript.includes(w),
      ).length;

      if (coreWords.length <= 2 && matchedCount === coreWords.length) {
        newlyCovered.push(concept);
      } else if (
        coreWords.length >= 3 &&
        matchedCount >= Math.max(2, Math.ceil(coreWords.length * 0.55))
      ) {
        newlyCovered.push(concept);
      }
    }

    if (newlyCovered.length > 0) {
      state.coveredConcepts.push(...newlyCovered);
      state.remainingConcepts = state.remainingConcepts.filter(
        (c) => !newlyCovered.includes(c),
      );
      this.logger.debug(
        `Detected concepts [${newlyCovered.join(', ')}] in candidate transcript.`,
      );
    }
  }

  /**
   * Selects an appropriate probing question from the question graph based on current stage and coverage.
   */
  private selectProbingBranch(
    session: InterviewSessionEntity,
    state: OrchestratorState,
  ): void {
    const probingList: ProbingQuestion[] =
      session.currentQuestion?.probingQuestions || [];
    if (probingList.length === 0) {
      state.activeProbingQuestion = null;
      return;
    }

    // Prefer probes matching remaining concepts
    if (state.remainingConcepts.length > 0) {
      const nextRemaining = state.remainingConcepts[0].toLowerCase();
      const matchingProbe = probingList.find((p) =>
        p.targetConcept.toLowerCase().includes(nextRemaining),
      );
      if (matchingProbe) {
        state.activeProbingQuestion = matchingProbe;
        return;
      }
    }

    // Otherwise cycle through available probing questions based on turn count
    const index = (state.turnCount - 1) % probingList.length;
    state.activeProbingQuestion = probingList[index];
  }
}
