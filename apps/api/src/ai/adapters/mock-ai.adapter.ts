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

    // ── CANDIDATE CLARIFYING QUESTIONS (FAANG DSA & SAP) ─────────
    const isClarifyingQuestion =
      lower.includes('?') ||
      lower.includes('clarify') ||
      lower.includes('negative') ||
      lower.includes('duplicate') ||
      lower.includes('sorted') ||
      lower.includes('empty') ||
      lower.includes('constraint') ||
      lower.includes('bounds') ||
      lower.includes('in-place') ||
      lower.includes('in place') ||
      lower.includes('0-indexed') ||
      lower.includes('1-indexed') ||
      lower.includes('spaces') ||
      lower.includes('case-sensitive') ||
      lower.includes('case sensitive') ||
      lower.includes('can i assume') ||
      lower.includes('should i assume') ||
      lower.includes('what if') ||
      lower.includes('return if');

    const questionTitle = question?.title?.toLowerCase() ?? '';
    const questionStem = question?.stem?.toLowerCase() ?? '';

    if (isClarifyingQuestion) {
      if (
        questionTitle.includes('two sum') ||
        questionStem.includes('two sum')
      ) {
        return `Great clarifying questions. The input array is not sorted. Elements can be negative, zero, or positive within standard 32-bit integer limits. You cannot use the element at the same index twice. You may assume exactly one valid pair exists, and you should return 0-based indices. What initial approach comes to mind?`;
      }
      if (
        questionTitle.includes('substring') ||
        questionStem.includes('substring')
      ) {
        return `Good clarification. The string can contain standard ASCII letters, digits, symbols, and spaces. For an empty string, the expected return length is 0. We are looking for a contiguous substring, not a non-contiguous subsequence. How are you thinking of tracking the characters in the current window?`;
      }
      if (
        questionTitle.includes('parentheses') ||
        questionTitle.includes('bracket') ||
        questionStem.includes('parentheses')
      ) {
        return `Good question. The input string contains only parentheses characters: '(', ')', '{', '}', '[', and ']'. An empty string is considered valid. If the string length is odd, it's immediately invalid. How would you like to model the bracket matching?`;
      }
      if (
        questionTitle.includes('merge k') ||
        questionStem.includes('merge k')
      ) {
        return `Great clarification. Each of the k linked lists is already sorted in ascending order. The number of lists k can be between 0 and 10^4, and individual lists can also be empty (null). Total elements across all lists will fit in memory. What data structures could help us track the current minimum across all k lists?`;
      }
      if (
        questionTitle.includes('course schedule') ||
        questionStem.includes('prerequisites')
      ) {
        return `Good question. Courses are labeled from 0 to numCourses - 1. There may be disconnected components, and prerequisite pairs can represent arbitrary directed edges. If there is a cycle, it's impossible to finish all courses. What graph representation and traversal algorithm would you like to use?`;
      }
      if (questionTitle.includes('lru') || questionStem.includes('lru')) {
        return `Good questions. The capacity will be a positive integer greater than zero. Both get and put should operate in O(1) average time complexity. When the cache reaches capacity, the least recently used key should be evicted. What data structure combination allows both O(1) lookup and O(1) reordering?`;
      }
      if (
        questionTitle.includes('lowest common ancestor') ||
        questionTitle.includes('binary tree')
      ) {
        return `Great clarifying questions. All node values in the tree are unique, and both p and q are guaranteed to exist in the tree. A node is allowed to be a descendant of itself. What traversal strategy are you considering?`;
      }
      if (isSap) {
        return `Good architectural question. You can assume an S/4HANA Cloud environment with modern ABAP Cloud syntax, standard released C1 CDS views, and an SAP BTP subaccount connected via Cloud Connector. Would you approach this via On-Stack Developer Extensibility (Tier 2) or Side-by-Side on BTP (Tier 3)?`;
      }
      return `Good clarifying question. The input is not sorted, elements can be negative or positive within standard integer ranges, and you should return 0-based indices. Memory is available for standard auxiliary structures. What approach are you leaning towards?`;
    }

    // ── CANDIDATE READY TO CODE / WRITE IMPLEMENTATION ──────────
    const isReadyToCode =
      lower.includes('write code') ||
      lower.includes('start coding') ||
      lower.includes('code it') ||
      lower.includes('can i code') ||
      lower.includes('start implementation') ||
      lower.includes('implement it') ||
      lower.includes('ready to write') ||
      lower.includes('write the solution') ||
      lower.includes('code this out') ||
      lower.includes('type the code');

    if (isReadyToCode) {
      return `That approach sounds solid. Please go ahead and write the code in the editor. Feel free to think out loud and talk me through your implementation as you write it.`;
    }

    // ── CANDIDATE DRY RUN / WALKTHROUGH TEST CASES ──────────────
    const isDryRun =
      lower.includes('dry run') ||
      lower.includes('walk through') ||
      lower.includes('walkthrough') ||
      lower.includes('test case') ||
      lower.includes('trace') ||
      lower.includes('step through');

    if (isDryRun && this.turnCount > 3) {
      return `Excellent dry run walkthrough. The logic steps through that test case accurately. Are there any edge cases you'd like to test or double-check—such as empty input, duplicates, or boundary values—before we wrap up?`;
    }

    // ── 1. MERGE K SORTED LISTS (FAANG Hard) ────────────────────
    const isMergeK =
      questionTitle.includes('merge k') ||
      questionStem.includes('merge k') ||
      questionTitle.includes('sorted lists');

    if (isMergeK) {
      if (
        lower.includes('heap') ||
        lower.includes('priority queue') ||
        lower.includes('priorityqueue') ||
        lower.includes('min-heap') ||
        lower.includes('min heap')
      ) {
        return `Spot on. Maintaining a min-heap of size k holding the current head node of each list gives us O(N log k) time complexity, where N is the total number of nodes across all k lists. What is the auxiliary space complexity for the heap, and how do you handle lists that become empty during extraction?`;
      }
      if (
        lower.includes('divide and conquer') ||
        lower.includes('merge sort') ||
        lower.includes('pairwise') ||
        lower.includes('divide')
      ) {
        return `That is an elegant divide-and-conquer approach. Merging pairs of lists iteratively reduces the problem from k lists to k/2, k/4, down to 1 in O(N log k) time, with O(1) extra space if done in place with pointer manipulation. How does this compare with the min-heap approach?`;
      }
      if (
        lower.includes('flat') ||
        lower.includes('brute') ||
        lower.includes('collect') ||
        lower.includes('array sort')
      ) {
        return `Collecting all elements into a flat array and sorting them takes O(N log N) time and ignores the fact that each of the k lists is already sorted. How can we leverage the existing sorted order to achieve O(N log k) time?`;
      }
      if (question?.probingQuestions && question.probingQuestions.length > 0) {
        const probe =
          question.probingQuestions[
            (this.turnCount - 1) % question.probingQuestions.length
          ];
        return `Good analysis. ${probe.probeText}`;
      }
      return `Understood. Walk me through how your implementation handles k = 0 or when an input list is [[]].`;
    }

    // ── 2. COURSE SCHEDULE & TOPOLOGICAL SORT (FAANG Medium) ────
    const isCourseSchedule =
      questionTitle.includes('course schedule') ||
      questionStem.includes('prerequisites') ||
      questionTitle.includes('topological');

    if (isCourseSchedule) {
      if (
        lower.includes('kahn') ||
        lower.includes('indegree') ||
        lower.includes('in-degree') ||
        lower.includes('topological') ||
        lower.includes('bfs') ||
        lower.includes('queue')
      ) {
        return `Spot on. Kahn's algorithm using in-degrees and a queue processes courses with zero prerequisites first. If the number of processed courses equals numCourses, there are no cycles and all courses can be finished. What are the time and space complexities in terms of V (courses) and E (prerequisites)?`;
      }
      if (
        lower.includes('dfs') ||
        lower.includes('cycle') ||
        lower.includes('color') ||
        lower.includes('recursion') ||
        lower.includes('visited') ||
        lower.includes('backtracking')
      ) {
        return `Great choice with DFS cycle detection. Using a three-state tracking system (0: unvisited, 1: visiting in current DFS stack, 2: fully processed) correctly identifies back-edges that indicate cycles. Why does a simple two-state boolean array fail on directed acyclic graphs?`;
      }
      if (lower.includes('matrix') || lower.includes('adjacency list')) {
        return `Using an adjacency list representation takes O(V + E) space, compared to O(V²) for an adjacency matrix, which is crucial when the graph is sparse. Walk me through how your code builds the graph from the prerequisites list.`;
      }
      if (question?.probingQuestions && question.probingQuestions.length > 0) {
        const probe =
          question.probingQuestions[
            (this.turnCount - 1) % question.probingQuestions.length
          ];
        return `Good analysis. ${probe.probeText}`;
      }
      return `Understood. Walk me through how your code handles disconnected components or courses that have no prerequisites at all.`;
    }

    // ── 3. DATABASE INDEXING & B+ TREES ─────────────────────────
    const isDbBTree =
      questionTitle.includes('b+ tree') ||
      questionTitle.includes('database indexing') ||
      questionStem.includes('b+ tree');

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

    // ── 4. TWO SUM & ARRAY HASH MAPPING ─────────────────────────
    const isTwoSum =
      questionTitle.includes('two sum') || questionStem.includes('two sum');

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

    // ── 5. TREE LCA / BINARY TREE TRAVERSAL ──────────────────────
    const isTreeLca =
      questionTitle.includes('lowest common ancestor') ||
      questionTitle.includes('binary tree');

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

    // ── 6. VALID PARENTHESES / STACKS ────────────────────────────
    const isStackQuestion =
      questionTitle.includes('parentheses') ||
      questionTitle.includes('bracket') ||
      questionStem.includes('parentheses');

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

    // ── 7. SLIDING WINDOW / LONGEST SUBSTRING ─────────────────────
    const isSlidingWindow =
      questionTitle.includes('substring') ||
      questionTitle.includes('sliding window') ||
      questionStem.includes('longest substring');

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
        return `Using a hash map to store the last seen index of each character allows the left pointer to jump directly past duplicate characters in O(1) time without stepwise increments: left = max(left, lastSeen + 1). What is the space complexity bound given the character set (ASCII / Unicode)?`;
      }
      if (
        lower.includes('ascii') ||
        lower.includes('array') ||
        lower.includes('table')
      ) {
        return `Excellent optimization. Using a fixed-size integer array of length 128 or 256 for ASCII characters provides O(1) space and cache-friendly O(1) direct addressing without hash map collision overhead. How would you update your max length variable?`;
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

    // ── 8. CONCURRENT LRU CACHE ──────────────────────────────────
    const isLruCache =
      questionTitle.includes('lru') || questionStem.includes('lru');

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

    // ── 9. SAP ARCHITECTURE & CONSULTING (Realistic & Collaborative) ──
    if (isSap) {
      if (
        lower.includes('tier') ||
        lower.includes('clean core') ||
        lower.includes('steampunk') ||
        lower.includes('released api') ||
        lower.includes('c1')
      ) {
        return `That is precisely aligned with modern SAP Clean Core philosophy. Tier 1 is Key User Extensibility in standard apps, Tier 2 is On-Stack Developer Extensibility (Embedded Steampunk) strictly using released C1 APIs and ABAP Cloud, and Tier 3 is Side-by-Side Extensibility on SAP BTP. Where would you draw the boundary between Tier 2 on-stack and Tier 3 side-by-side for high-volume custom billing calculations?`;
      }
      if (
        lower.includes('bdef') ||
        lower.includes('rap') ||
        lower.includes('determination') ||
        lower.includes('validation') ||
        lower.includes('draft')
      ) {
        return `Good grasp of the ABAP RESTful Application Programming model. During the RAP transactional save sequence, determinations and validations run in the early save phase, while the late save phase handles number range assignment and the actual commit to the database. How do you prevent endless validation loops or illegal commit work dumps during the interaction phase?`;
      }
      if (
        lower.includes('cpi') ||
        lower.includes('integration suite') ||
        lower.includes('iflow') ||
        lower.includes('jms') ||
        lower.includes('event mesh')
      ) {
        return `Solid insights on SAP Cloud Integration. When orchestrating asynchronous messages from S/4HANA to external logistics partners, how do you design the iFlow with idempotent message IDs, JMS transaction boundaries, and dead-letter queues (DLQ) to guarantee exactly-once processing during partner network outages?`;
      }
      if (
        lower.includes('fubr') ||
        lower.includes('transportation') ||
        lower.includes('freight unit') ||
        lower.includes('incompatibility')
      ) {
        return `Spot on regarding Freight Unit Building Rules (FUBR) and Incompatibilities in SAP TM. When configuring TM optimization, how do you model vehicle compartment constraints when hazardous materials cannot be consolidated with perishable goods?`;
      }
      if (
        lower.includes('acdoca') ||
        lower.includes('universal journal') ||
        lower.includes('ledger') ||
        lower.includes('document splitting')
      ) {
        return `Precisely. With the S/4HANA Universal Journal (ACDOCA), multi-GAAP parallel reporting is enabled through leading (0L) and non-leading ledgers. How does real-time document splitting guarantee that each segment and profit center has balanced debits and credits on every posted line item?`;
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

    // ── 10. GENERAL SDE / SYSTEM DESIGN / DSA FALLBACK ──────────
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
