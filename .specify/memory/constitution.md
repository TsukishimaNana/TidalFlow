# ADHD Time Manager (TidalFlow) Constitution

## Core Principles

### I. ADHD-First Design (NON-NEGOTIABLE)
Every feature must serve the ADHD user's needs before technical elegance:
- Zero-friction startup: auto-launch, auto-connect, immediate task display
- Progressive disclosure: show only what's needed now
- Instant positive feedback: visual + audio reward on task completion
- Gentle but persistent: reminders escalate gracefully, never punish
- Reduce decisions: system says "do this now"
- Forgiving design: allow skip/postpone without guilt
- Offline-capable: core functions work without network

### II. Client-Server Separation (NON-NEGOTIABLE)
- Server is the single source of truth for tasks
- Client MUST NOT access server database directly — REST API only
- Client MUST NOT run scheduled tasks — server schedules all reminders
- Real-time communication via WebSocket, data operations via REST
- Client caches read-only; write queue deferred to Phase 3

### III. Security Boundaries (NON-NEGOTIABLE)
- Renderer process MUST NOT use Node.js APIs directly — preload + contextBridge only
- Renderer MUST NOT fetch server directly — IPC proxy through main process
- API keys in .env, never in code; .env in .gitignore, .env.example committed
- API Key authentication on all server endpoints
- CORS configured for client origin only

### IV. Progressive Enhancement
Each Phase adds tables/fields/APIs without breaking existing contracts:
- Phase 1: Foundation + reminder loop
- Phase 2: Activity sensing (extends Phase 1, no interface changes)
- Phase 3: AI + bidirectional Feishu (extends Phase 1 interfaces)
- Phase 4: Polish (iterative refinement)

### V. Type Safety & Code Quality
- TypeScript strict mode, no `any` type
- Single React component ≤ 150 lines
- WebSocket messages use `{ type, payload }` envelope
- No hardcoded URLs (API, WebSocket)
- No dynamic Tailwind class concatenation (e.g., `bg-${color}`)

## Technology Stack

| Layer | Technology | Constraint |
|-------|-----------|------------|
| Server runtime | Node.js | ≥ 18 LTS |
| Server framework | Express | ^4.18 |
| Database | better-sqlite3 | ^11.0, single-file SQLite |
| Scheduling | node-cron | ^3.0 |
| WebSocket | ws | ^8.16 |
| Feishu | @larksuiteoapi/node-sdk | ^1.30 |
| Desktop framework | Electron | ^28.0 |
| Build | electron-vite | ^2.0 |
| UI | React + TypeScript | ^18.2 / ^5.3 |
| Styling | Tailwind CSS | ^3.4 |
| Package manager | pnpm | ≥ 8.0, monorepo workspace |
| Auto-update | electron-updater | ^6.1 |

## Explicit Exclusions
- No PostgreSQL/MySQL — SQLite only
- No Socket.IO — raw ws
- No Redux/MobX — React context + hooks
- No Ant Design/MUI — Tailwind only
- No Prisma/TypeORM — direct SQL via better-sqlite3
- No Docker (Phase 1) — direct Node.js on server
- No Redis — SQLite is sufficient
- No Nginx — Express serves directly

## Development Workflow

- Monorepo: packages = ['server', 'client', 'shared']
- Git: feature branches from develop, squash merge to develop
- PRs required for main/develop (except initial push)
- TDD encouraged where practical
- Phase gates: all tasks done + gate log before advancing

## Visual Identity

- Primary color: warm amber (#F59E0B)
- Background: warm gray / cream (stone-50, amber-50)
- Window: sticky-note style, borderless, 12px radius, 380×560px, always-on-top default
- Close behavior: minimize to tray (do not quit)

## Governance

This constitution supersedes all other practices. Amendments require Project Lead approval and documentation in Handoff.md. All Phase 1 tasks must comply with the non-negotiable principles.

**Version**: 1.0.0 | **Ratified**: 2026-06-22 | **Last Amended**: 2026-06-22
