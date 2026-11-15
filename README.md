# InterviewAI Platform

> A production-ready, AI-powered technical interview platform with adaptive voice conversations and independent human-grade evaluations.

---

## Architecture Overview

This project is structured as a **modular monolith** managed with **pnpm workspaces** and **Turborepo**:

```text
interview-platform/
├── apps/
│   ├── web/               # Next.js 16 (App Router, React 19, Tailwind CSS)
│   └── api/               # NestJS 12 (ESM, TypeScript, Vitest, TypeORM)
├── packages/
│   └── shared-types/      # Canonical TypeScript types shared between web & api
├── docs/                  # Architecture Decision Records & design documentation
├── turbo.json             # Monorepo build pipeline & task cache configuration
├── pnpm-workspace.yaml    # Workspace definition
└── PROJECT_STATUS.md      # Live progress and milestone tracking
```

---

## Prerequisites

- **Node.js**: `>= 20.0.0` (v25 recommended)
- **pnpm**: `>= 10.0.0` (`npm install -g pnpm`)
- **PostgreSQL**: `>= 15.0`
- **Redis**: `>= 7.0` (optional in early dev)

---

## Quick Start

### 1. Install Dependencies
```bash
pnpm install
```

### 2. Environment Configuration
Copy `.env.example` templates:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

### 3. Build All Packages
```bash
pnpm build
```

### 4. Start Development Servers
```bash
pnpm dev
```
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **API Server**: [http://localhost:4000](http://localhost:4000)
- **API Health Check**: [http://localhost:4000/health](http://localhost:4000/health)

---

## Key Development Commands

| Command | Action |
|---------|--------|
| `pnpm build` | Compiles all packages in topological order via Turborepo |
| `pnpm dev` | Starts frontend and backend dev servers in parallel |
| `pnpm test` | Runs unit tests across all packages |
| `pnpm type-check` | Verifies TypeScript types without emitting code |
| `pnpm lint` | Runs linters across all packages |
| `pnpm clean` | Cleans build artifacts (`dist`, `.next`, cache) |

---

## Engineering Guidelines

- **Strict Type Sharing**: All API request/response contracts and domain enums live in `packages/shared-types`.
- **Decoupled AI Engine**: The core interview state machine never calls vendor SDKs directly; all voice and LLM capabilities operate behind provider adapters.
- **Independent Evaluation**: Interviewing and grading are two distinct pipelines.

For detailed architecture blueprints and milestone status, see:
- [Phase 0 Architecture Specification](docs/phase-0-architecture.md)
- [PROJECT_STATUS.md](PROJECT_STATUS.md)
