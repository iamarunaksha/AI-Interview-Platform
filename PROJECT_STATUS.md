# Project Status: AI Interview Platform

**Last Updated:** 2026-11-16  
**Current Phase:** Phase 1: Development Environment and Project Setup  
**Phase Status:** COMPLETED  

---

## 1. Phase Progress Overview

| Phase | Description | Status |
|-------|-------------|--------|
| Phase 0 | Product and Technical Foundation | **COMPLETED** |
| Phase 1 | Development Environment & Project Setup | **COMPLETED** |
| Phase 2 | Authentication and Candidate Onboarding | **NEXT (NOT_STARTED)** |
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

## 2. Completed Milestones (Phase 1 Acceptance Criteria)

- [x] Initialized Git repository and configured root `.gitignore` (safeguarding all environment secrets)
- [x] Configured pnpm workspaces (`pnpm-workspace.yaml`)
- [x] Set up Turborepo pipeline (`turbo.json`) for parallel caching builds across all packages
- [x] Scaffolded `packages/shared-types` with dual NodeNext ESM compliance
- [x] Defined core domain enums, API response shapes (`SystemHealthResponse`), and canonical WebSocket event types
- [x] Scaffolded `apps/web` (Next.js 16 App Router, React 19, Tailwind CSS)
- [x] Scaffolded `apps/api` (NestJS 12 ESM with Vitest)
- [x] Linked `@interviewai/shared-types` into both `web` and `api`
- [x] Zero-Mac-SSD Policy: Installed tools and `.pnpm-store` strictly on external SSD (`/Volumes/SanDisk SSD/...`)
- [x] Connected NestJS to Supabase PostgreSQL 17.11 via TypeORM (using IPv4 Session Pooler)
- [x] Connected Next.js frontend to fetch live health from NestJS backend
- [x] Automated quality verification: `turbo run build`, `turbo run type-check`, `turbo run test`, `pnpm format:check`, and `lint` all passing with 0 errors.

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
4. **ADR-004: Strict Storage Isolation**
   - **Decision:** External SSD stores all package stores (`.pnpm-store`), tool binaries (`.tools`), and node_modules; PostgreSQL hosted in cloud (Supabase) to maintain zero internal disk impact.

---

## 4. Current Provider & Infrastructure Configuration

- **Database:** Supabase PostgreSQL 17.11 (Managed Cloud, `ap-southeast-2` IPv4 Pooler)
- **Backend Framework:** NestJS 12 (ESM, TypeORM)
- **Frontend Framework:** Next.js 16 (App Router, Turbopack, Tailwind CSS)
- **Realtime Voice:** Google Gemini (Live API) [Configured, adapter in Phase 4]
- **LLM / Orchestrator:** Google Gemini 2.0 Flash
- **Evaluation Engine:** Google Gemini
- **STT/TTS Fallback:** Deepgram (Nova-2 / Aura)

---

## 5. Latest Verification Results

- **Shared Types:** Type-check passed (Clean `tsc` compilation to `dist/`)
- **API (NestJS):** Vitest 2/2 tests passed (Root & HealthCheck endpoints)
- **Web (Next.js):** Build successful (`next build` with Turbopack, static page generation passed)
- **Turborepo:** `turbo run build` — 3/3 successful
- **Linters:** Oxlint (API) & ESLint (Web) passed with 0 errors and 0 warnings
- **Prettier:** 100% compliant (`pnpm format:check`)

---

## 6. Next Recommended Action

**Commence Phase 2: Authentication and Candidate Onboarding**
1. Design database entities (`User`, `CandidateProfile`) with TypeORM.
2. Implement secure authentication (bcrypt password hashing, JWT access & refresh tokens, Auth guards).
3. Build candidate onboarding endpoints (domain, company category, role, experience level, interview preferences).
4. Build the Next.js onboarding wizard UI and candidate dashboard.
