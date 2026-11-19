import {
  ProfessionalDomain,
  CompanyCategory,
  ExperienceLevel,
  InterviewDifficulty,
  EvaluationRating,
} from '@interviewai/shared-types';

export const INITIAL_COMPETENCIES = [
  {
    domain: ProfessionalDomain.SDE,
    name: 'Distributed Systems & System Design',
    slug: 'sde_system_design',
    category: 'Architecture',
    description:
      'High-level and low-level architecture, scalability, availability, data partitioning, caching, and distributed consistency trade-offs.',
  },
  {
    domain: ProfessionalDomain.SDE,
    name: 'Data Structures & Algorithmic Problem Solving',
    slug: 'sde_dsa_problem_solving',
    category: 'Problem Solving',
    description:
      'Time/space complexity analysis, memory models, cache locality, optimal data structure selection, and edge-case handling.',
  },
  {
    domain: ProfessionalDomain.SDE,
    name: 'Concurrency, Threading & Operating Systems',
    slug: 'sde_concurrency_os',
    category: 'CS Fundamentals',
    description:
      'Processes, threads, synchronizations, race conditions, deadlocks, lock-free structures, memory barriers, and CPU scheduling.',
  },
  {
    domain: ProfessionalDomain.SDE,
    name: 'Databases, Storage Engines & Indexing',
    slug: 'sde_dbms_storage',
    category: 'CS Fundamentals',
    description:
      'B-trees vs LSM trees, write-ahead logs, transaction isolation levels, indexing strategies, and database query optimization.',
  },
  {
    domain: ProfessionalDomain.SAP,
    name: 'ABAP RESTful Application Programming Model (RAP) & CDS',
    slug: 'sap_abap_rap',
    category: 'Enterprise Technical Development',
    description:
      'Core Data Services (CDS), Behavior Definitions (BDEF), determinations, validations, actions, draft buffer handling, code pushdown to SAP HANA, and ABAP Cloud syntax.',
  },
  {
    domain: ProfessionalDomain.SAP,
    name: 'SAP S/4HANA Enterprise Core & Clean Core Architecture',
    slug: 'sap_s4hana_core_clean_core',
    category: 'Enterprise Architecture',
    description:
      'Universal Journal (ACDOCA), Business Partner (BUT000 / CVI), 3-tier Clean Core extensibility (Key User, Embedded Steampunk, Side-by-Side BTP), and upgrade stability.',
  },
  {
    domain: ProfessionalDomain.SAP,
    name: 'SAP BTP, Integration Suite & Cloud Architecture',
    slug: 'sap_btp_cloud_integration',
    category: 'Cloud & Integration Architecture',
    description:
      'Cloud Integration (CPI) iFlows, error handling subprocesses, idempotent receivers, SAP Event Mesh, Cloud Application Programming (CAP), and Destination Services.',
  },
  {
    domain: ProfessionalDomain.SAP,
    name: 'SAP Transportation Management (TM) & Supply Chain Logistics',
    slug: 'sap_tm_logistics',
    category: 'Enterprise Functional Architecture',
    description:
      'Freight Unit Building Rules (FUBR), Transportation Cockpit optimization, Incompatibility Rules, Freight Orders, Carrier selection, and ERP/EWM integration.',
  },
  {
    domain: ProfessionalDomain.SAP,
    name: 'SAP S/4HANA Finance (FICO) & Financial Architecture',
    slug: 'sap_fico_financials',
    category: 'Financial Systems Architecture',
    description:
      'Universal Journal ACDOCA table architecture, Multi-GAAP parallel ledgers, Fast Close, Document Splitting, Margin Analysis (CO-PA), and real-time reconciliation.',
  },
  {
    domain: ProfessionalDomain.SAP,
    name: 'SAP ABAP & Modern Extension Frameworks',
    slug: 'sap_abap_development',
    category: 'Enterprise Technical Development',
    description:
      'Core Data Services (CDS) views, ABAP RESTful Application Programming (RAP), OData, SAP BTP extensions, and performance tuning.',
  },
];

export const INITIAL_QUESTIONS = [
  {
    competencySlug: 'sde_system_design',
    domain: ProfessionalDomain.SDE,
    companyCategories: [
      CompanyCategory.FAANG_STYLE,
      CompanyCategory.PRODUCT_COMPANY,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'Distributed Rate Limiter Design',
    stem: 'How would you design a distributed rate limiter that handles hundreds of thousands of requests per second across multiple server instances?',
    contextPrompt:
      'Candidate should evaluate rate-limiting algorithms, storage centralization vs local caching, atomicity guarantees, and failure modes.',
    expectedConcepts: [
      'Token Bucket or Leaky Bucket algorithm',
      'Sliding Window Log or Sliding Window Counter',
      'Centralized memory store (e.g. Redis)',
      'Atomic counter operations via Redis Lua scripts or MULTI/EXEC',
      'Mitigation of clock skew across instances',
      'Fail-open vs fail-closed policy when cache is down',
    ],
    commonMisconceptions: [
      'Using an in-memory counter on each app server without cross-node synchronization',
      'Assuming simple GET followed by SET in Redis is thread-safe without atomic scripts or transactions',
      'Ignoring clock drift across servers when using timestamp-based logs',
    ],
    probingQuestions: [
      {
        id: 'probe-rl-1',
        probeText:
          'Suppose your application is deployed across five instances, and all five consume tokens from the same bucket simultaneously. How do you prevent two requests from taking the same token at the same microsecond?',
        targetConcept: 'Atomic counter operations via Redis Lua scripts',
        triggerCondition: 'missing_concept' as const,
      },
      {
        id: 'probe-rl-2',
        probeText:
          'What happens if the Redis rate-limiting cluster experiences a total network partition? Would you fail open or fail closed, and what are the trade-offs?',
        targetConcept: 'Fail-open vs fail-closed policy when cache is down',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Candidate suggests naive local memory counter with no understanding of distributed concurrency.',
        keyIndicators: [
          'Cannot explain race conditions',
          'Proposes single process memory counter',
          'Unaware of rate limiting algorithms',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Mentions Redis and Token Bucket, but overlooks atomic transaction requirements and failure handling.',
        keyIndicators: [
          'Explains Token Bucket',
          'Uses Redis but misses race condition in GET/SET',
          'Vague on failure behavior',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Designs complete architecture with atomic Redis Lua script, sliding window or token bucket, and clear latency analysis.',
        keyIndicators: [
          'Lua scripts for atomicity',
          'Articulates memory footprint calculations',
          'Defines fail-open vs fail-closed criteria',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Comprehensive mastery: multi-tier rate limiting (client, edge/CDN, API gateway), batching token sync, local sliding window with eventual consistency.',
        keyIndicators: [
          'Edge rate-limiting via Cloudflare/Envoy',
          'Token batching to reduce Redis IOPS',
          'Deep trade-off analysis under high contention',
        ],
      },
    ],
  },
  {
    competencySlug: 'sde_dsa_problem_solving',
    domain: ProfessionalDomain.SDE,
    companyCategories: [
      CompanyCategory.FAANG_STYLE,
      CompanyCategory.PRODUCT_COMPANY,
      CompanyCategory.SERVICE_COMPANY,
    ],
    experienceLevels: [
      ExperienceLevel.FRESHER,
      ExperienceLevel.SDE_1,
      ExperienceLevel.SDE_2,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'Concurrent LRU Cache Architecture',
    stem: 'How would you implement a Least Recently Used (LRU) Cache that provides O(1) time complexity for both get and put operations, and how would you make it safe for concurrent access?',
    contextPrompt:
      'Candidate must demonstrate data structure selection (Doubly Linked List + Hash Map) and articulate concurrency mechanisms (ReadWriteLock, sharded locking, lock-free).',
    expectedConcepts: [
      'Hash Map for O(1) key-to-node lookup',
      'Doubly Linked List for O(1) eviction and move-to-head operations',
      'Sentinel dummy head and tail pointers to eliminate edge-case null checks',
      'Concurrency control: ReadWriteLock or segmented lock sharding',
    ],
    commonMisconceptions: [
      'Using a singly linked list (requires O(N) traversal to delete the previous node)',
      'Using an array or ArrayList (removal of elements is O(N) due to shifting)',
      'Putting a single global mutex over the entire cache (severe bottleneck under high read contention)',
    ],
    probingQuestions: [
      {
        id: 'probe-lru-1',
        probeText:
          'Why does an LRU cache strictly require a doubly linked list rather than a singly linked list?',
        targetConcept:
          'O(1) deletion of node requires pointer to previous node',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-lru-2',
        probeText:
          'If thousands of threads are calling get() simultaneously and rarely calling put(), how would you optimize concurrency without locking every read?',
        targetConcept: 'Read-write locking or striping',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Suggests arrays or singly linked lists, unaware of why operations become O(N).',
        keyIndicators: [
          'Suggests sorting array',
          'Cannot achieve O(1) eviction',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Correctly identifies HashMap + DoublyLinkedList, but struggles with pointer mutations or concurrency.',
        keyIndicators: [
          'Understands DoublyLinkedList',
          'Struggles with dummy head/tail edge cases',
          'Suggests global lock only',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Implements clean O(1) logic with sentinel nodes, and explains ReadWriteLock or synchronized blocks.',
        keyIndicators: [
          'Sentinel node pattern',
          'O(1) get/put verification',
          'Thread-safety with granular locking',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Analyzes lock striping (like Java ConcurrentHashMap), compares LRU with Clock or 2Q eviction, and analyzes cache line bouncing.',
        keyIndicators: [
          'Lock striping / segment sharding',
          'Explains read contention with LRU update-on-read',
          'Discusses alternate eviction policies (W-TinyLFU, Clock)',
        ],
      },
    ],
  },
  {
    competencySlug: 'sde_dsa_problem_solving',
    domain: ProfessionalDomain.SDE,
    companyCategories: [
      CompanyCategory.FAANG_STYLE,
      CompanyCategory.PRODUCT_COMPANY,
      CompanyCategory.SERVICE_COMPANY,
    ],
    experienceLevels: [
      ExperienceLevel.FRESHER,
      ExperienceLevel.SDE_1,
      ExperienceLevel.SDE_2,
    ],
    difficulty: InterviewDifficulty.EASY,
    title: 'Two Sum & Optimal Hash Map Lookups',
    stem: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Each input has exactly one solution and you may not use the same element twice. How do you achieve O(N) time complexity?',
    contextPrompt:
      'Candidate must demonstrate one-pass hash map complement lookup (target - num) and compare time/space trade-offs with brute force O(N^2) and sorted two-pointer approaches.',
    expectedConcepts: [
      'One-pass Hash Map storing (value -> index) for O(1) complement lookup',
      'Target complement calculation: complement = target - nums[i]',
      'Overall O(N) time complexity and O(N) auxiliary space complexity',
      'Handling duplicate elements and avoiding index self-pairing',
    ],
    commonMisconceptions: [
      'Sorting the array without preserving original indices when problem requires 0-based index returns',
      'Using nested loops resulting in O(N^2) brute force latency',
      'Two-pass hash map when a single pass suffices by checking complement before inserting',
    ],
    probingQuestions: [
      {
        id: 'probe-twosum-1',
        probeText:
          'What happens if the input array contains duplicate values, e.g. [3, 3] with target 6? How does your map store both?',
        targetConcept: 'Duplicate value handling and insertion order',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-twosum-2',
        probeText:
          'If auxiliary memory is strictly O(1) and you cannot allocate a hash map, how would you solve this, and what is the new time complexity?',
        targetConcept:
          'Sorting + Two Pointer trade-off (O(N log N) time, O(1) space)',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Only suggests O(N^2) nested loops and cannot formulate hash map complement lookup.',
        keyIndicators: [
          'Suggests nested loops',
          'Unaware of hash map complement technique',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Suggests hash map but requires two passes or struggles with index handling.',
        keyIndicators: ['Two-pass hash map', 'Struggles with duplicate values'],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Clearly implements one-pass hash map with O(N) time and O(N) space complexity.',
        keyIndicators: [
          'One-pass hash map',
          'Checks complement before insertion',
          'Articulates space/time trade-off',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Compares hash map, sorting two-pointers, hash collisions, and cache locality of flat arrays vs pointer maps.',
        keyIndicators: [
          'Analyzes cache locality',
          'Compares O(1) space two-pointer approach',
          'Discusses hash collisions',
        ],
      },
    ],
  },
  {
    competencySlug: 'sde_dsa_problem_solving',
    domain: ProfessionalDomain.SDE,
    companyCategories: [
      CompanyCategory.FAANG_STYLE,
      CompanyCategory.PRODUCT_COMPANY,
    ],
    experienceLevels: [
      ExperienceLevel.FRESHER,
      ExperienceLevel.SDE_1,
      ExperienceLevel.SDE_2,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'Lowest Common Ancestor in Binary Tree',
    stem: 'Given a binary tree and two nodes p and q, find the lowest common ancestor (LCA) node in the tree. The lowest common ancestor is defined between two nodes p and q as the lowest node in T that has both p and q as descendants (where we allow a node to be a descendant of itself).',
    contextPrompt:
      'Candidate must demonstrate post-order recursive divide-and-conquer traversal, base conditions, and analyze call stack memory complexity.',
    expectedConcepts: [
      'Recursive post-order DFS traversal (left, right, root)',
      'Base cases: root == null, root == p, root == q',
      'When both left and right recursive calls return non-null, current root is the LCA',
      'Time complexity O(N) visiting each node once, space complexity O(H) call stack height',
    ],
    commonMisconceptions: [
      'Assuming the tree is a Binary Search Tree (BST) when the problem states general Binary Tree',
      'Allocating full parent pointer maps when a pure recursive post-order traversal needs zero extra data structures',
    ],
    probingQuestions: [
      {
        id: 'probe-lca-1',
        probeText:
          'What happens in the recursion if node p is an ancestor of node q? How does your base case return the correct LCA?',
        targetConcept: 'Self-descendant base condition',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-lca-2',
        probeText:
          'What is the worst-case space complexity of your recursive call stack, and when does it degrade to O(N)?',
        targetConcept: 'Call stack depth in skewed binary trees',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Confuses Binary Tree with BST or cannot formulate recursive base conditions.',
        keyIndicators: [
          'Assumes tree is sorted BST',
          'Cannot structure tree traversal',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Understands recursion but struggles with combining results from left and right subtrees.',
        keyIndicators: [
          'Vague return bubbling',
          'Misses base case where node is ancestor of other',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Implements clean post-order DFS in O(N) time and O(H) space with clear base cases.',
        keyIndicators: [
          'Post-order DFS',
          'O(N) time, O(H) space',
          'Handles both nodes found in different subtrees',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Analyzes iterative parent-pointer solutions vs recursion, discusses tree balancing, and handles missing node edge cases.',
        keyIndicators: [
          'Iterative hash map path comparison',
          'Analyzes skewed tree stack overflow mitigations',
        ],
      },
    ],
  },
  {
    competencySlug: 'sde_dsa_problem_solving',
    domain: ProfessionalDomain.SDE,
    companyCategories: [
      CompanyCategory.FAANG_STYLE,
      CompanyCategory.PRODUCT_COMPANY,
      CompanyCategory.SERVICE_COMPANY,
    ],
    experienceLevels: [ExperienceLevel.FRESHER, ExperienceLevel.SDE_1],
    difficulty: InterviewDifficulty.EASY,
    title: 'Valid Parentheses & Balanced Bracket Parsing',
    stem: 'Given a string s containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid. Open brackets must be closed by the same type of brackets and in the correct order. How do you implement this efficiently?',
    contextPrompt:
      'Candidate must demonstrate Stack (LIFO) data structure, hash map for bracket pairs, and handle edge cases like odd lengths or unmatched closing brackets.',
    expectedConcepts: [
      'Stack data structure for Last-In-First-Out (LIFO) matching',
      'Hash Map mapping closing brackets to opening brackets',
      'Edge case: odd length string can never be valid (return false early in O(1))',
      'Time complexity O(N) single pass, space complexity O(N) stack capacity',
    ],
    commonMisconceptions: [
      'Using simple counter variables instead of a stack (fails on interleaving brackets like "([)]")',
      'Forgetting to check if stack is empty when encountering a closing bracket (causes stack underflow error)',
      'Forgetting to verify stack is completely empty at end of string (fails on unclosed brackets like "(()")',
    ],
    probingQuestions: [
      {
        id: 'probe-paren-1',
        probeText:
          'Why does a counter variable (like count++ for "(" and count-- for ")") fail for multiple bracket types like "([)]"?',
        targetConcept: 'LIFO requirement for nested multi-bracket types',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-paren-2',
        probeText:
          'How does your solution handle a string with 1 million opening brackets? What is the maximum memory consumed?',
        targetConcept: 'O(N) auxiliary space scaling on stack',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Attempts to use integer counters, unaware that interleaving brackets violate balance.',
        keyIndicators: [
          'Counter approach for multi-brackets',
          'Unaware of Stack LIFO property',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Uses a stack but misses empty stack checks or does not verify empty stack at end.',
        keyIndicators: [
          'Misses underflow check',
          'Returns true for unclosed "("',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Implements complete stack matching in O(N) time and O(N) space with map lookup and all boundary checks.',
        keyIndicators: [
          'Stack with bracket map',
          'Empty stack underflow guard',
          'Final empty stack verification',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Optimizes early return for odd length strings, compares array-backed deque vs linked stack, and discusses cache friendliness.',
        keyIndicators: [
          'Early length check',
          'Deque vs Stack comparison',
          'Discusses streaming inputs',
        ],
      },
    ],
  },
  {
    competencySlug: 'sde_system_design',
    domain: ProfessionalDomain.SDE,
    companyCategories: [
      CompanyCategory.FAANG_STYLE,
      CompanyCategory.PRODUCT_COMPANY,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    difficulty: InterviewDifficulty.HARD,
    title: 'Consistent Hashing and Data Partitioning',
    stem: 'When partitioning data across hundreds of database or cache nodes, standard modulo hashing (hash(key) % N) causes massive cache invalidation when nodes are added or removed. How does consistent hashing solve this, and how do you handle hot partitions?',
    contextPrompt:
      'Candidate should explain the hash ring, virtual nodes (vnodes), redistribution minimizing data movement, and replication strategies.',
    expectedConcepts: [
      'Hash ring abstraction mapping both keys and servers to a circular 32/64-bit integer space',
      'Clockwise successor lookup using binary search (O(log M) on ring nodes)',
      'Virtual nodes (vnodes) for uniform distribution and balancing heterogeneous servers',
      'When adding node K, only keys between K and its predecessor are moved (average K/N keys moved)',
    ],
    commonMisconceptions: [
      'Believing consistent hashing eliminates data movement completely (it minimizes it to 1/N, not 0)',
      'Omitting virtual nodes, leading to severe non-uniform distribution on small clusters',
    ],
    probingQuestions: [
      {
        id: 'probe-ch-1',
        probeText:
          'If you only map 10 physical servers directly to the ring with 1 position each, what happens to data distribution? How do virtual nodes resolve that?',
        targetConcept: 'Virtual nodes for variance reduction on hash ring',
        triggerCondition: 'missing_concept' as const,
      },
      {
        id: 'probe-ch-2',
        probeText:
          'Suppose a celebrity user generates 100x more read traffic on a single key than normal keys. How does consistent hashing handle this hot key, or what extra layer is needed?',
        targetConcept:
          'Hot key mitigation through local caching or key salting',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Unable to explain the limitation of modulo hashing or the concept of a hash ring.',
        keyIndicators: [
          'Does not understand why hash(key)%N fails during resharding',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Understands the circular ring concept, but cannot explain virtual nodes or lookup complexity.',
        keyIndicators: [
          'Explains circle concept',
          'Misses non-uniformity without vnodes',
          'Vague on replica assignment',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Clearly articulates hash ring, binary search lookup O(log N), virtual nodes, and minimal key redistribution.',
        keyIndicators: [
          'Mathematical explanation of K/N movement',
          'Virtual node tuning',
          'Replication across next N distinct physical nodes',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Production-grade insight: touches Dynamo/Cassandra gossip protocol, bounded loads consistent hashing, and hot-key splitting techniques.',
        keyIndicators: [
          'Gossip protocol for ring view synchronization',
          'Bounded load consistent hashing (Google paper)',
          'Celebrity key prefix salting',
        ],
      },
    ],
  },
  {
    competencySlug: 'sde_dbms_storage',
    domain: ProfessionalDomain.SDE,
    companyCategories: [
      CompanyCategory.PRODUCT_COMPANY,
      CompanyCategory.SERVICE_COMPANY,
      CompanyCategory.FAANG_STYLE,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_1,
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'Relational Database Indexing & B+ Trees',
    stem: 'Why do relational databases like PostgreSQL and MySQL InnoDB use B+ Trees rather than standard Binary Search Trees or Hash Tables for table indexes?',
    contextPrompt:
      'Candidate should explain disk I/O, fanout, tree depth, sequential range scans via leaf node pointers, and composite index leftmost prefix rules.',
    expectedConcepts: [
      'High fanout reduces tree height, minimizing disk page reads',
      'Disk block / page alignment (4KB / 8KB / 16KB blocks loaded in single I/O)',
      'B+ Tree stores values only in leaves, keeping internal nodes compact and memory-cacheable',
      'Doubly linked leaf nodes allow efficient range queries (WHERE x BETWEEN a AND b) without tree retraversal',
      'Hash indexes cannot perform range scans or prefix lookups',
    ],
    commonMisconceptions: [
      'Claiming Binary Search Trees are good for disk storage (BSTs have depth log2(N), causing dozens of random disk seeks)',
      'Thinking hash indexes can support ORDER BY or range scans',
      'Not knowing that composite index (A, B) cannot optimize queries filtering only on B',
    ],
    probingQuestions: [
      {
        id: 'probe-db-1',
        probeText:
          'Why are doubly linked pointers between leaf nodes in a B+ Tree crucial compared to a standard B-Tree?',
        targetConcept:
          'Sequential range scans without retraversing parent nodes',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-db-2',
        probeText:
          'If you create a composite index on (status, created_at), will the query `SELECT * FROM orders WHERE created_at > NOW() - INTERVAL 1 DAY` use that index effectively?',
        targetConcept: 'Leftmost prefix rule of composite indexes',
        triggerCondition: 'missing_concept' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Cannot differentiate memory vs disk access times or explain why tree depth matters.',
        keyIndicators: [
          'Assumes memory pointer speed applies to disk',
          'Cannot explain range scans',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Knows B+ Tree is used, but vague on leaf node chaining or disk page alignment.',
        keyIndicators: [
          'Knows B+ tree is shorter than BST',
          'Vague on composite index behavior',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Accurately explains disk block alignment, high fanout, leaf node chaining for ranges, and leftmost prefix rules.',
        keyIndicators: [
          'High fanout and I/O minimization',
          'Linked leaf node range scans',
          'Composite index rule understanding',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Contrasts B+ Trees with LSM Trees (RocksDB, Cassandra) analyzing write amplification vs read amplification, write buffer, and compaction.',
        keyIndicators: [
          'B+ tree random write amplification',
          'LSM tree append-only compaction trade-offs',
          'Page fill factor and B-tree split overhead',
        ],
      },
    ],
  },
  {
    competencySlug: 'sap_abap_rap',
    domain: ProfessionalDomain.SAP,
    companyCategories: [
      CompanyCategory.SAP_PRODUCT,
      CompanyCategory.SAP_CONSULTING,
      CompanyCategory.SAP_CUSTOMER,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title:
      'ABAP RAP Architecture: Managed vs Unmanaged Implementation Scenarios',
    stem: 'When designing an enterprise transactional business object using the ABAP RESTful Application Programming Model (RAP), what architectural criteria determine whether you choose a Managed Scenario versus an Unmanaged Scenario? Explain how determinations, validations, actions, and the RAP Transaction Manager govern the save sequence, and why COMMIT WORK is strictly forbidden in RAP behavior implementations.',
    contextPrompt:
      'Candidate must contrast Managed vs Unmanaged RAP scenarios, explain Behavior Definitions (BDEF) and Behavior Implementation Classes (BIL), transactional phases (interaction phase vs save sequence), early vs late numbering, draft handling, and the fatal runtime dump DYN_CALL_ILLEGAL_COMMIT when COMMIT WORK is called inside RAP.',
    expectedConcepts: [
      'Managed Scenario uses framework-orchestrated standard CRUD and buffer handling automatically',
      'Unmanaged Scenario delegates persistence, locking, and buffer logic to custom legacy code or BAPIs',
      'Behavior Definition (BDEF) declares determinations, validations, actions, draft capability, and authorization master',
      'Interaction phase (read, modify) versus Save sequence (finalize, check_before_save, save, cleanup)',
      'Strict prohibition of COMMIT WORK / ROLLBACK WORK inside behavior methods (dump DYN_CALL_ILLEGAL_COMMIT); RAP transaction manager controls the LUW',
      'Early numbering (managed UUID or number range in interaction phase) vs Late numbering (assigned during save phase)',
    ],
    commonMisconceptions: [
      'Calling COMMIT WORK inside a RAP determination or save method (causes runtime crash DYN_CALL_ILLEGAL_COMMIT)',
      'Assuming Unmanaged RAP scenarios cannot support draft handling or Fiori Elements (draft is supported in unmanaged with custom draft query/save)',
      'Confusing Determinations (side-effects executed on modify/save) with Validations (consistency checks returning failed/reported keys)',
    ],
    probingQuestions: [
      {
        id: 'probe-rap-1',
        probeText:
          'What happens at runtime if a developer calls COMMIT WORK inside a RAP Determination or Action method, and how does the RAP framework manage transactional integrity instead?',
        targetConcept:
          'Strict prohibition of COMMIT WORK / ROLLBACK WORK inside behavior methods',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-rap-2',
        probeText:
          'In an Unmanaged RAP scenario, how do you handle legacy BAPIs that internally perform COMMIT WORK without corrupting the RAP transactional buffer?',
        targetConcept:
          'Unmanaged Scenario delegates persistence, locking, and buffer logic to custom legacy code or BAPIs',
        triggerCondition: 'deep_dive' as const,
      },
      {
        id: 'probe-rap-3',
        probeText:
          'Explain the difference between Early Numbering and Late Numbering in RAP. In what business scenarios is Late Numbering mandatory?',
        targetConcept: 'Early numbering vs Late numbering mechanics',
        triggerCondition: 'missing_concept' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Confuses classic ABAP OO with RAP; does not understand why COMMIT WORK causes a crash in RAP.',
        keyIndicators: [
          'Unaware of RAP transaction manager',
          'Does not understand Managed vs Unmanaged distinction',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Explains Managed vs Unmanaged at a high level, but lacks clarity on RAP save sequence phases or draft buffer lifecycle.',
        keyIndicators: [
          'Knows BDEF exists',
          'Vague on save sequence phases',
          'Unclear on early vs late numbering',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Clear mastery of BDEF, determination/validation triggers, early vs late numbering, and RAP transaction manager integrity.',
        keyIndicators: [
          'Precise explanation of Managed vs Unmanaged trade-offs',
          'Articulates save sequence: finalize, check_before_save, save',
          'Highlights prohibition of COMMIT WORK',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Advanced enterprise mastery: unmanaged save sequence wrapping legacy BAPIs, side-effect annotations, ETag concurrency handling, and ABAP Cloud compliance.',
        keyIndicators: [
          'Unmanaged buffer management with legacy BAPIs',
          'Optimistic locking via total ETag / entity ETag',
          'ABAP Cloud release contracts and strict syntax compliance',
        ],
      },
    ],
  },
  {
    competencySlug: 'sap_abap_rap',
    domain: ProfessionalDomain.SAP,
    companyCategories: [
      CompanyCategory.SAP_PRODUCT,
      CompanyCategory.SAP_CONSULTING,
      CompanyCategory.SAP_CUSTOMER,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_1,
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'Core Data Services (CDS) Views vs Classic ABAP Views',
    stem: 'Why has SAP replaced classic dictionary database views (SE11) with ABAP Core Data Services (CDS) Views in S/4HANA, and how does the Code-to-Data pushdown paradigm improve performance on SAP HANA?',
    contextPrompt:
      'Candidate should explain calculation pushdown to the HANA DB layer, Virtual Data Model (VDM), annotations, associations (lazy loading), and OData exposure.',
    expectedConcepts: [
      'Code-to-data paradigm: calculations, aggregations, and joins executed in HANA in-memory DB rather than application server memory',
      'CDS Views feature rich SQL capabilities (CASE expressions, built-in functions, arithmetic) unsupported in SE11 views',
      'Associations provide on-demand (lazy) joins evaluated only when fields from the associated entity are requested',
      'Virtual Data Model (VDM) architectural tiers: Basic (Interface), Composite, and Consumption views',
      'Annotations (@UI, @Analytics, @OData) drive auto-generation of Fiori Elements and OData endpoints',
    ],
    commonMisconceptions: [
      'Believing CDS views are just a new syntax for classic SE11 views without recognizing the semantic layer and pushdown capabilities',
      'Thinking an association is always an immediate INNER JOIN (associations are evaluated on demand)',
    ],
    probingQuestions: [
      {
        id: 'probe-abap-1',
        probeText:
          'What is the fundamental execution difference between a CDS View Association and a traditional SQL JOIN in ABAP?',
        targetConcept:
          'Associations are lazy joins evaluated only when requested fields are queried',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-abap-2',
        probeText:
          'Explain the SAP VDM hierarchy (Basic Interface Views vs Composite Views vs Consumption Views). Why does SAP recommend never exposing Basic views directly to Fiori UI?',
        targetConcept:
          'VDM separation of concerns, reusability, and business logic isolation',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Views CDS only as a query tool; unaware of code-to-data pushdown or HANA in-memory benefits.',
        keyIndicators: [
          'Does not understand HANA pushdown',
          'Cannot explain associations',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Understands code pushdown and basic syntax, but cannot explain VDM layers or association mechanics.',
        keyIndicators: [
          'Knows code-to-data concept',
          'Confuses associations with standard joins',
          'Unaware of VDM layers',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Clear mastery of code pushdown, lazy associations, VDM hierarchy, and Fiori annotations.',
        keyIndicators: [
          'Deep explanation of lazy associations',
          'Clear VDM architecture definition',
          'Annotation-driven OData exposure',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Advanced engineering: table functions with AMDP (ABAP Managed Database Procedures), access controls (DCL) for data security, and ABAP RAP integration.',
        keyIndicators: [
          'AMDP table functions for complex native HANA calculations',
          'DCL data control authorization modeling',
          'ABAP RESTful Application Programming (RAP) integration',
        ],
      },
    ],
  },
  {
    competencySlug: 'sap_s4hana_core_clean_core',
    domain: ProfessionalDomain.SAP,
    companyCategories: [
      CompanyCategory.SAP_PRODUCT,
      CompanyCategory.SAP_CONSULTING,
      CompanyCategory.SAP_CUSTOMER,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    difficulty: InterviewDifficulty.HARD,
    title:
      'SAP Clean Core Strategy: In-App Extensibility vs Side-by-Side Extensibility on BTP',
    stem: "Explain SAP's Clean Core strategy for S/4HANA Cloud and On-Premise. How do you systematically evaluate whether a business requirement should be implemented via Tier 1 (Key User In-App Extensibility), Tier 2 (Developer Extensibility / Embedded Steampunk via ABAP Cloud), or Tier 3 (Side-by-Side Extensibility on SAP BTP)? What are the architectural hazards of classic modifications?",
    contextPrompt:
      'Candidate must detail the 3-tier Clean Core extensibility model, Key User tools (Fiori Custom Fields and Logic), Developer Extensibility (Embedded Steampunk with released C1 APIs and ABAP Cloud language version), Side-by-Side BTP (CAP, Event Mesh, decoupled lifecycle), and explain how classic core modifications (SSCR, user exits, direct table updates) block upgrades.',
    expectedConcepts: [
      'Clean Core 3-tier extensibility hierarchy (Tier 1: Key User, Tier 2: Developer Extensibility, Tier 3: Side-by-Side BTP)',
      'Tier 1 Key User Extensibility: low-code Fiori apps for custom fields, logic, and UI adaptations without developer IDE',
      'Tier 2 Developer Extensibility (Embedded Steampunk): restricted ABAP Cloud language version executing directly on S/4HANA stack using released C1 APIs',
      'Tier 3 Side-by-Side Extensibility on SAP BTP: autonomous cloud microservices (CAP, Node.js/Java, Event Mesh) decoupled from ERP upgrade cycles',
      'Released API contracts: Contract C1 for system-internal public interfaces and Contract C2 for extension points / BAdIs',
      'Classic modifications (Tier 4) break upgrade automation, create testing debt, and violate Clean Core governance',
    ],
    commonMisconceptions: [
      'Thinking Clean Core means zero custom code can ever reside on the S/4HANA box (Embedded Steampunk / Tier 2 is fully Clean Core compliant)',
      'Assuming BTP side-by-side extensibility should be used for high-frequency synchronous operational loops where latency to ERP is critical',
      'Believing classic BAdIs or user exits in custom namespaces (Z*) are automatically Clean Core compliant without released API contracts',
    ],
    probingQuestions: [
      {
        id: 'probe-clean-1',
        probeText:
          'If a requirement demands sub-millisecond access to millions of Universal Journal (ACDOCA) records with transactional updates, which Clean Core tier is appropriate and why?',
        targetConcept:
          'Tier 2 Developer Extensibility (Embedded Steampunk): restricted ABAP Cloud language version executing directly on S/4HANA stack',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-clean-2',
        probeText:
          'What is the architectural significance of the SAP Release Contract C1, and what happens during the ABAP Cloud syntax check if code calls an unreleased standard SAP function module or table?',
        targetConcept:
          'Released API contracts: Contract C1 for system-internal public interfaces and Contract C2 for extension points / BAdIs',
        triggerCondition: 'missing_concept' as const,
      },
      {
        id: 'probe-clean-3',
        probeText:
          'How do you guide an enterprise client with thousands of legacy Z-programs and modifications through a Clean Core remediation and migration path?',
        targetConcept:
          'Classic modifications (Tier 4) break upgrade automation, create testing debt, and violate Clean Core governance',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Unaware of Clean Core tiers; recommends classic user exits or direct database modifications.',
        keyIndicators: [
          'No understanding of Clean Core',
          'Advocates direct modification of SAP standard objects',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Understands Key User vs BTP, but unfamiliar with Developer Extensibility / Embedded Steampunk and released C1 API governance.',
        keyIndicators: [
          'Knows BTP exists for custom apps',
          'Unclear on Embedded Steampunk vs classic ABAP',
          'Vague on release contracts C1/C2',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Clear decision criteria across all 3 tiers, released contract mechanisms, and upgrade isolation advantages.',
        keyIndicators: [
          'Comprehensive 3-tier classification',
          'Explains ABAP Cloud language version restrictions',
          'Released API and BAdI upgrade stability',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Masterful architectural evaluation: custom code remediation via ABAP Test Cockpit (ATC) with Clean Core variant, side-by-side event decoupling, and total cost of ownership (TCO) impact.',
        keyIndicators: [
          'ABAP Test Cockpit (ATC) Clean Core checks and custom code migration apps',
          'Event-driven side-by-side decoupling with SAP Event Mesh',
          'Clear governance model for enterprise ERP lifecycle',
        ],
      },
    ],
  },
  {
    competencySlug: 'sap_s4hana_core_clean_core',
    domain: ProfessionalDomain.SAP,
    companyCategories: [
      CompanyCategory.SAP_PRODUCT,
      CompanyCategory.SAP_CONSULTING,
      CompanyCategory.SAP_CUSTOMER,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title:
      'S/4HANA Universal Journal (ACDOCA) & Business Partner (CVI) Architecture',
    stem: 'How does the Universal Journal table ACDOCA in SAP S/4HANA structurally eliminate the classic reconciliation requirements between Financial Accounting (FI) and Controlling (CO)? Also explain the architectural transition from legacy Customer/Vendor masters (KNA1, LFA1) to the unified Business Partner (BUT000 / CVI).',
    contextPrompt:
      'Candidate must explain the consolidation of FI-GL, FI-AA, CO, and ML into ACDOCA, removal of reconciliation ledgers, single source of truth, elimination of the 999,999 item limit, and Customer-Vendor Integration (CVI) mapping to BUT000.',
    expectedConcepts: [
      'ACDOCA unifies General Ledger (BKPF/BSEG), Controlling (COEP), Asset Accounting (ANEP), and Material Ledger into a single table',
      'Eliminates classic month-end reconciliation between FI and CO; secondary cost elements are now G/L accounts',
      'Elimination of the historic 999,999 line item limit per financial document',
      'Business Partner (table BUT000) acts as single master entity linked via Customer-Vendor Integration (CVI) to legacy tables for backwards compatibility',
      'Parallel ledgers and multiple currencies recorded in real time on the same line item',
    ],
    commonMisconceptions: [
      'Believing BSEG and KNA1/LFA1 were deleted in S/4HANA (they exist as compatibility views or synchronization targets via CVI)',
      'Thinking secondary cost elements still require a separate CO document number range distinct from G/L documents',
    ],
    probingQuestions: [
      {
        id: 'probe-acdoca-1',
        probeText:
          'In S/4HANA, what happened to secondary cost elements, and how are CO allocations reflected in the general ledger?',
        targetConcept:
          'Eliminates classic month-end reconciliation between FI and CO; secondary cost elements are now G/L accounts',
        triggerCondition: 'missing_concept' as const,
      },
      {
        id: 'probe-acdoca-2',
        probeText:
          'During S/4HANA greenfield or brownfield migrations, why is Customer-Vendor Integration (CVI) synchronization considered the most critical pre-requisite?',
        targetConcept:
          'Business Partner (table BUT000) acts as single master entity linked via Customer-Vendor Integration (CVI)',
        triggerCondition: 'superficial_explanation' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Cannot explain ACDOCA or why FI and CO were reconciled in legacy ECC.',
        keyIndicators: [
          'Confuses S/4HANA table architecture with ECC tables',
          'Unaware of Business Partner CVI unification',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Explains ACDOCA unifies tables, but unclear on CVI or secondary cost element accounting.',
        keyIndicators: [
          'Knows ACDOCA exists',
          'Unclear on secondary cost elements as G/L accounts',
          'Vague on CVI pre-migration requirements',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Accurate breakdown of ACDOCA line items, CVI data model, and compatibility view mechanics.',
        keyIndicators: [
          'Explains single source of truth and no reconciliation ledgers',
          'Accurate BUT000 and CVI role assignments',
          'Parallel ledger line items in ACDOCA',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Deep expertise in real-time document splitting, multi-ledger posting, extension ledgers, and CVI pre-migration check reports.',
        keyIndicators: [
          'Extension ledger delta posting mechanisms',
          'CVI synchronization Cockpit and MDS_LOAD_COCKPIT',
          'Universal Journal memory footprint optimization on SAP HANA',
        ],
      },
    ],
  },
  {
    competencySlug: 'sap_btp_cloud_integration',
    domain: ProfessionalDomain.SAP,
    companyCategories: [
      CompanyCategory.SAP_PRODUCT,
      CompanyCategory.SAP_CONSULTING,
      CompanyCategory.SAP_CUSTOMER,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_1,
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title:
      'Enterprise Integration with SAP Cloud Integration (CPI): Resilient iFlow Design',
    stem: 'How do you architect an asynchronous, fault-tolerant integration flow (iFlow) in SAP Cloud Integration (CPI) between S/4HANA and an external third-party cloud application? Detail how you implement the Idempotent Receiver pattern, Exception Subprocesses, and secure credential handling via the BTP Destination Service.',
    contextPrompt:
      'Candidate should explain CPI iFlow architecture, Idempotent Receiver pattern to prevent duplicate processing, Exception Subprocess routing with alert notifications, BTP Destination Service with OAuth 2.0/mTLS, and SAP Cloud Connector for on-premise connectivity.',
    expectedConcepts: [
      'Cloud Integration (CPI) iFlow architecture with sender/receiver channels, message mapping, and content transformers',
      'Idempotent Receiver pattern: message ID deduplication store to prevent duplicate postings upon network retries',
      'Exception Subprocess handling: catching runtime failures, generating standardized error payloads, and alerting',
      'Secure credential management via BTP Destination Service using OAuth 2.0 or mTLS certificates without hardcoding',
      'SAP Cloud Connector: reverse-proxy TLS tunnel enabling secure outbound-initiated connection to on-premise S/4HANA',
      'Splitter / Aggregator and Content Enricher patterns for high-volume batch payloads',
    ],
    commonMisconceptions: [
      'Assuming retry mechanisms alone solve transmission failures without an idempotent receiver (causes duplicate billing or order creation)',
      'Hardcoding API keys or endpoints in Groovy scripts instead of using BTP Secure Store and Destinations',
    ],
    probingQuestions: [
      {
        id: 'probe-cpi-1',
        probeText:
          'If an external vendor sends the same transaction payload twice due to a timeout retry, how does your CPI iFlow ensure it is only posted once in S/4HANA?',
        targetConcept:
          'Idempotent Receiver pattern: message ID deduplication store to prevent duplicate postings',
        triggerCondition: 'missing_concept' as const,
      },
      {
        id: 'probe-cpi-2',
        probeText:
          'How does SAP Cloud Connector allow CPI in the public cloud to securely reach an on-premise S/4HANA system without opening any inbound ports on the corporate firewall?',
        targetConcept:
          'SAP Cloud Connector: reverse-proxy TLS tunnel enabling secure outbound-initiated connection',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Suggests point-to-point connections with hardcoded credentials; unfamiliar with CPI components.',
        keyIndicators: [
          'No understanding of CPI architecture',
          'Suggests hardcoding credentials in code',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Can build a basic iFlow, but lacks knowledge of Idempotent Receiver pattern or Exception Subprocesses.',
        keyIndicators: [
          'Knows basic sender/receiver channels',
          'Unclear on message deduplication',
          'Vague on Cloud Connector reverse invoke tunnel',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Comprehensive command of CPI design: message deduplication, secure destinations, Cloud Connector, and exception flows.',
        keyIndicators: [
          'Clear Idempotent Receiver implementation',
          'Standardized Exception Subprocess error handling',
          'Secure BTP Destination and Cloud Connector configuration',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Enterprise architect level: message queueing (JMS/Event Mesh), Camel simple expression optimization, payload stream handling, and CI/CD for iFlows.',
        keyIndicators: [
          'JMS transaction boundaries and dead letter queueing',
          'Streaming XML/JSON parser for memory efficiency on CPI worker nodes',
          'Automated iFlow testing via Postman/Newman and transport management (TMS)',
        ],
      },
    ],
  },
  {
    competencySlug: 'sap_btp_cloud_integration',
    domain: ProfessionalDomain.SAP,
    companyCategories: [
      CompanyCategory.SAP_PRODUCT,
      CompanyCategory.SAP_CONSULTING,
      CompanyCategory.SAP_CUSTOMER,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title:
      'Event-Driven Architecture with SAP Event Mesh & Cloud Application Programming (CAP)',
    stem: 'How do you build a responsive, decoupled enterprise application using SAP Event Mesh and the Cloud Application Programming (CAP) model? Describe how standard business events (e.g., Sales Order Created in S/4HANA) are published, routed, and consumed asynchronously.',
    contextPrompt:
      'Candidate must explain Event-Driven Architecture (EDA) with SAP Event Mesh, CloudEvents specification, event enablement in S/4HANA, and consuming events in CAP Node.js / Java services.',
    expectedConcepts: [
      'Event-Driven Architecture (EDA) decoupling producers and consumers to absorb traffic spikes and isolate outages',
      'CloudEvents 1.0 open standard format for structured event headers and payloads',
      'S/4HANA Event Enablement: publishing standard business events via Enterprise Event Enablement framework',
      'SAP Event Mesh queue subscriptions, topic filters, and message acknowledgment (ACK/NACK)',
      'CAP framework integration: subscribing to events declaratively using @sap/cds messaging services',
    ],
    commonMisconceptions: [
      'Confusing event notification (lean payload with ID/timestamp) with heavy message transfer (full document dump)',
      'Assuming synchronous REST calls are as reliable as asynchronous event streaming for distributed systems',
    ],
    probingQuestions: [
      {
        id: 'probe-event-1',
        probeText:
          'Why does SAP recommend sending lightweight event notifications (containing only entity ID and event type) rather than full business document payloads in Event Mesh?',
        targetConcept:
          'CloudEvents 1.0 open standard format for structured event headers and payloads',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-event-2',
        probeText:
          'How does CAP (@sap/cds) handle event consumer failures, dead-letter queues, and message redelivery?',
        targetConcept:
          'SAP Event Mesh queue subscriptions, topic filters, and message acknowledgment',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Cannot explain the difference between REST polling and event-driven architecture.',
        keyIndicators: [
          'Confuses polling with event streaming',
          'Unaware of SAP Event Mesh',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Explains message queues, but unfamiliar with SAP Event Mesh or CAP event integration.',
        keyIndicators: [
          'Knows publisher/subscriber pattern',
          'Vague on S/4HANA event enablement',
          'Unclear on CAP @sap/cds messaging bindings',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Clear mastery of S/4HANA event enablement, Event Mesh topics/queues, and CAP event handlers.',
        keyIndicators: [
          'Precise CloudEvents format structure',
          'Event Mesh queue binding to topics',
          'Declarative CAP messaging implementation',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Architect-level: event choreography vs orchestration, transactional outbox pattern for guaranteed event delivery, and high-volume scaling.',
        keyIndicators: [
          'Transactional outbox pattern in S/4HANA to avoid dual-write hazards',
          'Advanced Event Mesh (AEM) broker federation',
          'Dynamic event routing and consumer backpressure management',
        ],
      },
    ],
  },
  {
    competencySlug: 'sap_tm_logistics',
    domain: ProfessionalDomain.SAP,
    companyCategories: [
      CompanyCategory.SAP_CONSULTING,
      CompanyCategory.SAP_PRODUCT,
      CompanyCategory.SAP_CUSTOMER,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_1,
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'SAP TM Freight Unit Building & Transportation Cockpit',
    stem: 'In SAP Transportation Management (TM), explain how order demand from S/4HANA Sales Orders or Deliveries is converted into Freight Units (FUs), and how the Transportation Cockpit optimizes capacity planning.',
    contextPrompt:
      'Candidate must explain FUBR (Freight Unit Building Rules), conditions, incompatibility rules, Freight Orders (FO), and Cockpit Gantt/Map optimization.',
    expectedConcepts: [
      'Freight Unit Building Rule (FUBR) splitting and consolidation based on weight, volume, or pieces',
      'Incompatibility settings (e.g. hazardous materials vs food products, vehicle type restrictions)',
      'Planning profile and optimization runs in the Transportation Cockpit',
      'Freight Order (FO) creation, carrier selection, and tendering',
      'Integration points with S/4HANA Sales Order (SO) and Outbound Delivery (OBD)',
    ],
    commonMisconceptions: [
      'Confusing Freight Unit with Freight Order (FU is demand; FO is execution/capacity)',
      'Assuming FUBR only splits on item quantity without considering weight/volume limits or incompatibilities',
    ],
    probingQuestions: [
      {
        id: 'probe-tm-1',
        probeText:
          'What is the precise architectural distinction between a Freight Unit (FU) and a Freight Order (FO) in SAP TM?',
        targetConcept:
          'Freight Order (FO) creation, carrier selection, and tendering',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-tm-2',
        probeText:
          'How do Incompatibility Rules in SAP TM prevent illegal cargo combinations during automated VSR optimization?',
        targetConcept:
          'Incompatibility settings (e.g. hazardous materials vs food products, vehicle type restrictions)',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Confuses standard ERP shipping with TM architecture; cannot articulate what FUBR is.',
        keyIndicators: [
          'Does not know FUBR',
          'Confuses shipment document with Freight Order',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Explains Freight Units, but vague on Cockpit optimization parameters or incompatibility handling.',
        keyIndicators: [
          'Knows FU concept',
          'Unclear on VSR optimization steps',
          'Vague ERP integration flow',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Strong architectural command of FUBR, incompatibility matrices, Transportation Cockpit profiles, and carrier tendering.',
        keyIndicators: [
          'Clear FUBR configuration logic',
          'Incompatibility definitions',
          'S/4HANA SO to FO end-to-end integration flow',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Expert implementation mastery: multi-stage routing, carrier charge calculation sheet (TCCS), settlement with ERP MM, and BAdI enhancement spots.',
        keyIndicators: [
          'Transportation Charge Management (TCM) integration',
          'Freight settlement document (FSD) to PO/SES',
          'Custom FUBR BAdI extensions',
        ],
      },
    ],
  },
  {
    competencySlug: 'sap_tm_logistics',
    domain: ProfessionalDomain.SAP,
    companyCategories: [
      CompanyCategory.SAP_CONSULTING,
      CompanyCategory.SAP_PRODUCT,
      CompanyCategory.SAP_CUSTOMER,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'SAP TM Incompatibility Management & Multimodal Routing Integration',
    stem: 'Explain how SAP TM models complex multi-stage transportation chains (e.g., road-rail-sea-road) and how Incompatibility Rules enforce physical, regulatory, and customer-specific routing constraints during automated planning.',
    contextPrompt:
      'Candidate must explain multi-stage transport, incompatibility matrices, Transportation Network (locations, lanes, transshipment points), Freight Settlement Documents (FSD), and EWM integration via Transportation Units (TU).',
    expectedConcepts: [
      'Multi-stage transportation modeling: pre-carriage, main carriage, and on-carriage legs',
      'Incompatibility matrices: hazard goods classes, vehicle equipment constraints, carrier-location restrictions',
      'Transportation Network definition: transshipment locations, transportation lanes, and default routing',
      'Freight Settlement Document (FSD) integration with S/4HANA MM for automated Purchase Order and Service Entry Sheet creation',
      'Integration with SAP Extended Warehouse Management (EWM) via Transportation Units (TU) and dock appointment scheduling',
    ],
    commonMisconceptions: [
      'Thinking TM only plans single-leg truck shipments and cannot model multimodal transshipment hubs',
      'Assuming freight cost settlement requires manual invoice entry instead of automated FSD-to-SES posting',
    ],
    probingQuestions: [
      {
        id: 'probe-tm-multi-1',
        probeText:
          'How does SAP TM coordinate the physical handover of cargo between a long-haul carrier and a local warehouse managed by SAP EWM?',
        targetConcept:
          'Integration with SAP Extended Warehouse Management (EWM) via Transportation Units (TU)',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-tm-multi-2',
        probeText:
          'Explain how Incompatibility Rules interact with the VSR (Vehicle Scheduling and Routing) optimizer during multi-stage routing.',
        targetConcept:
          'Incompatibility matrices: hazard goods classes, vehicle equipment constraints, carrier-location restrictions',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Unaware of multi-stage routing or incompatibility concepts.',
        keyIndicators: [
          'Cannot describe transportation stages',
          'Unfamiliar with EWM integration',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Understands legs and transshipment, but vague on EWM integration or FSD settlement.',
        keyIndicators: [
          'Understands transshipment locations',
          'Vague on TU status lifecycle',
          'Unclear on FSD to MM-SES posting',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Strong grasp of multimodal networks, incompatibility matrices, and EWM TU handshakes.',
        keyIndicators: [
          'Accurate multi-stage stage sequence (pre/main/on-carriage)',
          'Clear incompatibility constraint application in VSR',
          'Automated FSD to MM Purchase Order and Service Entry Sheet creation',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Masterful architectural knowledge: Charge Calculation Sheet (TCCS) condition tables, dispute management, and container load optimization.',
        keyIndicators: [
          'TCCS calculation sheet scales and rates',
          'Carrier dispute management workflow in SAP TM',
          '3D package building and container load optimization integration',
        ],
      },
    ],
  },
  {
    competencySlug: 'sap_fico_financials',
    domain: ProfessionalDomain.SAP,
    companyCategories: [
      CompanyCategory.SAP_PRODUCT,
      CompanyCategory.SAP_CONSULTING,
      CompanyCategory.SAP_CUSTOMER,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    difficulty: InterviewDifficulty.HARD,
    title:
      'Universal Journal (ACDOCA), Parallel Ledgers, and Multi-GAAP Accounting',
    stem: 'In SAP S/4HANA Finance, explain how the Universal Journal (ACDOCA) handles Multi-GAAP compliance through Parallel Ledgers (Leading vs. Non-Leading ledgers). How does Document Splitting work at the database level to produce balanced balance sheets by Segment and Profit Center?',
    contextPrompt:
      'Candidate must explain ACDOCA multi-ledger capabilities, Leading Ledger (0L) vs Non-Leading Ledgers, Document Splitting rules (passive, active, zero-balance clearing), and real-time CO-FI integration.',
    expectedConcepts: [
      'Universal Journal (ACDOCA) records all transactions across multiple ledgers simultaneously in real time',
      'Leading Ledger (0L) represents group reporting standard (e.g., IFRS) while Non-Leading Ledgers handle local statutory GAAPs (e.g., US GAAP, Local GAAP)',
      'Document Splitting: passive splitting (inheriting account assignments from prior documents like PO or invoice)',
      'Active (rule-based) document splitting and zero-balance clearing accounts ensuring debit = credit per Profit Center and Segment',
      'Real-time CO-FI posting: secondary cost elements are G/L accounts, eliminating reconciliation ledgers',
      'Continuous accounting / Fast Close: financial reports execute directly against ACDOCA without batch balance rollups',
    ],
    commonMisconceptions: [
      'Believing Document Splitting can be easily activated in an already live S/4HANA system without a complex migration project',
      'Thinking Non-Leading Ledgers duplicate all database records unnecessarily (Extension Ledgers provide delta-only postings)',
    ],
    probingQuestions: [
      {
        id: 'probe-fico-1',
        probeText:
          'What is the specific role of the Zero-Balance Clearing Account in S/4HANA Document Splitting when an entry involves multiple segments?',
        targetConcept:
          'Active (rule-based) document splitting and zero-balance clearing accounts ensuring debit = credit per Profit Center and Segment',
        triggerCondition: 'missing_concept' as const,
      },
      {
        id: 'probe-fico-2',
        probeText:
          'What is the architectural difference between a standard Non-Leading Ledger and an Extension Ledger in S/4HANA Finance?',
        targetConcept:
          'Leading Ledger (0L) represents group reporting standard while Non-Leading Ledgers handle local statutory GAAPs',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description:
          'Cannot explain parallel ledgers or confuses document splitting with standard payment terms.',
        keyIndicators: [
          'Confuses ledgers with company codes',
          'Unaware of Document Splitting purpose',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Explains Leading vs Non-Leading ledgers, but unclear on Document Splitting zero-balance clearing or Extension Ledgers.',
        keyIndicators: [
          'Knows 0L is leading ledger',
          'Vague on passive vs active document splitting',
          'Unclear on Extension Ledger mechanics',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Deep technical mastery of ACDOCA multi-GAAP entries, active/passive document splitting, and fast close benefits.',
        keyIndicators: [
          'Explains zero-balance clearing entry generation in ACDOCA',
          'Multi-GAAP parallel ledger valuation postings (foreign currency, depreciation)',
          'Elimination of batch reconciliation rollups for fast close',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Elite architectural expertise: currency types (Global, Group, Functional), Central Finance (CFIN) replication, and ledger-specific postings (FB01L).',
        keyIndicators: [
          'Functional currency configuration and freetree currencies in S/4HANA',
          'Central Finance (CFIN) real-time replication via SLT into ACDOCA',
          'Ledger-group postings (FB01L) for adjustment entries',
        ],
      },
    ],
  },
  {
    competencySlug: 'sap_fico_financials',
    domain: ProfessionalDomain.SAP,
    companyCategories: [
      CompanyCategory.SAP_PRODUCT,
      CompanyCategory.SAP_CONSULTING,
      CompanyCategory.SAP_CUSTOMER,
    ],
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    difficulty: InterviewDifficulty.MEDIUM,
    title: 'S/4HANA Margin Analysis vs Classic Costing-Based CO-PA',
    stem: 'Why did SAP shift from classic Costing-Based CO-PA (Profitability Analysis) to S/4HANA Margin Analysis (Account-Based CO-PA), and what were the architectural challenges solved in ACDOCA?',
    contextPrompt:
      'Candidate must explain Margin Analysis unified in ACDOCA, elimination of reconciliation differences between CE1/CE2 value fields and G/L accounts, real-time COGS splitting, and real-time production variance splitting.',
    expectedConcepts: [
      'Margin Analysis is fully unified with General Ledger in ACDOCA using standard G/L accounts rather than separate value fields',
      'Eliminates permanent reconciliation gaps between classic CO-PA (CE1/CE2/CE3 tables) and G/L accounting (BKPF/BSEG)',
      'Real-time Cost of Goods Sold (COGS) splitting across multiple G/L accounts at Goods Issue based on standard cost component split',
      'Real-time production variance splitting at order settlement directly into variance category G/L accounts',
      'Predictive accounting integration: creating simulated ACDOCA records from incoming sales orders before billing',
    ],
    commonMisconceptions: [
      "Assuming Costing-Based CO-PA is the default in S/4HANA (Margin Analysis is SAP's strategic direction)",
      'Thinking Margin Analysis cannot split COGS or variances like costing-based CO-PA did (it does so natively at the G/L level)',
    ],
    probingQuestions: [
      {
        id: 'probe-margin-1',
        probeText:
          'In classic ECC, why was reconciling Costing-Based CO-PA with the General Ledger notoriously difficult at month-end?',
        targetConcept:
          'Eliminates permanent reconciliation gaps between classic CO-PA and G/L accounting',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-margin-2',
        probeText:
          'How does S/4HANA split the Cost of Goods Sold (COGS) across multiple accounts at Goods Issue rather than waiting for invoice billing?',
        targetConcept:
          'Real-time Cost of Goods Sold (COGS) splitting across multiple G/L accounts at Goods Issue',
        triggerCondition: 'deep_dive' as const,
      },
    ],
    rubricGuide: [
      {
        rating: EvaluationRating.POOR,
        description: 'Does not know what CO-PA or Margin Analysis is.',
        keyIndicators: [
          'Confuses CO-PA with Cost Center Accounting',
          'Unaware of Margin Analysis in S/4HANA',
        ],
      },
      {
        rating: EvaluationRating.DEVELOPING,
        description:
          'Knows Margin Analysis is account-based, but cannot explain COGS splitting or variance category breakdowns.',
        keyIndicators: [
          'Knows Margin Analysis uses accounts instead of value fields',
          'Vague on timing of COGS splitting at Goods Issue',
          'Unclear on variance category mapping',
        ],
      },
      {
        rating: EvaluationRating.PROFICIENT,
        description:
          'Clear understanding of ACDOCA unification, real-time COGS split, variance split, and elimination of reconciliation issues.',
        keyIndicators: [
          'Detailed explanation of COGS split configuration via cost component split',
          'Production variance category accounts (input price, quantity, lot size)',
          'Instant reconciliation with G/L balance sheets',
        ],
      },
      {
        rating: EvaluationRating.STRONG,
        description:
          'Advanced mastery: Predictive Accounting for sales orders, derivation of profitability characteristics via BAdIs, and integration with SAC (SAP Analytics Cloud).',
        keyIndicators: [
          'Predictive Accounting extension ledger entries on incoming Sales Orders',
          'Derivation rules for custom profitability characteristics in ACDOCA',
          'Real-time reporting in SAP Analytics Cloud (SAC) via CDS Consumption views',
        ],
      },
    ],
  },
];
