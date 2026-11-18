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
   * Process a candidate's turn: detect concept coverage, select probing branch,
   * evaluate stage advance, and inject new context instructions.
   */
  async processCandidateTurn(
    session: InterviewSessionEntity,
    candidateTranscript: string,
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
    });

    return {
      state,
      transition,
      systemInstruction,
    };
  }

  /**
   * Scans candidate transcript for technical concepts and moves them to covered.
   */
  private detectConcepts(transcript: string, state: OrchestratorState): void {
    if (!transcript || state.remainingConcepts.length === 0) return;

    const lowerTranscript = transcript.toLowerCase();
    const newlyCovered: string[] = [];

    for (const concept of state.remainingConcepts) {
      const lowerConcept = concept.toLowerCase();
      // Token-boundary or substring check
      if (lowerTranscript.includes(lowerConcept)) {
        newlyCovered.push(concept);
      } else {
        // Multi-word fuzzy match: if all significant words are present in transcript
        const words = lowerConcept.split(/\s+/).filter((w) => w.length > 2);
        if (
          words.length > 1 &&
          words.every((w) => lowerTranscript.includes(w))
        ) {
          newlyCovered.push(concept);
        }
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
