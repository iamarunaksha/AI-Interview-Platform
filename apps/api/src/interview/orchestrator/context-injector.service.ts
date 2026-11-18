import { Injectable } from '@nestjs/common';
import {
  InterviewStage,
  InterviewMode,
  InterviewerPersonality,
  type ProbingQuestion,
} from '@interviewai/shared-types';
import type { InterviewSessionEntity } from '../entities/interview-session.entity.js';
import type { Question } from '../../tracks/entities/question.entity.js';

export interface ContextInjectionParams {
  session: InterviewSessionEntity;
  stage: InterviewStage;
  question: Question | null;
  coveredConcepts: string[];
  remainingConcepts: string[];
  activeProbing?: ProbingQuestion | null;
  remainingMinutes?: number;
}

@Injectable()
export class ContextInjectorService {
  /**
   * Build targeted system instruction for the AI Realtime / LLM provider
   * calibrated strictly to the current interview stage and candidate context.
   */
  buildSystemInstruction(params: ContextInjectionParams): string {
    const {
      session,
      stage,
      question,
      coveredConcepts,
      remainingConcepts,
      activeProbing,
      remainingMinutes,
    } = params;

    const roleProfile = `You are a Principal Engineering Interviewer conducting a live adaptive interview for a ${session.experienceLevel} candidate targeting the role of "${session.targetRole}".`;

    const personalityDirective = this.getPersonalityDirective(
      session.personality,
    );
    const modeDirective = this.getModeDirective(session.mode);
    const stageDirective = this.getStageDirective(
      stage,
      question,
      remainingConcepts,
      activeProbing,
    );

    const timingConstraint =
      remainingMinutes !== undefined
        ? `Timing: Approximately ${Math.max(1, Math.round(remainingMinutes))} minutes remaining in this interview.`
        : '';

    const conceptsSummary =
      question && question.expectedConcepts.length > 0
        ? `Rubric Competencies:
- Covered so far: [${coveredConcepts.length > 0 ? coveredConcepts.join(', ') : 'None yet'}]
- Remaining to probe: [${remainingConcepts.length > 0 ? remainingConcepts.join(', ') : 'All addressed'}]`
        : '';

    return [
      roleProfile,
      personalityDirective,
      modeDirective,
      stageDirective,
      conceptsSummary,
      timingConstraint,
      `Core Ground Rules:
1. Speak concisely in 2 to 4 sentences at a time. This is a conversational voice interview, NOT a monologue.
2. Never give the answer away or say "that's correct, the answer is...". Instead probe deeper.
3. Keep the conversation natural, engaging, and focused on verifying technical competence.`,
    ]
      .filter(Boolean)
      .join('\n\n');
  }

  private getPersonalityDirective(personality: InterviewerPersonality): string {
    switch (personality) {
      case InterviewerPersonality.FRIENDLY:
        return 'Interviewer Style: Warm, supportive, and conversational. Make the candidate feel comfortable while remaining discerning on technical depth.';
      case InterviewerPersonality.STRICT:
        return 'Interviewer Style: Direct, skeptical, and rigorous. Demand specific algorithmic complexity, concrete metrics, and robust failure recovery strategies.';
      case InterviewerPersonality.PROFESSIONAL:
      default:
        return 'Interviewer Style: Professional, structured, and objective. Maintain a balanced corporate tech-lead demeanor.';
    }
  }

  private getModeDirective(mode: InterviewMode): string {
    switch (mode) {
      case InterviewMode.ASSESSMENT:
        return 'Interview Policy: Formal Assessment. Do not provide hints or confirm whether answers are right or wrong. Evaluate candidate performance neutrally.';
      case InterviewMode.LEARNING:
        return 'Interview Policy: Learning & Mentorship. Use Socratic questioning. If the candidate misses an edge case, gently nudge them with a guiding question.';
      case InterviewMode.PRACTICE:
      default:
        return 'Interview Policy: Realistic Practice. Provide a genuine FAANG/enterprise interview experience with authentic follow-ups and realistic pressure.';
    }
  }

  private getStageDirective(
    stage: InterviewStage,
    question: Question | null,
    remainingConcepts: string[],
    activeProbing?: ProbingQuestion | null,
  ): string {
    switch (stage) {
      case InterviewStage.GREETING:
        return `Current Stage: GREETING & EXPECTATIONS SETTING.
Your immediate task:
- Warmly greet the candidate by welcoming them to their interview.
- Briefly mention the format (e.g. "We will be diving into system design and architecture concepts today").
- Ask them if they are ready to begin.
- DO NOT reveal or ask the technical problem yet!`;

      case InterviewStage.PROBLEM_FRAMING:
        if (!question) {
          return `Current Stage: PROBLEM FRAMING.
Introduce an architectural challenge suitable for the role. Ask the candidate to walk through their initial high-level approach.`;
        }
        return `Current Stage: PROBLEM FRAMING.
Present the following technical challenge to the candidate:
Problem Title: "${question.title}"
Problem Statement: "${question.stem}"
Ask the candidate to explain their high-level design and clarify any scope or functional assumptions before diving into implementation details.`;

      case InterviewStage.PROBING: {
        const probeHint = activeProbing
          ? `Specific Probing Objective: "${activeProbing.probeText}" (Testing: ${activeProbing.targetConcept})`
          : remainingConcepts.length > 0
            ? `Target Next Concept: Formulate a probing question to evaluate the candidate's understanding of "${remainingConcepts[0]}".`
            : 'Probe deeper into the trade-offs of their proposed solution.';

        return `Current Stage: TECHNICAL PROBING & CONCEPT VERIFICATION.
Focus on verifying architectural fundamentals and core trade-offs.
${probeHint}
Listen carefully to what they say, identify any superficial claims, and ask them to explain "why" they chose that approach over alternatives.`;
      }

      case InterviewStage.DEEP_DIVE:
        return `Current Stage: DEEP DIVE & EDGE CASE STRESS TESTING.
Push the candidate's design to its limits:
- Ask about high concurrency, race conditions, distributed locking, or network partitions.
- Ask how the system recovers when downstream nodes crash or databases experience replication lag.
- Probe time and space complexity at 100x scale.`;

      case InterviewStage.WRAP_UP:
        return `Current Stage: WRAP-UP & CLOSING.
Acknowledge the discussion constructively.
Summarize that we've covered the key architectural areas.
Ask the candidate if they have any questions for you about the role, technology stack, or engineering culture.
Provide a warm, professional farewell.`;

      case InterviewStage.CONCLUDED:
        return `Current Stage: INTERVIEW CONCLUDED.
Thank the candidate and indicate that the session has concluded.`;
    }
  }
}
