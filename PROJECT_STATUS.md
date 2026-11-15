# Project Status: AI Interview Platform

**Last Updated:** 2026-11-16  
**Current Phase:** Phase 1: Development Environment and Project Setup  
**Phase Status:** IN_PROGRESS  

---

## 1. Phase Progress Overview

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Product and Technical Foundation | **COMPLETED** |
| Phase 1 | Development Environment & Project Setup | **IN_PROGRESS** |
| Phase 2 | Authentication and Candidate Onboarding | NOT_STARTED |
| Phase 3 | Interview Track and Question Bank Engine | NOT_STARTED |
| Phase 4 | AI Provider Abstraction Layer | NOT_STARTED |
| Phase 5 | Voice Interview MVP | NOT_STARTED |
| Phase 6 | Interview Orchestrator | NOT_STARTED |
| Phase 7 | Evidence Collection Engine | NOT_STARTED |
| Phase 8 | Independent Evaluation Engine | NOT_STARTED |
| Phase 9 | Interview Reports and Candidate Dashboard | NOT_STARTED |
| Phase 10 | Coding Interview Environment | NOT_STARTED |
| Phase 11 | Video Interview Experience | NOT_STARTED |
| Phase 12 | SAP Interview Specialization | NOT_STARTED |
| Phase 13 | Testing and Quality Engineering | NOT_STARTED |
| Phase 14 | Production Deployment | NOT_STARTED |
| Phase 15 | Monetization and Enterprise Readiness | NOT_STARTED |

---

## 2. Current Milestone Details (Phase 1)

### Completed Tasks
- [x] Initialized Git repository and configured root `.gitignore`
- [x] Configured pnpm workspaces (`pnpm-workspace.yaml`)
- [x] Set up Turborepo pipeline (`turbo.json`) for parallel caching builds
- [x] Scaffolded `packages/shared-types` with dual NodeNext ESM compliance
- [x] Defined core domain enums, API response shapes, and event types in `shared-types`
- [x] Scaffolded `apps/web` (Next.js 16 App Router, React 19, Tailwind CSS)
- [x] Scaffolded `apps/api` (NestJS 12 ESM with Vitest)
- [x] Linked `@interviewai/shared-types` into both `web` and `api`
- [x] Verified full monorepo build with `turbo run build`
- [x] Created environment configuration templates (`.env.example`) for apps

### Pending Tasks in Phase 1
- [ ] Set up local PostgreSQL database and connection test from NestJS
- [ ] Set up local Redis or in-memory fallback for session/queue management
- [ ] Connect NestJS to PostgreSQL using TypeORM with migration support
- [ ] Verify end-to-end communication: Next.js frontend fetches health status from NestJS backend
- [ ] Verify root linting, formatting, and type-checking scripts across all packages

### Blockers
- None.

### Known Bugs
- None.

---

## 3. Architectural Decisions (Summary of ADRs)

1. **ADR-001: Modular Monolith vs Microservices**
   - **Decision:** Modular monolith in a pnpm monorepo.
   - **Rationale:** Solo developer velocity, shared typing, transactional database integrity, zero network hop overhead between modules. Can be extracted later if scale requires.
2. **ADR-002: Separation of Interviewer and Evaluator**
   - **Decision:** Realtime Interview Orchestrator handles conversational flow; Evaluation Engine runs independently post-interview.
   - **Rationale:** Prevents bias, allows reproducible rubric scoring against full evidence ledger, enables re-evaluation.
3. **ADR-003: Provider-Agnostic AI Abstraction**
   - **Decision:** Adapter Pattern with canonical event protocol (`ConversationEvent`).
   - **Rationale:** Core business logic never imports vendor SDKs directly; swapping Gemini, OpenAI, or Deepgram requires zero changes to interview state machine.

---

## 4. Current Provider Configuration

- **Realtime Voice:** Google Gemini (Live API) [Configured, adapter pending Phase 4]
- **LLM / Orchestrator:** Google Gemini 2.0 Flash
- **Evaluation Engine:** Google Gemini
- **STT/TTS Fallback:** Deepgram (Nova-2 / Aura)

---

## 5. Latest Test Results

- **Shared Types:** Type-check passed (Clean `tsc` compilation to `dist/`)
- **API (NestJS):** Vitest 2/2 tests passed (Root & HealthCheck endpoints)
- **Web (Next.js):** Build successful (`next build` with Turbopack, static page generation passed)
- **Monorepo:** `turbo run build` — 3/3 successful in 2.7s

---

## 6. Next Recommended Action

1. Install/configure PostgreSQL and Redis locally (or configure Docker container).
2. Wire up TypeORM in `apps/api` to connect to PostgreSQL.
3. Create a simple database ping in the health check to prove database connectivity.
4. Wire the frontend page to display the live backend health status.
