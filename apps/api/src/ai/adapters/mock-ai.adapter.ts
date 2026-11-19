import { Injectable, Logger } from '@nestjs/common';
import type { ILlmProvider } from '../interfaces/llm-provider.interface.js';
import type {
  IRealtimeVoiceProvider,
  IRealtimeSession,
  RealtimeSessionConfig,
} from '../interfaces/realtime-provider.interface.js';
import type {
  IEvaluationProvider,
  EvaluationSessionInput,
} from '../interfaces/evaluation-provider.interface.js';
import {
  type ChatMessage,
  type LlmGenerateOptions,
  type LlmGenerateResult,
  type ConversationEvent,
  type InterviewReport,
  InterviewDifficulty,
  EvaluationRating,
  ProfessionalDomain,
} from '@interviewai/shared-types';

/**
 * MockAiAdapter — high-fidelity local simulator for development & testing.
 *
 * Implements:
 * - ILlmProvider
 * - IRealtimeVoiceProvider
 * - IEvaluationProvider
 *
 * Guarantees the platform is 100% testable and runnable offline
 * without requiring live API keys or incurring provider costs.
 */
@Injectable()
export class MockAiAdapter
  implements ILlmProvider, IRealtimeVoiceProvider, IEvaluationProvider
{
  private readonly logger = new Logger(MockAiAdapter.name);

  readonly name = 'mock';
  readonly modelName = 'mock-v1';
  readonly isConfigured = true;

  async testConnection(): Promise<boolean> {
    return true;
  }

  // ── ILlmProvider implementation ──────────────────────────

  async generateText(
    prompt: string,
    options?: LlmGenerateOptions,
  ): Promise<LlmGenerateResult> {
    this.logger.debug(
      `[MockLLM] generateText called with prompt length: ${prompt.length}`,
    );

    // If options specify JSON output, return a valid JSON string
    if (options?.responseMimeType === 'application/json') {
      return {
        text: JSON.stringify({
          acknowledged: true,
          mode: 'mock',
          analysis: 'Mock response generated successfully',
          followUpQuestion:
            'How would you scale this design to 10 million daily active users?',
        }),
        finishReason: 'STOP',
        modelName: this.modelName,
        usage: { promptTokens: 25, completionTokens: 40, totalTokens: 65 },
      };
    }

    return {
      text: `That is a solid technical explanation. Let us explore the time and space complexity trade-offs, and consider how your solution handles edge cases and scale.`,
      finishReason: 'STOP',
      modelName: this.modelName,
      usage: { promptTokens: 30, completionTokens: 35, totalTokens: 65 },
    };
  }

  async generateChat(
    messages: ChatMessage[],
    options?: LlmGenerateOptions,
  ): Promise<LlmGenerateResult> {
    const lastUserMessage =
      [...messages].reverse().find((m) => m.role === 'user')?.content ?? '';
    return this.generateText(lastUserMessage, options);
  }

  async *streamChat(
    _messages: ChatMessage[],
    _options?: LlmGenerateOptions,
  ): AsyncIterable<string> {
    const tokens = [
      'That ',
      'is ',
      'a ',
      'very ',
      'good ',
      'point ',
      'about ',
      'distributed ',
      'locking. ',
      'How ',
      'would ',
      'you ',
      'handle ',
      'clock ',
      'skew?',
    ];

    for (const token of tokens) {
      await new Promise((r) => setTimeout(r, 20));
      yield token;
    }
  }

  // ── IRealtimeVoiceProvider implementation ────────────────

  async createSession(
    config: RealtimeSessionConfig,
  ): Promise<IRealtimeSession> {
    this.logger.debug(
      `[MockRealtime] Creating adaptive realtime session for ${config.sessionId}`,
    );
    return new MockRealtimeSession(config);
  }

  // ── IEvaluationProvider implementation ───────────────────

  async evaluateSession(
    input: EvaluationSessionInput,
  ): Promise<InterviewReport> {
    this.logger.debug(`[MockEvaluation] Evaluating session ${input.sessionId}`);

    const isSap = input.domain === ProfessionalDomain.SAP;

    const competencyScores = input.competencies.map((comp) => ({
      competencyId: comp.id,
      competencyName: comp.name,
      score: 3,
      rating: EvaluationRating.PROFICIENT,
      justification: isSap
        ? `Demonstrated solid architectural mastery of ${comp.name} adhering to enterprise Clean Core standards.`
        : `Demonstrated clear understanding of core concepts in ${comp.name} during the session discussion.`,
      sufficientEvidence: true,
    }));

    if (isSap) {
      return {
        id: `eval-${Date.now()}`,
        sessionId: input.sessionId,
        overallScore: 3.3,
        overallRating: EvaluationRating.PROFICIENT,
        summary: `Candidate demonstrated solid enterprise SAP architectural fundamentals and clean core discipline appropriate for ${input.targetRole} (${input.experienceLevel}). Accurately explained transactional buffers, Universal Journal integration, and extensibility boundaries.`,
        competencyScores,
        strengths: [
          'Strong adherence to SAP Clean Core strategy avoiding classic core modifications',
          'Sound understanding of S/4HANA Universal Journal (ACDOCA) and multi-ledger financial reconciliation',
          'Accurate explanation of transactional boundaries, behavior definitions (BDEF), and SAP LUW save sequence',
        ],
        weaknesses: [
          'Could provide deeper analysis of SAP Event Mesh broker federation and consumer backpressure',
          'Opportunity to specify exact CDS access control (DCL) authorization aspects for analytical queries',
        ],
        incorrectStatements: [],
        areasNotAssessed: [
          'SAP BTP Private Link Service and hybrid VPN peering',
        ],
        recommendations: [
          'Review SAP Cloud Integration (CPI) JMS transaction boundaries and dead-letter queue escalation',
          'Practice configuring ABAP Test Cockpit (ATC) with Clean Core variant for automated code governance',
        ],
        suggestedNextDifficulty: InterviewDifficulty.HARD,
        generatedAt: new Date().toISOString(),
      };
    }

    return {
      id: `eval-${Date.now()}`,
      sessionId: input.sessionId,
      overallScore: 3.2,
      overallRating: EvaluationRating.PROFICIENT,
      summary: `Candidate demonstrated solid technical fundamentals and structured reasoning appropriate for ${input.targetRole} (${input.experienceLevel}). Handled follow-up edge cases well.`,
      competencyScores,
      strengths: [
        'Clear articulation of concurrency trade-offs',
        'Structured thought process when clarifying constraints',
        'Accurate analysis of data structure complexity',
      ],
      weaknesses: [
        'Could go deeper into network failure modes and recovery procedures',
        'Opportunity to provide more concrete metrics on capacity sizing',
      ],
      incorrectStatements: [],
      areasNotAssessed: ['Database failover multi-region replication'],
      recommendations: [
        'Practice designing distributed consensus algorithms (Raft/Paxos)',
        'Review read-repair and hint-handoff patterns in partitioned databases',
      ],
      suggestedNextDifficulty: InterviewDifficulty.HARD,
      generatedAt: new Date().toISOString(),
    };
  }
}

class MockRealtimeSession implements IRealtimeSession {
  private eventHandlers: Array<(event: ConversationEvent) => void> = [];
  private isAssistantSpeaking = false;
  private turnCount = 0;
  private lastTurnTimestamp = 0;

  constructor(private readonly config: RealtimeSessionConfig) {
    // Emit session.ready after tick
    setTimeout(() => {
      this.emit({ type: 'session.ready', timestamp: Date.now() });
    }, 10);
  }

  get sessionId(): string {
    return this.config.sessionId;
  }

  async sendAudio(_pcmChunk: Buffer | Uint8Array): Promise<void> {
    // Only track audio activity. Candidate spoken transcripts are handled via client-side SpeechRecognition and sent through sendText.
    return;
  }

  async sendText(text: string): Promise<void> {
    const now = Date.now();
    this.lastTurnTimestamp = now;
    this.isAssistantSpeaking = true;
    this.emit({ type: 'assistant.response.started', timestamp: now });

    this.turnCount++;

    let replyText = '';

    // 1. If an external LLM provider (e.g. Gemini) is configured and active, try generating with LLM
    if (
      this.config.llmProvider &&
      this.config.llmProvider.name !== 'mock' &&
      this.config.llmProvider.isConfigured
    ) {
      try {
        const history: ChatMessage[] = (
          this.config.session?.transcript || []
        ).map((t: { role: string; text: string }) => ({
          role: t.role === 'assistant' ? 'assistant' : 'user',
          content: t.text,
        }));
        history.push({ role: 'user', content: text });

        const result = await this.config.llmProvider.generateChat(history, {
          systemInstruction: this.config.systemInstruction,
          temperature: 0.7,
        });
        replyText = result.text;
      } catch (err) {
        console.warn(
          'LLM generation failed in realtime session, using dynamic engine fallback:',
          err,
        );
      }
    }

    // 2. If no LLM reply, use problem-aware contextual dialogue engine
    if (!replyText) {
      replyText = this.generateContextualResponse(text);
    }

    this.emit({
      type: 'assistant.transcript.final',
      text: replyText,
      timestamp: Date.now(),
    });
    this.emit({ type: 'turn.completed', timestamp: Date.now() });

    setTimeout(() => {
      this.isAssistantSpeaking = false;
    }, 2000);
  }

  private generateContextualResponse(candidateText: string): string {
    const session = this.config.session;
    const question = session?.currentQuestion;
    const lower = candidateText.toLowerCase().trim();

    const isSap =
      session?.domain === ProfessionalDomain.SAP ||
      question?.domain === ProfessionalDomain.SAP;

    // Check greeting / readiness / affirmation
    const isGreetingOrReady =
      lower.includes('hi') ||
      lower.includes('hello') ||
      lower.includes('ready') ||
      lower.includes('start') ||
      lower.includes('begin') ||
      lower.includes('doing well') ||
      lower.includes('good') ||
      lower.includes('hey') ||
      lower.includes('dive in') ||
      lower.includes('diving') ||
      lower.includes('yes') ||
      lower.includes('yeah') ||
      lower.includes('sure') ||
      lower.includes('let us') ||
      lower.includes("let's") ||
      lower.includes('ok') ||
      lower.includes('okay') ||
      lower.includes('yep');

    if (this.turnCount <= 2 && isGreetingOrReady) {
      if (question) {
        return isSap
          ? `Great! Let's examine this enterprise challenge: "${question.title}".\n\n${question.stem}\n\nTo begin, walk me through how you would architect this solution while upholding SAP Clean Core standards.`
          : `Great! Let's examine our technical challenge today: "${question.title}".\n\n${question.stem}\n\nTo begin, walk me through your high-level approach: what data structures would you select, and what are your target time and space complexities?`;
      }
      return `Great! Let's dive into the technical problem. How would you approach designing an optimal solution for this scenario?`;
    }

    // 1. Database Indexing & B+ Trees (if active)
    const isDbBTree =
      question?.title?.toLowerCase().includes('b+ tree') ||
      question?.title?.toLowerCase().includes('database indexing') ||
      question?.stem?.toLowerCase().includes('b+ tree');

    if (isDbBTree) {
      if (
        lower.includes('range') ||
        lower.includes('leaf') ||
        lower.includes('leaves') ||
        lower.includes('doubly linked')
      ) {
        return `Spot on. Because all leaf nodes in a B+ Tree are sequentially linked via doubly linked pointers, range scans (e.g. WHERE age BETWEEN 20 AND 30) only require traversing to the first leaf node and scanning horizontally, avoiding expensive repeated tree traversals. How does this compare to Hash Indexes for range queries?`;
      }
      if (
        lower.includes('fanout') ||
        lower.includes('height') ||
        lower.includes('disk') ||
        lower.includes('page') ||
        lower.includes('i/o') ||
        lower.includes('io')
      ) {
        return `Exactly. A high fanout drastically reduces tree height, meaning searching a record typically requires only 3 to 4 disk page reads even for millions of rows. Why do B+ Trees store values strictly in leaf nodes rather than internal nodes like standard B-Trees?`;
      }
      if (
        lower.includes('hash') ||
        lower.includes('equality') ||
        lower.includes('point lookup')
      ) {
        return `Correct. Hash tables offer O(1) point lookups for equality checks (WHERE id = 5), but completely fail on range scans, sorting (ORDER BY), and prefix lookups. How do database buffer pools and page caching optimize B+ Tree traversal in memory?`;
      }
      if (question?.probingQuestions && question.probingQuestions.length > 0) {
        const probe =
          question.probingQuestions[
            (this.turnCount - 1) % question.probingQuestions.length
          ];
        return `Good analysis. ${probe.probeText}`;
      }
      return `Solid reasoning. Walk me through the exact I/O operations and disk page reads when an index lookup traverses from the root node to the matching leaf node.`;
    }

    // 2. Two Sum & Array Hash Mapping
    const isTwoSum =
      question?.title?.toLowerCase().includes('two sum') ||
      question?.stem?.toLowerCase().includes('two sum');

    if (isTwoSum) {
      if (
        lower.includes('hash') ||
        lower.includes('map') ||
        lower.includes('dict') ||
        lower.includes('complement')
      ) {
        return `Spot on. Using a hash map to store each visited number and its index allows checking for the complement (target - num) in O(1) average time, giving an overall O(N) time and O(N) space complexity. How would your implementation handle duplicate numbers or when the target requires adding a number to itself?`;
      }
      if (
        lower.includes('sort') ||
        lower.includes('two pointer') ||
        lower.includes('binary search')
      ) {
        return `That is a classic two-pointer strategy. Sorting the array takes O(N log N) time and allows two pointers to converge in O(N) time with O(1) auxiliary space. However, how does sorting affect the original element indices if the problem asks to return 0-based indices?`;
      }
      if (
        lower.includes('brute') ||
        lower.includes('nested') ||
        lower.includes('o(n^2)') ||
        lower.includes('n square')
      ) {
        return `A nested loop brute force checks all pairs in O(N²) time and O(1) space. How can we trade auxiliary space to optimize this down to linear O(N) time?`;
      }
      if (question?.probingQuestions && question.probingQuestions.length > 0) {
        const probe =
          question.probingQuestions[
            (this.turnCount - 1) % question.probingQuestions.length
          ];
        return `Good thinking. ${probe.probeText}`;
      }
      return `Understood. Walk me through the exact code logic for handling the case where no valid pair exists in the input array.`;
    }

    // 3. Tree LCA / Binary Tree Traversal
    const isTreeLca =
      question?.title?.toLowerCase().includes('lowest common ancestor') ||
      question?.title?.toLowerCase().includes('binary tree');

    if (isTreeLca) {
      if (
        lower.includes('recur') ||
        lower.includes('dfs') ||
        lower.includes('postorder')
      ) {
        return `Spot on. Post-order DFS traversal recursively searches left and right subtrees; when both subtrees return non-null matches, the current root is the LCA. What are the base conditions, and what is the call stack space complexity in a skewed tree?`;
      }
      if (
        lower.includes('parent pointer') ||
        lower.includes('ancestor') ||
        lower.includes('path')
      ) {
        return `Storing ancestor paths or parent pointers using a hash set enables finding the intersection in O(H) time. How does this compare with the pure recursive divide-and-conquer approach in terms of auxiliary memory?`;
      }
      if (question?.probingQuestions && question.probingQuestions.length > 0) {
        const probe =
          question.probingQuestions[
            (this.turnCount - 1) % question.probingQuestions.length
          ];
        return `Good insight. ${probe.probeText}`;
      }
      return `Understood. How does your algorithm handle the edge case where one of the target nodes is itself the ancestor of the other?`;
    }

    // 4. Valid Parentheses / Stacks
    const isStackQuestion =
      question?.title?.toLowerCase().includes('parentheses') ||
      question?.title?.toLowerCase().includes('bracket') ||
      question?.stem?.toLowerCase().includes('parentheses');

    if (isStackQuestion) {
      if (lower.includes('stack') || lower.includes('lifo')) {
        return `Excellent choice. A stack naturally handles Last-In-First-Out matching of nested bracket pairs. How would you handle edge cases such as a closing bracket appearing when the stack is empty, or remaining open brackets after parsing the entire string?`;
      }
      if (
        lower.includes('map') ||
        lower.includes('hash') ||
        lower.includes('lookup')
      ) {
        return `Pairing the stack with a lookup map for closing-to-opening bracket pairs makes the matching code concise and easily extensible to new bracket types. What are your time and space complexity targets for this solution?`;
      }
      if (question?.probingQuestions && question.probingQuestions.length > 0) {
        const probe =
          question.probingQuestions[
            (this.turnCount - 1) % question.probingQuestions.length
          ];
        return `Good point. ${probe.probeText}`;
      }
      return `Understood. Walk me through how your implementation handles an odd-length string or an empty string input.`;
    }

    // 5. Sliding Window / Longest Substring
    const isSlidingWindow =
      question?.title?.toLowerCase().includes('substring') ||
      question?.title?.toLowerCase().includes('sliding window');

    if (isSlidingWindow) {
      if (
        lower.includes('window') ||
        lower.includes('two pointer') ||
        lower.includes('left') ||
        lower.includes('right')
      ) {
        return `Spot on. Maintaining a dynamic sliding window where the right pointer expands and the left pointer contracts on duplicate characters yields an optimal O(N) solution. What auxiliary data structure would you use to track character occurrences inside the window?`;
      }
      if (
        lower.includes('set') ||
        lower.includes('map') ||
        lower.includes('hash')
      ) {
        return `Using a hash map to store the last seen index of each character allows the left pointer to jump directly past duplicate characters in O(1) time without stepwise increments. What is the space complexity bound given the character set (ASCII / Unicode)?`;
      }
      if (question?.probingQuestions && question.probingQuestions.length > 0) {
        const probe =
          question.probingQuestions[
            (this.turnCount - 1) % question.probingQuestions.length
          ];
        return `Good analysis. ${probe.probeText}`;
      }
      return `Understood. Walk me through how your algorithm updates the maximum length variable as the window expands.`;
    }

    // 6. Question-specific logic for DSA / LRU Cache
    const isLruCache =
      question?.title?.toLowerCase().includes('lru') ||
      question?.stem?.toLowerCase().includes('lru');

    if (isLruCache) {
      const mentionsMap =
        lower.includes('hash') ||
        lower.includes('map') ||
        lower.includes('dict');
      const mentionsList =
        lower.includes('linked list') ||
        lower.includes('doubly') ||
        lower.includes('node');
      const mentionsSentinel =
        lower.includes('dummy') ||
        lower.includes('sentinel') ||
        lower.includes('head') ||
        lower.includes('tail');
      const mentionsConcurrency =
        lower.includes('lock') ||
        lower.includes('mutex') ||
        lower.includes('readwrite') ||
        lower.includes('concurrent') ||
        lower.includes('thread') ||
        lower.includes('synchroniz');

      if (mentionsConcurrency) {
        return `Excellent explanation of concurrency control. Using segmented lock sharding or a ReadWriteLock prevents the cache from becoming a global bottleneck during read-heavy traffic. What are the key boundary conditions and edge cases you would test before deploying this cache?`;
      }

      if (mentionsSentinel) {
        return `Spot on. Sentinel dummy head and tail nodes cleanly eliminate edge-case null pointer checks during node insertion and deletion. Now, how would you make this cache safe for concurrent access when multiple threads call get() and put() simultaneously?`;
      }

      if (mentionsMap && mentionsList) {
        return `That is the optimal combination. Pairing a hash map for O(1) key lookups with a doubly linked list for O(1) node detachment and move-to-head operations gives us the desired O(1) get and put performance. How would you structure sentinel dummy head and tail pointers to avoid null pointer edge cases?`;
      }

      if (mentionsMap && !mentionsList) {
        return `A hash map provides O(1) key-to-value lookups, but by itself cannot order elements by recency in O(1). What auxiliary linear data structure would you pair with the map to achieve O(1) eviction of the least recently used item?`;
      }

      if (mentionsList && !mentionsMap) {
        return `A linked list tracks access order well, but searching for an arbitrary key takes O(N) traversal. How can you bring key lookup down to O(1) time?`;
      }

      if (question.probingQuestions && question.probingQuestions.length > 0) {
        const probe =
          question.probingQuestions[
            (this.turnCount - 1) % question.probingQuestions.length
          ];
        return `Good analysis. Let me ask you: ${probe.probeText}`;
      }

      return `Understood. Walk me through the exact step-by-step logic when get(key) is called on an existing key versus a missing key.`;
    }

    // 7. SAP-specific logic
    if (isSap) {
      if (lower.includes('bdef') || lower.includes('rap')) {
        return `Good grasp of the ABAP RESTful Application Programming model. In the RAP save sequence, how do you handle transactional determinations without triggering commit dumps?`;
      }
      if (
        lower.includes('acdoca') ||
        lower.includes('universal journal') ||
        lower.includes('ledger')
      ) {
        return `Spot on regarding the Universal Journal (ACDOCA). How does your design ensure multi-ledger financial consistency under high-volume parallel postings?`;
      }
      if (question?.probingQuestions && question.probingQuestions.length > 0) {
        const probe =
          question.probingQuestions[
            (this.turnCount - 1) % question.probingQuestions.length
          ];
        return `I see. ${probe.probeText}`;
      }
      return `Solid architectural breakdown. How does this extension strictly adhere to SAP Clean Core Tier 2 developer extensibility with released C1 APIs when quarterly cloud upgrades occur?`;
    }

    // 8. General SDE / System Design / DSA fallback
    if (question?.probingQuestions && question.probingQuestions.length > 0) {
      const probe =
        question.probingQuestions[
          (this.turnCount - 1) % question.probingQuestions.length
        ];
      return `That makes sense. ${probe.probeText}`;
    }

    return `Good point. How would you verify the time and space complexity of this solution under high-throughput production workloads?`;
  }

  async interrupt(): Promise<void> {
    this.isAssistantSpeaking = false;
    this.emit({ type: 'assistant.interrupted', timestamp: Date.now() });
  }

  async close(): Promise<void> {
    this.isAssistantSpeaking = false;
    this.emit({
      type: 'session.ended',
      reason: 'client_requested',
      timestamp: Date.now(),
    });
  }

  onEvent(handler: (event: ConversationEvent) => void): void {
    this.eventHandlers.push(handler);
  }

  private emit(event: ConversationEvent) {
    for (const h of this.eventHandlers) {
      try {
        h(event);
      } catch (err) {
        console.error('Error in mock event handler:', err);
      }
    }
  }
}
