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
    name: 'SAP Transportation Management (TM)',
    slug: 'sap_tm_logistics',
    category: 'Enterprise Functional Architecture',
    description:
      'Transportation cockpit, freight units, charge calculation, carrier selection, ERP/EWM integration, and logistics optimization.',
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
          'FU represents logistics demand; FO represents execution transport capacity',
        triggerCondition: 'superficial_explanation' as const,
      },
      {
        id: 'probe-tm-2',
        probeText:
          'How do Incompatibility Rules in SAP TM prevent illegal cargo combinations (e.g. frozen goods in a standard dry container) during automated VSR optimization?',
        targetConcept: 'Incompatibility rules evaluated during planning runs',
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
    competencySlug: 'sap_abap_development',
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
];
