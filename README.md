# 🎙️ InterviewAI Platform

<div align="center">

![Next.js 16](https://img.shields.io/badge/Next.js%2016-black?style=for-the-badge&logo=next.js&logoColor=white)
![React 19](https://img.shields.io/badge/React%2019-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![NestJS 12](https://img.shields.io/badge/NestJS%2012-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript%205-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL%2017-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io%204-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Turborepo](https://img.shields.io/badge/Turborepo-EF4444?style=for-the-badge&logo=turborepo&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=for-the-badge)

**An enterprise-grade, autonomous AI technical interview platform featuring real-time conversational voice and video, an adaptive multi-stage state machine orchestrator, interactive coding sandboxes, verifiable technical evidence mining, and independent human-grade rubric evaluations.**

[Architecture Blueprint](docs/phase-0-architecture.md) • [API Documentation (Swagger)](#-interactive-api-documentation) • [Installation Guide](#-step-by-step-installation--setup) • [Contributing](#-contributing--license)

</div>

---

## 🌟 Key Capabilities & Features

### 1. Multi-Modal Technical Interview Room

- **Four Adaptive View Modes**: Seamless toggle between **Voice Room**, **Video Room**, **Code Editor**, and **Split View** (live code editor + side-by-side video feed).
- **Zero-Latency Video Signaling**: Real-time webcam streaming with reactive DOM binding, hardware brightness/resolution metrics, and Grid / Picture-in-Picture (PiP) / Speaker layout modes.
- **Synchronized Live Timer & Status**: Automatic tracking of active elapsed seconds with instant WebSocket status synchronization.

### 2. Conversational AI Engine & Finite State Machine (FSM)

- **5-Stage Structured Progression**:
  1. `Greeting` (Rapport & context setting)
  2. `Framing` (Scope definition, constraints, and requirements)
  3. `Probing` (Core technical mechanics, algorithm choices, and trade-offs)
  4. `Deep Dive` (Scaling, failure modes, race conditions, and edge cases)
  5. `Wrap-Up` (Candidate questions and technical debrief)
- **Problem-Aware Dialogue**: Intelligently analyzes candidate technical statements (e.g. hash maps, two pointers, dummy sentinel nodes, tree traversal, B+ tree leaf pointers) and generates dynamic, contextual follow-ups rather than hardcoded scripts.
- **Turn Management & Echo Suppression**: Automatic turn detection with configurable silence buffers and client-side acoustic suppression to eliminate speaker feedback loops.

### 3. Speech Recognition & Accent Calibration

- **Acoustic Calibration**: Native support for **Indian English (`en-IN`)**, **US English (`en-US`)**, and **UK English (`en-GB`)**.
- **Domain-Specific Technical Speech Normalizer**: Regex-based phonetic translation that corrects algorithmic and engineering speech distortions in real-time (e.g. _"we can diving"_ → _"we can dive in"_, _"to sum"_ → _"Two Sum"_, _"rash map"_ → _"hash map"_, _"o of n"_ → _"O(N)"_, _"b plus tree"_ → _"B+ Tree"_).

### 4. Interactive Coding Sandbox & Test Runner

- **Monaco Code Editor**: Full syntax highlighting, auto-completion, and language switching for **TypeScript**, **JavaScript**, and **Python**.
- **Isolated Execution Engine**:
  - **JavaScript/TypeScript**: Runs inside hardened Node.js `node:vm` contexts with stripped host I/O, frozen prototypes, bracket identifier lookups, and CPU timeout guards.
  - **Python**: Runs in subprocess containers with sanitized environment variables (host `DATABASE_URL` and `JWT_SECRET` are never exposed).
- **Automated Verification**: Automatically runs candidate solutions against hidden and visible test suites, calculating execution time in milliseconds and formatting output.

### 5. Verifiable Evidence Collection Engine

- **Non-Invasive Observation**: Extracts technical claims, concepts covered, and common misconceptions silently in the background without biasing the candidate.
- **Grounded Assessment**: Every mined claim links directly to specific transcript turns and timestamps.

### 6. Independent Post-Interview Evaluation Engine

- **Rubric-Based Scoring**: Completely decoupled from the conversational interviewer to eliminate examiner bias.
- **Multi-Competency Analysis**: Assesses Problem Solving, Code Quality, System Architecture, Concurrency, and Communication with 4-tier ratings (Needs Improvement, Meets Bar, Exceeds Bar, Outstanding).
- **Comprehensive Executive Reports**: Generates actionable candidate scorecards, strength/weakness summaries, and radar visualizations.

---

## 🏛️ Monorepo Architecture

This project is organized as a high-performance monorepo managed with **pnpm workspaces** and **Turborepo**:

```text
ai-interview-platform/
├── apps/
│   ├── web/                     # Frontend Application (Next.js 16, React 19, Tailwind CSS)
│   │   ├── src/app/             # Next.js App Router (Interview room, Dashboard, Wizard)
│   │   ├── src/components/      # UI components (Monaco Editor, Video Feed, Transcripts)
│   │   ├── src/context/         # Global state providers (Authentication, Theme)
│   │   └── src/lib/             # Audio recorders, Speech recognition, Video pipeline
│   └── api/                     # Backend API & WebSocket Service (NestJS 12, ESM)
│       ├── src/ai/              # AI Provider Registry (Gemini Live/Realtime, Mock Adapters)
│       ├── src/auth/            # JWT authentication, timing-safe password validation
│       ├── src/coding/          # Code execution sandbox (Node vm & Python subprocesses)
│       ├── src/evaluation/      # Independent rubric evaluation & scoring engine
│       ├── src/evidence/        # Verifiable transcript evidence extraction
│       ├── src/interview/       # WebSocket Gateway & FSM Orchestrator service
│       ├── src/tracks/          # Question bank (DSA, System Design, SAP Clean Core)
│       └── src/database/        # TypeORM PostgreSQL configuration & migrations
├── packages/
│   └── shared-types/            # Shared TypeScript domain contracts, enums & event types
├── docs/                        # Architecture Decision Records (ADRs) & specifications
├── turbo.json                   # Turborepo task pipeline & caching configuration
├── pnpm-workspace.yaml          # Workspace definitions
├── PROJECT_STATUS.md            # Live milestone roadmap and phase completion tracker
└── README.md
```

---

## 💻 Tech Stack

| Layer                  | Technologies                                                                                            |
| :--------------------- | :------------------------------------------------------------------------------------------------------ |
| **Frontend**           | Next.js 16 (App Router), React 19, Tailwind CSS 4, Monaco Editor (`@monaco-editor/react`), Lucide Icons |
| **Backend**            | NestJS 12, Express, Socket.io 4, TypeORM 0.3, Class-Validator, Passport JWT                             |
| **Database & Cache**   | PostgreSQL 15–17 (JSONB support), Redis (Optional for horizontal scaling)                               |
| **AI & Speech**        | Google Gemini API (2.0 Flash / Live), Web Speech API, Web Audio API, WebRTC MediaStream                 |
| **Monorepo & Tooling** | Turborepo 2, pnpm 10 workspaces, Vitest 4, Oxlint, ESLint, Prettier                                     |

---

## 📋 Prerequisites

Before setting up the project locally, ensure you have the following installed on your machine:

- **Node.js**: `>= 20.0.0` (Node 22 LTS or 25 recommended)
- **pnpm**: `>= 10.0.0` (Install via `npm install -g pnpm`)
- **PostgreSQL**: `>= 15.0` (Running locally or via Docker / cloud provider like Supabase/Neon)
- **Python 3**: `>= 3.10` (Required if testing Python sandbox execution locally)

---

## 🚀 Step-by-Step Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/iamarunaksha/AI-Interview-Platform.git
cd AI-Interview-Platform
```

### 2. Install Monorepo Dependencies

```bash
pnpm install
```

### 3. Configure Environment Variables

The project includes pre-configured environment templates. Copy them to initialize your local settings:

```bash
# 1. Configure Backend Environment
cp apps/api/.env.example apps/api/.env

# 2. Configure Frontend Environment
cp apps/web/.env.example apps/web/.env.local
```

#### Backend (`apps/api/.env`) Highlights:

```ini
PORT=4000
NODE_ENV=development

# PostgreSQL Connection
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=postgres
DATABASE_PASSWORD=postgres
DATABASE_NAME=interviewai_dev
# Or supply a unified connection URL:
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/interviewai_dev

# JWT Authentication Secrets (Replace with 256-bit keys in production)
JWT_SECRET=dev-jwt-access-secret-replace-in-production-min-32-chars
JWT_REFRESH_SECRET=dev-jwt-refresh-secret-replace-in-production-min-32-chars

# CORS (Frontend URL)
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# AI Provider Configuration (Default: Gemini 2.0 Flash)
REALTIME_PROVIDER=gemini
LLM_PROVIDER=gemini
EVALUATION_PROVIDER=gemini

# Provider API Keys
# Google Gemini (Free API Key available at https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.0-flash
GEMINI_LIVE_MODEL=gemini-2.0-flash-exp

# Optional: Deepgram Voice (https://console.deepgram.com/)
DEEPGRAM_API_KEY=

# Optional: OpenAI (https://platform.openai.com/api-keys)
OPENAI_API_KEY=
```

#### How to Obtain Your Free Google Gemini API Key:
1. Navigate to **[Google AI Studio](https://aistudio.google.com/app/apikey)** and sign in with your Google account.
2. Click **"Create API Key"** and select or create a Google Cloud project (free tier is automatically enabled).
3. Copy the generated key string (starts with `AIzaSy...`).
4. Paste it into `apps/api/.env`:
   ```bash
   GEMINI_API_KEY=AIzaSyYourGeneratedGeminiKeyHere
   ```
5. Restart your backend server (`pnpm dev:api`). You will see:
   `[GeminiLlmAdapter] ✅ Gemini provider initialized with model gemini-2.0-flash` in the terminal logs!

> 💡 **Offline Development Mode:** If `GEMINI_API_KEY` is omitted, the platform automatically falls back to the built-in, context-aware `MockAiAdapter`. You can test full interview rounds, live code execution, progressive hints, and rubrics completely offline with zero API keys or costs!

#### Frontend (`apps/web/.env.local`) Highlights:

```ini
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=ws://localhost:4000
```

> 💡 **Tip:** If `GEMINI_API_KEY` is omitted, the platform automatically activates its built-in, context-aware simulation adapter. You can run and test interviews offline with full dialog support!

### 4. Setup the Database

Ensure PostgreSQL is running and create the database:

```bash
# Using PostgreSQL CLI (psql):
psql -U postgres -c "CREATE DATABASE interviewai_dev;"
```

### 5. Build Shared Packages & Applications

Compile the shared types package and build all workspaces:

```bash
pnpm build
```

### 6. Start Development Servers

Launch both the Next.js frontend and NestJS backend concurrently with hot reloading:

```bash
pnpm dev
```

- **Candidate Web Application**: [http://localhost:3000](http://localhost:3000)
- **Backend API Gateway**: [http://localhost:4000](http://localhost:4000)
- **Backend Health Check**: [http://localhost:4000/health](http://localhost:4000/health)

---

## 📖 Interactive API Documentation

When the backend is running, complete OpenAPI (Swagger) documentation is available at:

- **Interactive Swagger UI**: [http://localhost:4000/docs](http://localhost:4000/docs)
- **JSON OpenAPI Specification**: [http://localhost:4000/docs-json](http://localhost:4000/docs-json)

### Core REST Endpoints

| Method | Endpoint                         | Description                                 | Auth Required |
| :----- | :------------------------------- | :------------------------------------------ | :------------ |
| `POST` | `/api/auth/register`             | Register candidate account                  | No            |
| `POST` | `/api/auth/login`                | Login & receive JWT access + refresh tokens | No            |
| `POST` | `/api/auth/refresh`              | Refresh access token                        | No            |
| `GET`  | `/api/auth/me`                   | Fetch active user profile                   | Yes (Bearer)  |
| `GET`  | `/api/tracks/questions`          | Query question bank by domain/difficulty    | No            |
| `POST` | `/api/interviews`                | Create a new technical interview session    | Yes (Bearer)  |
| `GET`  | `/api/interviews/:id`            | Fetch session details and state             | Yes (Bearer)  |
| `POST` | `/api/interviews/:id/start`      | Launch or resume active interview           | Yes (Bearer)  |
| `POST` | `/api/coding/execute`            | Run code sandbox against verification tests | Yes (Bearer)  |
| `POST` | `/api/interviews/:id/evaluation` | Trigger independent rubric evaluation       | Yes (Bearer)  |
| `GET`  | `/api/interviews/:id/report`     | Fetch comprehensive assessment report       | Yes (Bearer)  |

### WebSocket Gateway (`/interview`)

| Event (Client $\rightarrow$ Server) | Payload                         | Description                                  |
| :---------------------------------- | :------------------------------ | :------------------------------------------- |
| `session.join`                      | `{ sessionId, token }`          | Authenticate and join session room           |
| `audio.chunk`                       | `Buffer / Uint8Array`           | Stream microphone audio packets              |
| `message.send`                      | `{ text }`                      | Send candidate text or transcribed speech    |
| `code.update`                       | `{ code, language }`            | Synchronize live code editor workspace       |
| `code.execute`                      | `{ code, language, problemId }` | Execute sandbox test suite                   |
| `interview.interrupt`               | `{}`                            | Barge-in signal to interrupt assistant voice |
| `interview.pause` / `resume`        | `{}`                            | Pause or resume live assessment timer        |

---

## 🧪 Quality Gates & Testing

The codebase maintains strict quality and zero-regression standards:

```bash
# Run all unit tests across the monorepo (Vitest)
pnpm test

# Run strict TypeScript type verification across all workspaces
pnpm type-check

# Run high-speed Rust-based linter (Oxlint) and ESLint
pnpm lint

# Check Prettier code formatting
pnpm format:check

# Automatically fix code formatting
pnpm format
```

---

## 🛡️ Security & Sandbox Isolation Architecture

1. **Zero-Trust WebSocket Authorization (BOLA Prevention)**:
   - Sockets cannot join interview session rooms without passing a validated JWT.
   - Session ownership is strictly enforced (`session.candidateId === user.id`).
2. **Timing-Safe Authentication**:
   - Password verification uses cost factor 12 `bcrypt`.
   - Non-existent email lookups perform a constant-time comparison against a dummy hash to prevent user enumeration attacks.
3. **Execution Sandbox Hardening**:
   - TypeScript/JavaScript execution runs in an isolated `vm.Context` with null prototypes and bracket identifier lookups to prevent sandbox escapes.
   - Python runners execute in a scrubbed child environment without access to server secrets or disk paths.
4. **Rate Limiting**:
   - Sliding-window rate limiters with memory leak pruning protect public endpoints (`/api/auth/login`, `/api/coding/execute`) using verified client IPs.

---

## 🤝 Contributing & License

Contributions are welcome! Please ensure that:

1. All changes pass `pnpm type-check`, `pnpm lint`, and `pnpm test`.
2. New features include corresponding unit tests in `*.spec.ts`.
3. Code formatting conforms to Prettier (`pnpm format`).

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.
