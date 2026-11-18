import { InterviewStage } from '@interviewai/shared-types';

export interface StageEvaluationInput {
  currentStage: InterviewStage;
  stageTurnCount: number;
  totalTurnCount: number;
  stageElapsedSeconds: number;
  stageTimeAllocationSeconds: number;
  totalElapsedSeconds: number;
  totalDurationSeconds: number;
  coveredConceptsCount: number;
  totalExpectedConcepts: number;
  candidateConfirmedUnderstanding?: boolean;
}

export interface StageAdvanceResult {
  shouldAdvance: boolean;
  nextStage: InterviewStage;
  reason: string;
}

/**
 * Deterministic Finite State Machine (FSM) for Interview Progression.
 *
 * Enforces structured interview governance:
 * GREETING -> PROBLEM_FRAMING -> PROBING -> DEEP_DIVE -> WRAP_UP -> CONCLUDED
 */
export class InterviewStageMachine {
  private static readonly VALID_TRANSITIONS: Record<
    InterviewStage,
    InterviewStage[]
  > = {
    [InterviewStage.GREETING]: [InterviewStage.PROBLEM_FRAMING],
    [InterviewStage.PROBLEM_FRAMING]: [
      InterviewStage.PROBING,
      InterviewStage.WRAP_UP,
    ],
    [InterviewStage.PROBING]: [
      InterviewStage.DEEP_DIVE,
      InterviewStage.WRAP_UP,
    ],
    [InterviewStage.DEEP_DIVE]: [InterviewStage.WRAP_UP],
    [InterviewStage.WRAP_UP]: [InterviewStage.CONCLUDED],
    [InterviewStage.CONCLUDED]: [],
  };

  /**
   * Check if a transition between two stages is valid in the state graph.
   */
  static isValidTransition(from: InterviewStage, to: InterviewStage): boolean {
    const allowed = this.VALID_TRANSITIONS[from];
    return allowed ? allowed.includes(to) : false;
  }

  /**
   * Get the standard linear next stage.
   */
  static getNextLinearStage(current: InterviewStage): InterviewStage {
    switch (current) {
      case InterviewStage.GREETING:
        return InterviewStage.PROBLEM_FRAMING;
      case InterviewStage.PROBLEM_FRAMING:
        return InterviewStage.PROBING;
      case InterviewStage.PROBING:
        return InterviewStage.DEEP_DIVE;
      case InterviewStage.DEEP_DIVE:
        return InterviewStage.WRAP_UP;
      case InterviewStage.WRAP_UP:
      case InterviewStage.CONCLUDED:
        return InterviewStage.CONCLUDED;
    }
  }

  /**
   * Evaluate whether the interview should advance to the next stage based on
   * turn counts, concept coverage, and elapsed time budgets.
   */
  static evaluateAdvance(input: StageEvaluationInput): StageAdvanceResult {
    const {
      currentStage,
      stageTurnCount,
      stageElapsedSeconds,
      stageTimeAllocationSeconds,
      totalElapsedSeconds,
      totalDurationSeconds,
      coveredConceptsCount,
      totalExpectedConcepts,
    } = input;

    if (currentStage === InterviewStage.CONCLUDED) {
      return {
        shouldAdvance: false,
        nextStage: InterviewStage.CONCLUDED,
        reason: 'Interview is already concluded.',
      };
    }

    // Global Time Budget Override: If > 88% of total duration has elapsed, jump straight to WRAP_UP
    const globalRatio =
      totalDurationSeconds > 0 ? totalElapsedSeconds / totalDurationSeconds : 0;

    if (globalRatio >= 0.88 && currentStage !== InterviewStage.WRAP_UP) {
      return {
        shouldAdvance: true,
        nextStage: InterviewStage.WRAP_UP,
        reason: `Global time budget nearly exhausted (${Math.round(globalRatio * 100)}% elapsed). Transitioning to Wrap-Up.`,
      };
    }

    switch (currentStage) {
      case InterviewStage.GREETING:
        // Transition after 1 candidate greeting response or after 60 seconds
        if (
          stageTurnCount >= 1 ||
          stageElapsedSeconds >= stageTimeAllocationSeconds
        ) {
          return {
            shouldAdvance: true,
            nextStage: InterviewStage.PROBLEM_FRAMING,
            reason:
              'Greeting completed. Proceeding to introduce problem framing.',
          };
        }
        break;

      case InterviewStage.PROBLEM_FRAMING:
        // Transition after 2 candidate turns or when candidate starts outlining their architecture
        if (
          stageTurnCount >= 2 ||
          stageElapsedSeconds >= stageTimeAllocationSeconds
        ) {
          return {
            shouldAdvance: true,
            nextStage: InterviewStage.PROBING,
            reason:
              'Problem framed and candidate acknowledged. Transitioning to technical probing.',
          };
        }
        break;

      case InterviewStage.PROBING: {
        // Transition when at least 50% of concepts are addressed or 4 turns reached
        const coverageRatio =
          totalExpectedConcepts > 0
            ? coveredConceptsCount / totalExpectedConcepts
            : 0;

        if (
          coverageRatio >= 0.5 ||
          stageTurnCount >= 4 ||
          stageElapsedSeconds >= stageTimeAllocationSeconds
        ) {
          return {
            shouldAdvance: true,
            nextStage: InterviewStage.DEEP_DIVE,
            reason: `Core probing completed (${coveredConceptsCount}/${totalExpectedConcepts} concepts addressed). Initiating deep dive into edge cases and scale.`,
          };
        }
        break;
      }

      case InterviewStage.DEEP_DIVE:
        // Transition after 3 deep dive turns or when time allocation is exhausted
        if (
          stageTurnCount >= 3 ||
          stageElapsedSeconds >= stageTimeAllocationSeconds
        ) {
          return {
            shouldAdvance: true,
            nextStage: InterviewStage.WRAP_UP,
            reason:
              'Deep dive completed. Transitioning to wrap-up and candidate questions.',
          };
        }
        break;

      case InterviewStage.WRAP_UP:
        // Transition when wrap-up turns or time is reached
        if (
          stageTurnCount >= 2 ||
          stageElapsedSeconds >= stageTimeAllocationSeconds
        ) {
          return {
            shouldAdvance: true,
            nextStage: InterviewStage.CONCLUDED,
            reason: 'Interview session concluded.',
          };
        }
        break;
    }

    return {
      shouldAdvance: false,
      nextStage: currentStage,
      reason: 'Stage criteria in progress.',
    };
  }
}
