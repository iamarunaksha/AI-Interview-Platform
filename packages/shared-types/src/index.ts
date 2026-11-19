// ============================================================
// Shared Types for AI Interview Platform
// ============================================================
// These types are shared between the frontend (Next.js) and
// backend (NestJS). When you change a type here, TypeScript
// will flag any mismatches in both apps at compile time.
// ============================================================

// ---- Enums ----
// Using string enums so values are readable in JSON, logs, and DB.

/** User account status */
export enum UserStatus {
  ACTIVE = "active",
  INACTIVE = "inactive",
  SUSPENDED = "suspended",
}

/** Professional domain the candidate is preparing for */
export enum ProfessionalDomain {
  SDE = "sde",
  SAP = "sap",
}

/** Company category within a domain */
export enum CompanyCategory {
  FAANG_STYLE = "faang_style",
  PRODUCT_COMPANY = "product_company",
  SERVICE_COMPANY = "service_company",
  SAP_PRODUCT = "sap_product",
  SAP_CONSULTING = "sap_consulting",
  SAP_CUSTOMER = "sap_customer",
}

/** SDE experience levels */
export enum ExperienceLevel {
  FRESHER = "fresher",
  SDE_1 = "sde_1",
  SDE_2 = "sde_2",
  SENIOR = "senior",
  STAFF = "staff",
}

/** Interview difficulty */
export enum InterviewDifficulty {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

/** Interview session status */
export enum InterviewStatus {
  CREATED = "created",
  IN_PROGRESS = "in_progress",
  PAUSED = "paused",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  ERROR = "error",
}

/** Finite State Machine Stages of an Interview */
export enum InterviewStage {
  GREETING = "greeting",
  PROBLEM_FRAMING = "problem_framing",
  PROBING = "probing",
  DEEP_DIVE = "deep_dive",
  WRAP_UP = "wrap_up",
  CONCLUDED = "concluded",
}

/** Interview mode determines behavior policies */
export enum InterviewMode {
  PRACTICE = "practice",
  ASSESSMENT = "assessment",
  LEARNING = "learning",
}

/** Interviewer communication style (not evaluation standards) */
export enum InterviewerPersonality {
  PROFESSIONAL = "professional",
  FRIENDLY = "friendly",
  STRICT = "strict",
}

/** Who sent a message in the interview */
export enum MessageRole {
  ASSISTANT = "assistant",
  CANDIDATE = "candidate",
  SYSTEM = "system",
}

/** Evaluation score on the 1-4 scale + not assessed */
export enum EvaluationRating {
  POOR = 1,
  DEVELOPING = 2,
  PROFICIENT = 3,
  STRONG = 4,
  NOT_ASSESSED = -1,
}

// ---- API Response Types ----

/**
 * Health check response returned by the backend /health endpoint.
 */
export interface SystemHealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  service: string;
  database: {
    status: "connected" | "disconnected";
    databaseName?: string;
    version?: string;
  };
  domains: ProfessionalDomain[];
  defaultUserStatus: UserStatus;
}

/**
 * Standard API error response.
 * Every error from our API follows this shape.
 */
export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
}

/**
 * Paginated list response using cursor-based pagination.
 *
 * Why cursor-based instead of offset-based?
 * - Offset pagination breaks when items are inserted/deleted between pages
 * - Cursor pagination is stable: "give me items after this ID"
 * - Better performance on large tables (no OFFSET scan)
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total?: number;
  };
}

// ---- Auth Types ----

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  status: UserStatus;
  createdAt: string;
}

// ---- Candidate Profile & Onboarding Types ----

export interface CandidateProfileResponse {
  id: string;
  userId: string;
  domain: ProfessionalDomain | null;
  companyCategory: CompanyCategory | null;
  targetRole: string | null;
  experienceLevel: ExperienceLevel | null;
  preferredDifficulty: InterviewDifficulty;
  preferredDurationMinutes: number;
  preferredPersonality: InterviewerPersonality;
  preferredMode: InterviewMode;
  resumeUrl: string | null;
  resumeFileName: string | null;
  isOnboarded: boolean;
  preferences: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCandidateProfileRequest {
  domain?: ProfessionalDomain;
  companyCategory?: CompanyCategory;
  targetRole?: string;
  experienceLevel?: ExperienceLevel;
  preferredDifficulty?: InterviewDifficulty;
  preferredDurationMinutes?: number;
  preferredPersonality?: InterviewerPersonality;
  preferredMode?: InterviewMode;
  preferences?: Record<string, unknown>;
}

// ---- Interview Configuration Types ----

export interface InterviewConfig {
  domainId: string;
  companyCategoryId: string;
  companyProfileId?: string;
  roleId: string;
  experienceLevelId: string;
  difficulty: InterviewDifficulty;
  durationMinutes: number;
  personality: InterviewerPersonality;
  mode: InterviewMode;
}

export interface InterviewSession {
  id: string;
  candidateId: string;
  config: InterviewConfig;
  status: InterviewStatus;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
}

export interface TranscriptTurn {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: number;
}

export interface CreateInterviewSessionRequest {
  domain?: ProfessionalDomain;
  companyCategory?: CompanyCategory;
  targetRole?: string;
  experienceLevel?: ExperienceLevel;
  difficulty?: InterviewDifficulty;
  durationMinutes?: number;
  personality?: InterviewerPersonality;
  mode?: InterviewMode;
  questionId?: string;
}

export interface InterviewSessionResponse {
  id: string;
  candidateId: string;
  domain: ProfessionalDomain;
  companyCategory: CompanyCategory;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  difficulty: InterviewDifficulty;
  durationMinutes: number;
  personality: InterviewerPersonality;
  mode: InterviewMode;
  status: InterviewStatus;
  currentStage: InterviewStage;
  coveredConcepts: string[];
  currentQuestion?: QuestionResponse | null;
  transcript: TranscriptTurn[];
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrchestratorState {
  sessionId: string;
  stage: InterviewStage;
  turnCount: number;
  stageTurnCount: number;
  stageStartedAt: number;
  coveredConcepts: string[];
  remainingConcepts: string[];
  activeProbingQuestion?: ProbingQuestion | null;
  timeAllocations: Record<InterviewStage, number>; // in seconds
  elapsedSeconds: number;
}

export interface OrchestratorTransitionEvent {
  fromStage: InterviewStage;
  toStage: InterviewStage;
  reason: string;
  timestamp: number;
}

// ---- Conversation Event Types ----
// These are the canonical events that flow over WebSocket.
// Every AI provider adapter normalizes its events into these.

export type ConversationEvent =
  | { type: "session.ready"; timestamp: number }
  | { type: "candidate.speech.started"; timestamp: number }
  | { type: "candidate.speech.ended"; timestamp: number }
  | { type: "candidate.transcript.partial"; text: string; timestamp: number }
  | { type: "candidate.transcript.final"; text: string; timestamp: number }
  | { type: "assistant.response.started"; timestamp: number }
  | { type: "assistant.transcript.delta"; text: string; timestamp: number }
  | { type: "assistant.transcript.final"; text: string; timestamp: number }
  | { type: "assistant.audio.chunk"; audio: Uint8Array; timestamp: number }
  | { type: "assistant.audio.ended"; timestamp: number }
  | { type: "assistant.interrupted"; timestamp: number }
  | { type: "turn.completed"; timestamp: number }
  | { type: "interview.status"; status: InterviewStatus; timestamp: number }
  | { type: "session.error"; code: string; message: string; timestamp: number }
  | { type: "session.ended"; reason: string; timestamp: number }
  | { type: "orchestrator.state"; state: OrchestratorState; timestamp: number }
  | {
      type: "orchestrator.transition";
      transition: OrchestratorTransitionEvent;
      timestamp: number;
    }
  | {
      type: "evidence.recorded";
      evidence: EvidenceRecord;
      timestamp: number;
    }
  | {
      type: "video.state";
      isCameraActive: boolean;
      layoutMode?: VideoLayoutMode;
      timestamp: number;
    };

// ---- Evidence Types ----

export enum ReasoningQuality {
  POOR = "poor",
  FAIR = "fair",
  GOOD = "good",
  EXCELLENT = "excellent",
}

export interface EvidenceRecord {
  id: string;
  sessionId: string;
  competencyId?: string | null;
  turnId?: string | null;
  questionAsked: string;
  candidateAnswer: string;
  technicalClaims: string[];
  correctConcepts: string[];
  incorrectConcepts: string[];
  missingConcepts: string[];
  reasoningQuality: ReasoningQuality;
  practicalExperience: boolean;
  confidence: number;
  notes: string;
  createdAt: string;
}

export interface ExtractEvidenceRequest {
  sessionId: string;
  questionAsked: string;
  candidateAnswer: string;
  competencyId?: string;
  turnId?: string;
  expectedConcepts?: string[];
  commonMisconceptions?: string[];
}

// ---- Evaluation Types ----

export interface CompetencyScore {
  id?: string;
  competencyId: string;
  competencyName: string;
  score: number | null;
  rating: EvaluationRating;
  justification: string;
  evidenceRefs?: string[];
  sufficientEvidence: boolean;
}

export interface InterviewReport {
  id: string;
  sessionId: string;
  overallScore: number | null;
  overallRating: EvaluationRating;
  summary: string;
  competencyScores: CompetencyScore[];
  strengths: string[];
  weaknesses: string[];
  incorrectStatements: string[];
  areasNotAssessed: string[];
  recommendations: string[];
  suggestedNextDifficulty: InterviewDifficulty;
  evaluatorModel?: string;
  evaluatorProvider?: string;
  generatedAt: string;
}

// ---- Phase 9: Report & Dashboard Types ----

export enum ReportStatus {
  GENERATED = "GENERATED",
  ARCHIVED = "ARCHIVED",
}

export interface DetailedReportEvidence {
  id: string;
  competencyId?: string;
  competencyName: string;
  questionAsked: string;
  candidateAnswer: string;
  technicalClaims: string[];
  correctConcepts: string[];
  incorrectConcepts: string[];
  missingConcepts: string[];
  reasoningQuality: ReasoningQuality;
  practicalExperience: boolean;
  confidence: number;
}

export interface ComprehensiveInterviewReport {
  id: string;
  sessionId: string;
  evaluationId: string;
  candidateName: string;
  candidateEmail: string;
  domain: ProfessionalDomain;
  targetRole: string;
  experienceLevel: ExperienceLevel;
  difficulty: InterviewDifficulty;
  durationMinutes: number;
  actualDurationSeconds: number | null;
  sessionStatus: InterviewStatus;
  overallScore: number | null;
  overallRating: EvaluationRating;
  summary: string;
  competencyScores: CompetencyScore[];
  detailedEvidence: DetailedReportEvidence[];
  strengths: string[];
  weaknesses: string[];
  incorrectStatements: string[];
  areasNotAssessed: string[];
  recommendations: string[];
  suggestedNextDifficulty: InterviewDifficulty;
  evaluatorModel: string;
  evaluatorProvider: string;
  transcriptLength: number;
  status: ReportStatus;
  generatedAt: string;
}

export interface CompetencyPerformanceSummary {
  competencyId: string;
  competencyName: string;
  category: string;
  averageScore: number;
  latestScore: number;
  evaluationsCount: number;
}

export interface CandidateSessionSummary {
  id: string;
  domain: ProfessionalDomain;
  targetRole: string;
  difficulty: InterviewDifficulty;
  status: InterviewStatus;
  overallScore: number | null;
  overallRating: EvaluationRating | null;
  durationMinutes: number;
  actualDurationSeconds: number | null;
  hasReport: boolean;
  createdAt: string;
  endedAt: string | null;
}

export interface CandidateDashboardMetrics {
  totalInterviews: number;
  completedInterviews: number;
  inProgressInterviews: number;
  averageScore: number | null;
  highestScore: number | null;
  ratingDistribution: Record<EvaluationRating, number>;
  competencyPerformance: CompetencyPerformanceSummary[];
  recentSessions: CandidateSessionSummary[];
  topStrengths: string[];
  focusAreas: string[];
  recommendedNextStep: {
    suggestedDifficulty: InterviewDifficulty;
    recommendedTopics: string[];
  };
}

// ---- Competency & Question Bank Types ----

export interface CompetencyResponse {
  id: string;
  domain: ProfessionalDomain;
  name: string;
  slug: string;
  category: string;
  description: string;
  isActive: boolean;
}

export interface ProbingQuestion {
  id: string;
  probeText: string;
  targetConcept: string;
  triggerCondition:
    | "missing_concept"
    | "superficial_explanation"
    | "incorrect_claim"
    | "deep_dive";
}

export interface RubricLevelGuide {
  rating: EvaluationRating;
  description: string;
  keyIndicators: string[];
}

export interface QuestionResponse {
  id: string;
  competencyId: string;
  competency?: CompetencyResponse;
  domain: ProfessionalDomain;
  companyCategories: CompanyCategory[];
  experienceLevels: ExperienceLevel[];
  difficulty: InterviewDifficulty;
  title: string;
  stem: string;
  contextPrompt: string;
  expectedConcepts: string[];
  commonMisconceptions: string[];
  probingQuestions: ProbingQuestion[];
  rubricGuide: RubricLevelGuide[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface InterviewPlanResponse {
  sessionTrack: {
    domain: ProfessionalDomain;
    companyCategory: CompanyCategory;
    targetRole: string;
    experienceLevel: ExperienceLevel;
    difficulty: InterviewDifficulty;
    durationMinutes: number;
  };
  competencies: CompetencyResponse[];
  questions: QuestionResponse[];
  estimatedQuestionsCount: number;
}

// ---- AI Provider Abstraction Contracts ----

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LlmGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  responseMimeType?: "text/plain" | "application/json";
  stopSequences?: string[];
}

export interface LlmGenerateResult {
  text: string;
  finishReason?: string;
  modelName: string;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
}

export interface AiProviderInfo {
  name: string;
  role: "llm" | "realtime" | "stt" | "tts" | "evaluation";
  isConfigured: boolean;
  isAvailable: boolean;
  modelName: string;
  details?: string;
}

export interface AiSystemStatusResponse {
  activeProviders: {
    llm: string;
    realtime: string;
    stt: string;
    tts: string;
    evaluation: string;
  };
  providers: AiProviderInfo[];
}

export interface TestGenerateRequest {
  prompt: string;
  provider?: string;
  systemInstruction?: string;
}

export interface TestGenerateResponse {
  provider: string;
  model: string;
  output: string;
  latencyMs: number;
}

// ---- Phase 10: Coding Interview Types ----

export enum ProgrammingLanguage {
  TYPESCRIPT = "typescript",
  JAVASCRIPT = "javascript",
  PYTHON = "python",
  JAVA = "java",
  GO = "go",
  CPP = "cpp",
}

export enum CodeExecutionStatus {
  PASSED = "PASSED",
  FAILED = "FAILED",
  TIMED_OUT = "TIMED_OUT",
  COMPILE_ERROR = "COMPILE_ERROR",
  RUNTIME_ERROR = "RUNTIME_ERROR",
}

export interface TestCase {
  id: string;
  input: unknown;
  expectedOutput: unknown;
  description?: string;
  isHidden?: boolean;
}

export interface TestCaseResult {
  id: string;
  description?: string;
  input: unknown;
  expectedOutput: unknown;
  actualOutput: unknown;
  passed: boolean;
  executionTimeMs: number;
  error?: string;
  stdout?: string;
}

export interface CodeExecutionResult {
  language: ProgrammingLanguage;
  status: CodeExecutionStatus;
  totalTests: number;
  passedTests: number;
  runtimeMs: number;
  memoryMb?: number;
  results: TestCaseResult[];
  compilerOutput?: string;
  interviewerContextNote?: string;
}

export interface CodeRunRequest {
  sessionId?: string;
  code: string;
  language: ProgrammingLanguage;
  testCases?: TestCase[];
  entryFunction?: string;
}

export interface CodingProblem {
  id: string;
  title: string;
  difficulty: InterviewDifficulty;
  description: string;
  examples: Array<{ input: string; output: string; explanation?: string }>;
  constraints: string[];
  starterCode: Partial<Record<ProgrammingLanguage, string>>;
  testCases: TestCase[];
  entryFunction: string;
}

// ---- Video Interview Types (Phase 11) ----

export enum VideoLayoutMode {
  GRID = "grid",
  PIP = "pip",
  SPEAKER = "speaker",
  SIDEBAR = "sidebar",
}

export interface CameraDevice {
  deviceId: string;
  label: string;
}

export interface VideoQualityMetrics {
  width: number;
  height: number;
  frameRate: number;
  brightnessLevel: "optimal" | "low" | "high";
  isStreamActive: boolean;
}

export interface VideoSessionState {
  isCameraActive: boolean;
  isMirrored: boolean;
  selectedDeviceId?: string;
  layoutMode: VideoLayoutMode;
  consentGranted: boolean;
}

// ---- SAP Interview Specialization Types (Phase 12) ----

/**
 * SAP Enterprise Modules & Functional/Technical Specializations
 */
export enum SapModuleSpecialization {
  ABAP_RAP = "abap_rap",
  S4HANA_CORE = "s4hana_core",
  BTP_INTEGRATION = "btp_integration",
  TM_LOGISTICS = "tm_logistics",
  FICO_FINANCIALS = "fico_financials",
}

/**
 * SAP Clean Core Extensibility Tiers
 */
export enum SapExtensibilityTier {
  KEY_USER_IN_APP = "key_user_in_app", // Tier 1: Low-code / No-code in Fiori (Custom Fields & Logic)
  DEVELOPER_EMBEDDED_STEAMPUNK = "developer_embedded_steampunk", // Tier 2: ABAP Cloud on S/4HANA (Released C1 APIs)
  SIDE_BY_SIDE_BTP = "side_by_side_btp", // Tier 3: BTP CAP / RAP / Event Mesh
  CLASSIC_CUSTOM_CODE = "classic_custom_code", // Legacy: Modifications, classic user exits, SE38 (Anti-pattern in Clean Core)
}

/**
 * Metadata descriptor for an SAP specialization module
 */
export interface SapModuleDescriptor {
  id: SapModuleSpecialization;
  name: string;
  shortCode: string;
  category: "Technical" | "Functional" | "Architectural";
  competencySlug: string;
  description: string;
  keyArchitectures: string[];
  cleanCorePrinciples: string[];
  targetRoles: string[];
}

/**
 * Pre-configured SAP Track Role definitions
 */
export interface SapTrackRoleDefinition {
  title: string;
  slug: string;
  module: SapModuleSpecialization;
  defaultDifficulty: InterviewDifficulty;
  experienceLevels: ExperienceLevel[];
  keyCompetencies: string[];
  focusAreas: string[];
}

export const SAP_MODULE_DESCRIPTORS: Record<
  SapModuleSpecialization,
  SapModuleDescriptor
> = {
  [SapModuleSpecialization.ABAP_RAP]: {
    id: SapModuleSpecialization.ABAP_RAP,
    name: "ABAP RESTful Application Programming Model (RAP) & CDS",
    shortCode: "RAP / CDS",
    category: "Technical",
    competencySlug: "sap_abap_rap",
    description:
      "Core Data Services (CDS), Behavior Definitions, Determinations, Validations, Actions, Early Numbering, Draft handling, and Code-to-Data pushdown.",
    keyArchitectures: [
      "Behavior Definition (BDEF)",
      "Virtual Data Model (VDM)",
      "Draft Buffer",
      "AMDP",
      "OData V4",
    ],
    cleanCorePrinciples: [
      "Strict ABAP Cloud syntax",
      "No direct DB updates or classic COMMIT WORK in save sequence",
      "Released C1 APIs",
    ],
    targetRoles: [
      "SAP ABAP Cloud Developer",
      "SAP RAP / CAP Engineer",
      "SAP Fiori / Full-Stack Developer",
    ],
  },
  [SapModuleSpecialization.S4HANA_CORE]: {
    id: SapModuleSpecialization.S4HANA_CORE,
    name: "S/4HANA Enterprise Core & Clean Core Architecture",
    shortCode: "S/4 Clean Core",
    category: "Architectural",
    competencySlug: "sap_s4hana_core_clean_core",
    description:
      "Universal Journal ACDOCA, Business Partner (BUT000 / CVI), In-App vs Side-by-Side Extensibility, 3-tier Clean Core strategy, and Simplification List.",
    keyArchitectures: [
      "Universal Journal (ACDOCA)",
      "Business Partner (CVI)",
      "Embedded Steampunk",
      "Side-by-Side BTP",
      "Released CDS Views",
    ],
    cleanCorePrinciples: [
      "Zero modifications to core SAP standard",
      "Upgrade stability without regression",
      "Decoupled extensions via public events and APIs",
    ],
    targetRoles: [
      "SAP S/4HANA Solution Architect",
      "SAP Technical Lead",
      "SAP Clean Core Strategist",
    ],
  },
  [SapModuleSpecialization.BTP_INTEGRATION]: {
    id: SapModuleSpecialization.BTP_INTEGRATION,
    name: "SAP BTP, Integration Suite & Cloud Architecture",
    shortCode: "BTP / CPI",
    category: "Technical",
    competencySlug: "sap_btp_cloud_integration",
    description:
      "Cloud Integration (CPI) iFlows, Exception Subprocesses, Idempotent Receivers, SAP Event Mesh, Cloud Application Programming (CAP), and Destination Services.",
    keyArchitectures: [
      "Cloud Integration (CPI)",
      "SAP Event Mesh / EDA",
      "SAP CAP Framework",
      "Cloud Connector",
      "API Management",
    ],
    cleanCorePrinciples: [
      "Asynchronous event-driven decoupling",
      "Zero point-to-point hardcoding",
      "Idempotent enterprise messaging",
    ],
    targetRoles: [
      "SAP BTP Integration Consultant",
      "SAP Cloud Architect",
      "SAP Middleware Specialist",
    ],
  },
  [SapModuleSpecialization.TM_LOGISTICS]: {
    id: SapModuleSpecialization.TM_LOGISTICS,
    name: "SAP Transportation Management (TM) & Supply Chain Logistics",
    shortCode: "TM Logistics",
    category: "Functional",
    competencySlug: "sap_tm_logistics",
    description:
      "Freight Unit Building Rules (FUBR), Transportation Cockpit optimization, Incompatibility Rules, Freight Orders, Carrier selection, and ERP/EWM integration.",
    keyArchitectures: [
      "Freight Unit Building Rules (FUBR)",
      "Transportation Cockpit / VSR Optimizer",
      "Freight Order (FO)",
      "Charge Management (TCM)",
      "EWM Integration",
    ],
    cleanCorePrinciples: [
      "Standard TM condition techniques",
      "BAdI enhancement spots without core modifications",
      "Standard Enterprise Services / OData",
    ],
    targetRoles: [
      "SAP TM Functional Consultant",
      "SAP Supply Chain Logistics Architect",
      "SAP TM/EWM Integration Lead",
    ],
  },
  [SapModuleSpecialization.FICO_FINANCIALS]: {
    id: SapModuleSpecialization.FICO_FINANCIALS,
    name: "SAP S/4HANA Finance (FICO) & Financial Architecture",
    shortCode: "S/4 FICO",
    category: "Functional",
    competencySlug: "sap_fico_financials",
    description:
      "Universal Journal ACDOCA table architecture, Parallel Ledgers, Fast Close, Document Splitting, Margin Analysis (Account-based CO-PA), and Real-time Reconciliation.",
    keyArchitectures: [
      "Universal Journal (ACDOCA)",
      "Leading & Non-Leading Ledgers",
      "Document Splitting",
      "Margin Analysis (CO-PA)",
      "Central Finance (CFIN)",
    ],
    cleanCorePrinciples: [
      "Single source of truth in ACDOCA",
      "Automated real-time reconciliation",
      "Standard S/4HANA Financial APIs",
    ],
    targetRoles: [
      "SAP FICO Consultant",
      "SAP Financial Solutions Architect",
      "SAP S/4HANA Finance Lead",
    ],
  },
};

export const SAP_TRACK_ROLES: SapTrackRoleDefinition[] = [
  {
    title: "SAP ABAP Cloud / RAP Developer",
    slug: "sap-abap-cloud-developer",
    module: SapModuleSpecialization.ABAP_RAP,
    defaultDifficulty: InterviewDifficulty.MEDIUM,
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    keyCompetencies: ["sap_abap_rap", "sap_s4hana_core_clean_core"],
    focusAreas: [
      "ABAP RAP",
      "Core Data Services (CDS)",
      "Behavior Definitions",
      "Code-to-Data pushdown",
      "ABAP Cloud syntax",
    ],
  },
  {
    title: "SAP S/4HANA Solution Architect",
    slug: "sap-s4hana-solution-architect",
    module: SapModuleSpecialization.S4HANA_CORE,
    defaultDifficulty: InterviewDifficulty.HARD,
    experienceLevels: [ExperienceLevel.SENIOR, ExperienceLevel.STAFF],
    keyCompetencies: [
      "sap_s4hana_core_clean_core",
      "sap_abap_rap",
      "sap_btp_cloud_integration",
    ],
    focusAreas: [
      "Clean Core strategy",
      "In-App vs Side-by-Side extensibility",
      "Universal Journal ACDOCA",
      "Business Partner migration",
      "Simplification List",
    ],
  },
  {
    title: "SAP BTP Integration Consultant",
    slug: "sap-btp-integration-consultant",
    module: SapModuleSpecialization.BTP_INTEGRATION,
    defaultDifficulty: InterviewDifficulty.MEDIUM,
    experienceLevels: [
      ExperienceLevel.SDE_1,
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
    ],
    keyCompetencies: [
      "sap_btp_cloud_integration",
      "sap_s4hana_core_clean_core",
    ],
    focusAreas: [
      "Cloud Integration (CPI) iFlows",
      "Exception handling",
      "SAP Event Mesh",
      "Cloud Application Programming (CAP)",
      "Cloud Connector",
    ],
  },
  {
    title: "SAP TM Functional Architect",
    slug: "sap-tm-functional-architect",
    module: SapModuleSpecialization.TM_LOGISTICS,
    defaultDifficulty: InterviewDifficulty.MEDIUM,
    experienceLevels: [
      ExperienceLevel.SDE_2,
      ExperienceLevel.SENIOR,
      ExperienceLevel.STAFF,
    ],
    keyCompetencies: ["sap_tm_logistics", "sap_s4hana_core_clean_core"],
    focusAreas: [
      "Freight Unit Building Rules (FUBR)",
      "Transportation Cockpit VSR",
      "Incompatibility Rules",
      "Charge calculation",
      "EWM integration",
    ],
  },
  {
    title: "SAP S/4HANA Finance (FICO) Lead",
    slug: "sap-s4hana-fico-lead",
    module: SapModuleSpecialization.FICO_FINANCIALS,
    defaultDifficulty: InterviewDifficulty.HARD,
    experienceLevels: [ExperienceLevel.SENIOR, ExperienceLevel.STAFF],
    keyCompetencies: ["sap_fico_financials", "sap_s4hana_core_clean_core"],
    focusAreas: [
      "Universal Journal (ACDOCA)",
      "Parallel Ledgers & Multi-GAAP",
      "Document Splitting",
      "Margin Analysis",
      "Fast Close",
    ],
  },
];
