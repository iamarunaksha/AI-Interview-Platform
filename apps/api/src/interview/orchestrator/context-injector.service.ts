import { Injectable } from '@nestjs/common';
import {
  InterviewStage,
  InterviewMode,
  InterviewerPersonality,
  ProfessionalDomain,
  ExperienceLevel,
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
  activeCode?: { code: string; language: string } | null;
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
      activeCode,
    } = params;

    const isSap =
      session.domain === ProfessionalDomain.SAP ||
      question?.domain === ProfessionalDomain.SAP;

    const isSystemDesign =
      question?.competency?.slug === 'sde_system_design' ||
      Boolean(
        question?.title?.toLowerCase().includes('rate limiter') ||
        question?.title?.toLowerCase().includes('consistent hashing') ||
        question?.title?.toLowerCase().includes('distributed') ||
        question?.title?.toLowerCase().includes('system design'),
      );

    const isDsa =
      !isSap &&
      !isSystemDesign &&
      (question?.competency?.slug === 'sde_dsa_problem_solving' ||
        Boolean(
          question?.title?.toLowerCase().includes('two sum') ||
          question?.title?.toLowerCase().includes('ancestor') ||
          question?.title?.toLowerCase().includes('parenthes') ||
          question?.title?.toLowerCase().includes('substring') ||
          question?.title?.toLowerCase().includes('merge k') ||
          question?.title?.toLowerCase().includes('course schedule') ||
          question?.title?.toLowerCase().includes('lru'),
        ) ||
        (!question &&
          (session.experienceLevel === ExperienceLevel.FRESHER ||
            session.experienceLevel === ExperienceLevel.SDE_1)));

    const roleProfile = isSap
      ? `You are a Senior SAP Enterprise Solutions Architect & Practice Director conducting an authentic, collaborative technical interview for a ${session.experienceLevel} candidate targeting the enterprise role of "${session.targetRole}". You speak like an experienced enterprise advisor: warm, professional, grounded in real-world business transformation scenarios, and interested in enterprise stability, scalability, and Clean Core trade-offs.`
      : isDsa
        ? `You are a Senior Software Engineer at a top-tier FAANG company (Google/Meta/Amazon) conducting a live 45-minute Data Structures & Algorithms (DSA) technical coding interview for a ${session.experienceLevel} candidate targeting the role of "${session.targetRole}". You speak like a real senior engineer: collaborative, encouraging clear problem breakdown, attentive to Big-O time and space complexity, welcoming clarifying questions about constraints, and guiding the candidate through the code editor rather than acting like a robotic quiz proctor.`
        : `You are a Principal Engineering Interviewer conducting a live adaptive systems architecture interview for a ${session.experienceLevel} candidate targeting the role of "${session.targetRole}".`;

    const sapDirective = isSap
      ? `SAP Enterprise Architecture & Clean Core Advisory Directives:
1. Scenario-Based Framing: Ground every discussion in real-world business realities (e.g., enterprise S/4HANA migration, global supply chain disruptions, high-volume financial close, legacy custom code modernization).
2. Natural, Advisory Demeanor: Do not sound like an automated multiple-choice quiz. Speak like a senior practice director in an architecture review: collaborative, discerning, and focused on business value, system stability, and enterprise scale.
3. Enforce SAP Clean Core Governance: Strongly evaluate candidates against Key User Extensibility (Tier 1), Developer Extensibility / Embedded Steampunk via ABAP Cloud with released C1 APIs (Tier 2), and Side-by-Side BTP services (Tier 3). Reject core modifications.
4. Transactional & LUW Integrity: Verify deep understanding of the SAP Logical Unit of Work. In ABAP RAP, ensure candidate understands why calling COMMIT WORK inside determinations/actions triggers runtime dump DYN_CALL_ILLEGAL_COMMIT, and that the RAP transaction manager handles the save sequence.
5. Modern S/4HANA Architecture: Probe knowledge of the Universal Journal (ACDOCA) vs legacy BSEG, Business Partner (BUT000 / CVI) vs KNA1/LFA1, and CDS View code-to-data pushdown on SAP HANA.
6. Cloud & Integration Standards: Enforce resilient integration patterns (CPI iFlows, Idempotent Receivers, SAP Event Mesh, Cloud Connector) over fragile point-to-point RFC connections.`
      : isDsa
        ? `FAANG Data Structures & Algorithms (DSA) Interview Directives:
1. Follow the Real FAANG Coding Interview Lifecycle:
   a. Clarifying Questions: Encourage candidate to ask about constraints (array size N, integer bounds, negative numbers, duplicates, memory limits).
   b. Approach & Complexity Before Coding: Make sure the candidate states their proposed data structure and Big-O Time & Auxiliary Space complexity BEFORE diving into code.
   c. Interactive Implementation: Invite candidate to write their solution in the code editor while thinking out loud.
   d. Dry Run & Verification: Ask candidate to walk through a concrete test case step-by-step to verify pointer/map states.
   e. Edge Cases & Optimization: Challenge on corner cases (empty inputs, single element, duplicates, large inputs) and follow-up trade-offs (e.g. O(1) in-place vs O(N) space).
2. Collaborative, Colleague-Like Tone: Speak concisely (2 to 4 sentences at a time). Sound like a supportive teammate assessing problem-solving ability.`
        : '';

    const personalityDirective = this.getPersonalityDirective(
      session.personality,
    );
    const modeDirective = this.getModeDirective(session.mode);
    const stageDirective = this.getStageDirective(
      stage,
      question,
      remainingConcepts,
      activeProbing,
      isSap,
      isDsa,
    );

    const resumeDirective =
      session.resumeSummary && session.resumeSummary.trim().length > 0
        ? `Candidate Resume & Background Context:
"""
${session.resumeSummary.slice(0, 1500)}
"""
Resume-Driven Customization Directives:
1. Reference the candidate's real-world projects and technical stack when evaluating their answers.
2. Probe into the architectural choices, scalability challenges, and failure modes of the systems they claim to have built.`
        : '';

    const codeContext =
      activeCode && activeCode.code.trim().length > 0
        ? `Candidate Live Code Buffer (${activeCode.language}):
\`\`\`${activeCode.language}
${activeCode.code.slice(0, 1500)}
\`\`\`
Note: The candidate is actively editing this code in their coding environment. Reference their variables, algorithmic structure, edge cases, and time/space complexity where appropriate.`
        : '';

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
      resumeDirective,
      sapDirective,
      personalityDirective,
      modeDirective,
      stageDirective,
      codeContext,
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
    isSap = false,
    isDsa = false,
  ): string {
    switch (stage) {
      case InterviewStage.GREETING:
        return `Current Stage: GREETING & EXPECTATIONS SETTING.
Your immediate task:
- Warmly greet the candidate and welcome them to their interview.
- Introduce yourself as Alex.
- Briefly mention the format (e.g. ${
          isSap
            ? '"Today we will be walking through an enterprise architecture and modernization scenario, focusing on S/4HANA core processes, Clean Core extensibility, and cloud integration."'
            : isDsa
              ? '"Today we will be working through a 45-minute Data Structures & Algorithms coding challenge. We\'ll collaborate in the code editor, and I want to see how you break down problems, analyze trade-offs, and implement clean code."'
              : '"Today we will be diving into system design and architecture concepts."'
        }).
- Ask them how they are doing and if they are ready to begin.
- DO NOT reveal or ask the technical problem yet!`;

      case InterviewStage.PROBLEM_FRAMING:
        if (!question) {
          return `Current Stage: PROBLEM FRAMING.
Introduce an architectural or algorithmic challenge suitable for the role. Ask the candidate to walk through their initial high-level approach.`;
        }
        if (isDsa) {
          return `Current Stage: PROBLEM FRAMING (ALGORITHMIC CHALLENGE & CLARIFICATION).
Present the following algorithmic challenge to the candidate:
Problem Title: "${question.title}"
Problem Statement: "${question.stem}"
Guidelines:
1. Encourage the candidate to ask any clarifying questions about the inputs, constraints (e.g. array length N, integer bounds, negative numbers, duplicates), or return format.
2. Ask them to explain their high-level approach and state their target Time Complexity and Auxiliary Space Complexity (Big-O) BEFORE writing code.`;
        }
        if (isSap) {
          return `Current Stage: PROBLEM FRAMING (ENTERPRISE SCENARIO FRAMING).
Present the enterprise modernization scenario to the candidate:
Scenario Title: "${question.title}"
Scenario Details: "${question.stem}"
Guidelines:
1. Frame this as a real-world enterprise transformation project (e.g., migrating an enterprise client from ECC to S/4HANA Cloud while eliminating legacy core modifications).
2. Ask the candidate how they would advise the client's architecture board and structure the target solution while strictly adhering to SAP Clean Core standards.`;
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

        if (isDsa) {
          return `Current Stage: TECHNICAL PROBING & CONCEPT VERIFICATION (ALGORITHMIC FOCUS).
Focus on verifying the candidate's algorithmic reasoning and coding approach:
${probeHint}
1. If the candidate has not yet started writing code in the editor, invite them to start implementing their solution while thinking out loud.
2. Probe into why they selected their specific data structure (e.g. hash map vs two pointers, stack vs queue, heap vs sort).
3. Verify time and space complexity: ask how their choice prevents Time Limit Exceeded (TLE) or excessive memory usage.`;
        }

        if (isSap) {
          return `Current Stage: TECHNICAL PROBING & CONCEPT VERIFICATION (ENTERPRISE ARCHITECTURE).
Engage in deep consultative dialogue:
${probeHint}
1. Probe into transactional integrity (SAP LUW, BDEF determinations vs validations, strictly avoiding COMMIT WORK in RAP).
2. Verify code pushdown to SAP HANA in CDS views and discuss associations vs joins.
3. Contrast modern Cloud Integration (CPI iFlows with idempotent receivers) against legacy point-to-point RFCs.`;
        }

        return `Current Stage: TECHNICAL PROBING & CONCEPT VERIFICATION.
Focus on verifying architectural fundamentals and core trade-offs.
${probeHint}
Listen carefully to what they say, identify any superficial claims, and ask them to explain "why" they chose that approach over alternatives.`;
      }

      case InterviewStage.DEEP_DIVE:
        if (isDsa) {
          return `Current Stage: DRY RUN, EDGE CASES & SCALE STRESS TESTING.
Push the candidate's code and algorithmic logic to its limits:
1. Ask the candidate to dry run their solution with a concrete test case, tracing variables and pointer states step-by-step.
2. Probe critical edge cases: empty input, single element, negative numbers, duplicates, and extreme sizes (N = 10^5).
3. If their solution requires O(N) auxiliary space, ask if it is possible to optimize down to O(1) in-place, or discuss cache locality.`;
        }
        if (isSap) {
          return `Current Stage: DEEP DIVE & ENTERPRISE STRESS TESTING.
Push the candidate's SAP architecture to its operational limits:
1. Ask about high-volume transactional throughput (millions of ACDOCA postings, batch iFlows, delta buffer locking).
2. Ask how their design handles rollbacks, exception subprocesses, and SAP LUW integrity without corrupting financial or logistics records.
3. Challenge them on Clean Core upgrade compliance when standard released APIs are unavailable.`;
        }
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
