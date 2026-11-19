import { Injectable, Logger } from '@nestjs/common';
import { ProviderRegistryService } from '../ai/provider-registry.service.js';
import { ReasoningQuality } from '@interviewai/shared-types';

export interface ExtractedEvidenceData {
  technicalClaims: string[];
  correctConcepts: string[];
  incorrectConcepts: string[];
  missingConcepts: string[];
  reasoningQuality: ReasoningQuality;
  practicalExperience: boolean;
  confidence: number;
  notes: string;
}

@Injectable()
export class EvidenceExtractorService {
  private readonly logger = new Logger(EvidenceExtractorService.name);

  constructor(private readonly providerRegistry: ProviderRegistryService) {}

  /**
   * Extract verifiable evidence, technical claims, concept classifications,
   * reasoning quality, and practical depth from a candidate's answer.
   */
  async extractEvidence(params: {
    questionAsked: string;
    candidateAnswer: string;
    expectedConcepts?: string[];
    commonMisconceptions?: string[];
  }): Promise<ExtractedEvidenceData> {
    const {
      questionAsked,
      candidateAnswer,
      expectedConcepts = [],
      commonMisconceptions = [],
    } = params;

    // If answer is empty or too short / non-technical, return poor empty evidence
    const lower = candidateAnswer.trim().toLowerCase();
    const isTrivial =
      lower.length < 15 ||
      lower.includes("don't know") ||
      lower.includes('do not know') ||
      lower.includes('no idea');

    if (isTrivial) {
      return {
        technicalClaims: [],
        correctConcepts: [],
        incorrectConcepts: [],
        missingConcepts: [...expectedConcepts],
        reasoningQuality: ReasoningQuality.POOR,
        practicalExperience: false,
        confidence: 0.95,
        notes: 'Candidate provided insufficient or non-technical response.',
      };
    }

    try {
      const provider = this.providerRegistry.getActiveLlmProvider();
      if (provider && provider.name !== 'mock' && provider.isConfigured) {
        return await this.extractWithLlm(
          provider,
          questionAsked,
          candidateAnswer,
          expectedConcepts,
          commonMisconceptions,
        );
      }
    } catch (err) {
      this.logger.warn(
        `LLM evidence extraction failed, falling back to deterministic heuristic analyzer: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    // Deterministic fallback analyzer
    return this.extractWithHeuristics(
      questionAsked,
      candidateAnswer,
      expectedConcepts,
      commonMisconceptions,
    );
  }

  /**
   * Prompts the active LLM provider with structured JSON extraction constraints.
   */
  private async extractWithLlm(
    provider: any,
    questionAsked: string,
    candidateAnswer: string,
    expectedConcepts: string[],
    commonMisconceptions: string[],
  ): Promise<ExtractedEvidenceData> {
    const prompt = `You are an expert technical interview evaluator. Analyze the candidate's response to the interview question below. Extract objective evidence without hallucination.

Question Asked:
"${questionAsked}"

Expected Concepts:
${expectedConcepts.length ? expectedConcepts.map((c) => `- ${c}`).join('\n') : '(None specified)'}

Common Misconceptions:
${commonMisconceptions.length ? commonMisconceptions.map((m) => `- ${m}`).join('\n') : '(None specified)'}

Candidate Response:
"${candidateAnswer}"

Analyze the response strictly. Output a valid JSON object with the following schema:
{
  "technicalClaims": string[], // Distinct factual or technical statements asserted by the candidate
  "correctConcepts": string[], // Expected concepts that the candidate accurately addressed or explained
  "incorrectConcepts": string[], // Erroneous technical claims, fallacies, or misconceptions stated
  "missingConcepts": string[], // Expected concepts the candidate completely omitted
  "reasoningQuality": "poor" | "fair" | "good" | "excellent",
  "practicalExperience": boolean, // true if candidate demonstrates real-world production experience (trade-offs, failure modes, monitoring, scale), false if purely textbook recitation
  "confidence": number, // between 0.0 and 1.0
  "notes": string // concise evaluator notes explaining the assessment
}`;

    const res = await provider.generateText(prompt, {
      responseMimeType: 'application/json',
      temperature: 0.1,
    });

    const parsed = this.parseJsonSafe(res.text);
    if (parsed) {
      return {
        technicalClaims: Array.isArray(parsed.technicalClaims)
          ? parsed.technicalClaims
          : [],
        correctConcepts: Array.isArray(parsed.correctConcepts)
          ? parsed.correctConcepts
          : [],
        incorrectConcepts: Array.isArray(parsed.incorrectConcepts)
          ? parsed.incorrectConcepts
          : [],
        missingConcepts: Array.isArray(parsed.missingConcepts)
          ? parsed.missingConcepts
          : [],
        reasoningQuality: this.validateReasoningQuality(
          parsed.reasoningQuality,
        ),
        practicalExperience: Boolean(parsed.practicalExperience),
        confidence:
          typeof parsed.confidence === 'number'
            ? Math.min(1.0, Math.max(0.0, parsed.confidence))
            : 0.85,
        notes: typeof parsed.notes === 'string' ? parsed.notes : '',
      };
    }

    throw new Error('Failed to parse structured JSON from LLM response');
  }

  /**
   * Deterministic, high-fidelity heuristic extractor used in offline testing,
   * fallback environments, or mock provider execution.
   */
  extractWithHeuristics(
    questionAsked: string,
    candidateAnswer: string,
    expectedConcepts: string[],
    commonMisconceptions: string[],
  ): ExtractedEvidenceData {
    const normalizedAnswer = candidateAnswer.toLowerCase();

    // 1. Technical Claims Extraction: Split by sentence delimiters
    const sentences = candidateAnswer
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 15 && !s.toLowerCase().startsWith('hello'));
    const technicalClaims =
      sentences.length > 0 ? sentences.slice(0, 4) : [candidateAnswer.trim()];

    // 2. Correct Concepts vs Missing Concepts
    const correctConcepts: string[] = [];
    const missingConcepts: string[] = [];

    for (const concept of expectedConcepts) {
      if (this.fuzzyIncludes(normalizedAnswer, concept)) {
        correctConcepts.push(concept);
      } else {
        missingConcepts.push(concept);
      }
    }

    // 3. Incorrect Concepts Detection
    const incorrectConcepts: string[] = [];
    for (const misconception of commonMisconceptions) {
      if (this.fuzzyIncludes(normalizedAnswer, misconception)) {
        incorrectConcepts.push(misconception);
      }
    }

    // 4. Practical Experience Detection (SDE & SAP operational keywords)
    const practicalKeywords = [
      'production',
      'p99',
      'latency',
      'failover',
      'benchmark',
      'outage',
      'incident',
      'scale',
      'distributed',
      'cluster',
      'trade-off',
      'bottleneck',
      'cache stampede',
      'profiling',
      'memory leak',
      'deadlock',
      'throughput',
      'clean core',
      'acdoca',
      'universal journal',
      'fubr',
      'iflow',
      'bdef',
      'determination',
      'validation',
      'embedded steampunk',
      'btp',
      'event mesh',
      'cap',
      'amdp',
      'cds',
      'document splitting',
      'parallel ledger',
      'cvi',
      'but000',
      'vsr',
      'freight order',
    ];
    let practicalMatches = 0;
    for (const kw of practicalKeywords) {
      if (normalizedAnswer.includes(kw)) {
        practicalMatches++;
      }
    }
    const practicalExperience = practicalMatches >= 2;

    // 5. Reasoning Quality Determination
    const totalConcepts = expectedConcepts.length;
    const ratio =
      totalConcepts > 0 ? correctConcepts.length / totalConcepts : 0.5;

    let reasoningQuality: ReasoningQuality;
    if (incorrectConcepts.length > 0 && ratio < 0.4) {
      reasoningQuality = ReasoningQuality.POOR;
    } else if (ratio >= 0.75 && incorrectConcepts.length === 0) {
      reasoningQuality = ReasoningQuality.EXCELLENT;
    } else if (ratio >= 0.4 && incorrectConcepts.length === 0) {
      reasoningQuality = ReasoningQuality.GOOD;
    } else if (ratio >= 0.2) {
      reasoningQuality = ReasoningQuality.FAIR;
    } else {
      reasoningQuality = ReasoningQuality.POOR;
    }

    // 6. Notes synthesis
    let notes = `Identified ${correctConcepts.length}/${totalConcepts} expected concepts.`;
    if (practicalExperience) {
      notes += ' Candidate demonstrated practical operational awareness.';
    }
    if (incorrectConcepts.length > 0) {
      notes += ` Warning: ${incorrectConcepts.length} potential misconception(s) observed.`;
    }

    return {
      technicalClaims,
      correctConcepts,
      incorrectConcepts,
      missingConcepts,
      reasoningQuality,
      practicalExperience,
      confidence: 0.9,
      notes,
    };
  }

  private fuzzyIncludes(text: string, concept: string): boolean {
    const conceptLower = concept.toLowerCase();
    if (text.includes(conceptLower)) return true;

    // Token match: check if key nouns/verbs of concept appear
    const tokens = conceptLower
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(
        (t) =>
          t.length > 3 &&
          !['with', 'from', 'both', 'over', 'into', 'that', 'using'].includes(
            t,
          ),
      );

    if (tokens.length === 0) return false;
    const matchedTokens = tokens.filter((t) => text.includes(t));
    return matchedTokens.length / tokens.length >= 0.5;
  }

  private parseJsonSafe(text: string): Record<string, any> | null {
    try {
      return JSON.parse(text);
    } catch {
      // Strip markdown codeblock if present
      const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (match && match[1]) {
        try {
          return JSON.parse(match[1]);
        } catch {
          return null;
        }
      }
      return null;
    }
  }

  private validateReasoningQuality(val: any): ReasoningQuality {
    switch (val) {
      case 'poor':
      case ReasoningQuality.POOR:
        return ReasoningQuality.POOR;
      case 'fair':
      case ReasoningQuality.FAIR:
        return ReasoningQuality.FAIR;
      case 'good':
      case ReasoningQuality.GOOD:
        return ReasoningQuality.GOOD;
      case 'excellent':
      case ReasoningQuality.EXCELLENT:
        return ReasoningQuality.EXCELLENT;
      default:
        return ReasoningQuality.FAIR;
    }
  }
}
