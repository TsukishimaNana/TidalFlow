# Tasks: Phase 1 — Foundation + Reminder Loop

**Input**: Design documents from `docs/specs/phase-1/`

**Prerequisites**: plan.md (✅), spec.md (✅), constitution.md (✅)

**Organization**: Tasks are grouped by layer (monorepo → server → client → deploy).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

Monorepo: `shared/`, `server/src/`, `client/src/main/`, `client/src/renderer/`, `client/src/preload/`

---

## Phase 1: Monorepo Setup (Shared Infrastructure)

**Purpose**: Project initialization and shared types

### T001 Monorepo 初始化 + 共享类型 (Priority: 🔴 P0)

- **Story**: US1-US6 (all)
- **Estimate**: 30-60 min
- **Dependencies**: None

**Sub-tasks**:

- [ ] T001.1 Create root `package.json` with pnpm workspace config
- [ ] T001.2 Create `pnpm-workspace.yaml`: packages `['server', 'client', 'shared']`
- [ ] T001.3 [P] Create `shared/package.json` + `shared/types.ts` — all Task, ReminderLog, ApiResponse, WsEvent types (see §6.3)
- [ ] T001.4 [P] Create `shared/constants.ts` — category map, default settings, reminder copy templates
- [ ] T001.5 [P] Create `shared/wsEvents.ts` — WsServerEvent / WsClientEvent type guards
- [ ] T001.6 Create `.gitignore` — node_modules, dist, .env, *.db, *.sqlite

**Acceptance Criteria**:
- [ ] `pnpm install` runs without error at project root
- [ ] `shared/types.ts` contains ALL types from §6.3 of AI_DEVELOPMENT_GUIDE
- [ ] TypeScript compilation of `shared/` passes with zero errors

**Checkpoint**: Monorepo foundation ready — server and client work can begin (T001.3 completed first)

---

## Phase 2: Server Core

**Purpose**: REST API + Database + WebSocket + Reminder Engine + Feishu

**⚠️ CRITICAL**: Server tasks 2→3→4 are sequential. Tasks 2/3/4 run independently of client tasks 5/6.

### T002 服务端项目初始化 + 数据库层 (Priority: 🔴 P0)

- **Story**: US3, US4
- **Estimate**: 1-2 hours
- **Dependencies**: T001.3 (shared types must exist)

**Sub-tasks**:

- [ ] T002.1 Create `server/package.json` — deps: express, better-sqlite3, ws, node-cron, @larksuiteoapi/node-sdk, uuid, cors, dotenv, tsx
- [ ] T002.2 [P] Create `server/tsconfig.json`
- [ ] T002.3 [P] Create `server/.env.example` — PORT, API_KEY, FEISHU_WEBHOOK_URL, DEEPSEEK_API_KEY
- [ ] T002.4 Implement `server/src/db/index.ts` — database init + WAL mode (`PRAGMA journal_mode=WAL`)
- [ ] T002.5 Implement `server/src/db/migrations.ts` — `CREATE TABLE tasks` + `CREATE TABLE reminder_logs` + indexes
- [ ] T002.6 Implement `server/src/db/taskRepository.ts` — full CRUD: create, getById, getAll (with filters), update, delete, complete, postpone
- [ ] T002.7 Implement `server/src/db/reminderRepository.ts` — insert + query by date
- [ ] T002.8 Implement `server/src/index.ts` — startup verification: auto-migrate + print success

**Acceptance Criteria**:
- [ ] `pnpm --filter server dev` → database file auto-created at `server/data/adhd.db`
- [ ] taskRepository CRUD methods all callable (manual import test)
- [ ] WAL mode enabled (verify via `PRAGMA journal_mode`)

---

### T003 服务端 REST API + 认证中间件 (Priority: 🔴 P0)

- **Story**: US4
- **Estimate**: 2-3 hours
- **Dependencies**: T002

**Sub-tasks**:

- [ ] T003.1 Implement `server/src/middleware/auth.ts` — API Key validation (`X-API-Key` header check)
- [ ] T003.2 [P] Implement `server/src/middleware/errorHandler.ts` — unified error handler (`{ success: false, error: msg }`)
- [ ] T003.3 Implement `server/src/routes/tasks.ts` — all 7 endpoints:
  - `GET /tasks` (with query filters: date, status, category)
  - `GET /tasks/today`
  - `GET /tasks/:id`
  - `POST /tasks`
  - `PATCH /tasks/:id`
  - `DELETE /tasks/:id`
  - `POST /tasks/:id/complete`
  - `POST /tasks/:id/postpone`
- [ ] T003.4 [P] Implement `server/src/routes/reminders.ts` — `POST /reminders/respond`
- [ ] T003.5 [P] Implement `server/src/routes/settings.ts` — `GET /settings` + `PUT /settings`
- [ ] T003.6 Implement `server/src/routes/index.ts` — route aggregation + `/health` endpoint
- [ ] T003.7 Implement `server/src/app.ts` — Express app assembly (cors, json parser, auth middleware, routes, error handler)
- [ ] T003.8 Update `server/src/index.ts` — HTTP server startup on configured PORT

**Acceptance Criteria**:
- [ ] `GET /api/v1/health` → `{ success: true, data: { status: "ok", uptime: N } }`
- [ ] Request without API Key → 401
- [ ] Correct API Key → 200 + data
- [ ] POST create task → GET retrieve → PATCH update → POST complete → DELETE delete (full CRUD chain)
- [ ] `POST /tasks/:id/complete` → task status = "completed", completed_at set
- [ ] `GET /tasks/today` → only tasks with scheduled_date = today
- [ ] `GET /tasks?status=pending&category=programming` → filtered correctly

---

### T004 服务端 WebSocket + 定时提醒引擎 + 飞书推送 (Priority: 🔴 P0)

- **Story**: US1, US3
- **Estimate**: 3-4 hours
- **Dependencies**: T003

**Sub-tasks**:

- [ ] T004.1 Implement `server/src/ws/wsServer.ts` — WebSocket server:
  - Connection authentication (verify API Key from `auth` message)
  - Heartbeat detection (60s timeout disconnect)
  - `broadcast(type, payload)` — push to all authenticated clients
- [ ] T004.2 Implement `server/src/services/taskService.ts` — wraps taskRepository + broadcasts WebSocket after write ops
- [ ] T004.3 Implement `server/src/services/reminderService.ts` — reminder trigger logic:
  - `shouldTrigger()`: work hours (10:00-17:00) + lunch exclusion (12:00-13:40) + interval check (45 min)
  - `generateMessage(type)`: warm, encouraging copy per §13.3
  - `recordAndBroadcast()`: insert reminder_log + WS broadcast `reminder:trigger`
- [ ] T004.4 Implement `server/src/services/cronService.ts` — node-cron scheduler:
  - Every 5 seconds: check `shouldTrigger()`
  - 09:10: trigger Feishu push
  - 12:00: lunch start notification
  - 13:40: afternoon resume notification
  - 16:45: wrap-up reminder
- [ ] T004.5 Implement `server/src/services/feishuService.ts` — Feishu webhook:
  - `sendDailyMedicationReminder()`: medication card + today's task list
  - `sendFallbackReminder()`: water/stretch reminder when no client online
  - Anti-duplicate: `daily_sent_date` check in memory (reset on new day)
- [ ] T004.6 Integrate into `server/src/index.ts` — HTTP + WebSocket share same port

**Acceptance Criteria**:
- [ ] WebSocket connect → send auth → receive `tasks:sync`
- [ ] REST API create task → WebSocket client receives `task:created`
- [ ] Server runs ≥ 45 min → WebSocket client receives `reminder:trigger`
- [ ] Set system time to 09:10 → Feishu receives medication card
- [ ] Set system time to 12:00 → no reminder during lunch
- [ ] Set system time to 13:40 → reminders resume
- [ ] Feishu already sent today → server restart → no duplicate

**Checkpoint**: Server is fully functional — Feishu push, REST API, WebSocket, reminder engine all working. Client can begin integration.

---

## Phase 3: Client Foundation

### T005 客户端项目脚手架 (Priority: 🔴 P0)

- **Story**: US2
- **Estimate**: 1 hour
- **Dependencies**: T001 (can run in parallel with T002-T004)

**Sub-tasks**:

- [ ] T005.1 `pnpm create @electron-vite/create` for `client/` (React + TypeScript template)
- [ ] T005.2 Configure Tailwind CSS: `tailwind.config.js` + `postcss.config.js` + `globals.css`
  - Primary: amber-500 (#F59E0B), BG: stone-50/amber-50, Success: emerald-500
- [ ] T005.3 Configure `electron-builder.yml`: appId, productName, NSIS installer, publish → GitHub
- [ ] T005.4 Install additional deps: `auto-launch`, `electron-updater`

**Acceptance Criteria**:
- [ ] `pnpm --filter client dev` → Electron window opens with React page
- [ ] Tailwind classes render correctly (test: `className="bg-amber-500 text-white rounded-xl"`)
- [ ] `pnpm --filter client build:win` → produces installer
- [ ] TypeScript compilation zero errors

---

### T006 客户端系统托盘 + 开机自启 + 窗口管理 (Priority: 🔴 P0)

- **Story**: US2
- **Estimate**: 1-2 hours
- **Dependencies**: T005

**Sub-tasks**:

- [ ] T006.1 Implement `client/src/main/tray.ts` — tray icon + context menu:
  - Menu items: 显示面板 / 设置 / 退出
  - Double-click: show panel
  - Tray tooltip: "ADHD 时间管家"
- [ ] T006.2 Implement `client/src/main/windows.ts` — borderless sticky-note window:
  - 380×560px, 12px border-radius, always-on-top default
  - Draggable via title bar area (top 40px)
  - Close → hide to tray (do NOT quit app)
- [ ] T006.3 Integrate auto-launch: enable on first run
- [ ] T006.4 Implement `client/src/main/ipc/windowHandlers.ts` — IPC handlers: toggle-panel, set-always-on-top

**Acceptance Criteria**:
- [ ] App launch → tray icon appears + task panel shows
- [ ] Right-click tray → 3 menu items all functional
- [ ] Close panel → window hides, tray persists
- [ ] Double-click tray → panel reappears
- [ ] Panel is borderless, rounded corners (12px), draggable
- [ ] Exit → full app quit

---

### T007 客户端服务通信层 (API Client + WS Client + 缓存) (Priority: 🔴 P0)

- **Story**: US2, US3, US4, US5
- **Estimate**: 2-3 hours
- **Dependencies**: T006 + T004 (server WS must work)

**Sub-tasks**:

- [ ] T007.1 Implement `client/src/main/services/apiClient.ts` — HTTP client wrapper:
  - Read serverUrl + apiKey from local settings
  - All requests carry `X-API-Key` header
  - Timeout: 10s, unified error handling (network errors, server errors)
  - Methods: `get()`, `post()`, `patch()`, `delete()`
- [ ] T007.2 Implement `client/src/main/services/wsClient.ts` — WebSocket client:
  - Connect → send `auth` → receive `tasks:sync`
  - Heartbeat: 30s `ping`
  - Reconnect: exponential backoff (1s→2s→4s→8s→16s→30s max)
  - Forward server events to renderer via IPC
- [ ] T007.3 Implement `client/src/main/services/cacheService.ts` — local SQLite cache:
  - Init `cached_tasks` table (mirrors server tasks schema + `synced_at`)
  - `syncTasks(tasks: Task[])` — batch upsert
  - `getCachedTasks()` — read all cached
- [ ] T007.4 Implement `client/src/main/ipc/apiProxy.ts` — IPC proxy for HTTP requests
- [ ] T007.5 [P] Implement `client/src/main/ipc/wsBridge.ts` — IPC forward WS events
- [ ] T007.6 [P] Implement `client/src/main/ipc/cacheHandlers.ts` — IPC cache operations
- [ ] T007.7 Implement `client/src/preload/index.ts` — contextBridge expose:
  - `window.api.{get, post, patch, delete}`
  - `window.events.onWsEvent(callback)`
  - `window.cache.{getTasks, saveTasks}`
  - `window.window.{togglePanel, setAlwaysOnTop}`

**Acceptance Criteria**:
- [ ] Correct serverUrl + apiKey → auto-connect WS on startup
- [ ] Renderer `window.api.get('/tasks/today')` → returns server data
- [ ] WS `reminder:trigger` → desktop notification via IPC
- [ ] WS disconnect → auto-reconnect → `tasks:sync` received
- [ ] Server unreachable → UI shows "离线" + displays cached tasks
- [ ] Offline: cached data readable; write operations show "当前离线" tooltip

---

## Phase 4: Client UI

### T008 客户端任务面板 UI (Priority: 🟡 P1)

- **Story**: US2, US4, US5
- **Estimate**: 3-5 hours
- **Dependencies**: T007

**Sub-tasks**:

- [ ] T008.1 [P] Implement `ConnectionStatus.tsx` — connection indicator (🟢 online / 🔴 offline / 🟡 reconnecting)
- [ ] T008.2 Implement `TaskPanel.tsx` — main panel layout:
  - Top: date + connection status + progress bar + settings gear icon
  - Middle: task list grouped by status (pending → in_progress → completed)
  - Bottom: quick add button (+)
- [ ] T008.3 Implement `TaskItem.tsx` — task card:
  - Title, category tag (color-coded), priority indicator
  - Actions: start/complete (✓), postpone, edit, delete
  - Complete animation: 0.3s green background fade + strikethrough
- [ ] T008.4 Implement `TaskForm.tsx` — create/edit dialog:
  - Auto-focus title input
  - Category dropdown: 编程🖥️ / 绘画🎨 / 生活🏠 / 健康💪 / 其他📌
  - Scheduled date picker, estimated time input
  - Enter = submit, Esc = cancel
- [ ] T008.5 Implement `ReminderToast.tsx` — reminder popup:
  - Slide-in from panel top (0.2s ease-out)
  - Two buttons: "已完成 👍" / "再等3分钟 ⏰"
  - Auto-escalate: 5s no action → persistent (not auto-dismiss)
- [ ] T008.6 [P] Implement `ProgressBar.tsx` — daily completion bar:
  - Formula: completed / (completed + pending) × 100%
  - Warm gradient fill + 0.5s transition
- [ ] T008.7 Implement hooks: `useTasks.ts`, `useReminder.ts`, `useConnection.ts`
- [ ] T008.8 Implement `AppContext.tsx` — global state (React Context + useReducer)

**Acceptance Criteria**:
- [ ] Panel shows today's tasks (empty state: "今天还没有任务，轻松的一天？")
- [ ] Click + → form opens → type title → Enter → task appears
- [ ] Click complete → task turns green + strikethrough + progress bar updates
- [ ] Click postpone → date picker → task moves to selected date
- [ ] Edit task → modify → save → list updates
- [ ] WS reminder received → toast slides in → click 完成 → toast dismisses
- [ ] Offline: task list shows cache, action buttons greyed out with tooltip
- [ ] Re-online → full auto-sync → list updates to latest

---

### T009 客户端设置面板 (Priority: 🟢 P2)

- **Story**: US6
- **Estimate**: 1-2 hours
- **Dependencies**: T007

**Sub-tasks**:

- [ ] T009.1 Implement `SettingsPanel.tsx` — separate window (bordered, 420×500):
  - Server Connection: URL input + API Key input + "Test Connection" button
  - Work Hours: 4 time inputs (start/end/lunch start/lunch end)
  - Reminders: interval minutes (default 45, range 15-120)
  - Feishu: webhook URL + test button + daily reminder toggle
  - App: auto-launch toggle / always-on-top toggle
- [ ] T009.2 Implement `useSettings.ts` — read/write hook
- [ ] T009.3 Save flow: local settings write + server sync via PUT /settings

**Acceptance Criteria**:
- [ ] Tray menu → Settings → settings window opens
- [ ] Change server address → save → client reconnects with new address
- [ ] Click "Test Connection" → show success/failure result
- [ ] Change reminder interval → next server reminder follows new interval
- [ ] Click Feishu test → Feishu receives test message

---

### T010 客户端日志与错误处理 (Priority: 🟢 P2)

- **Story**: US2, US4, US5
- **Estimate**: 1 hour
- **Dependencies**: T008

**Sub-tasks**:

- [ ] T010.1 Main process logging: connect, disconnect, reconnect, API call errors → stdout
- [ ] T010.2 Renderer Error Boundary: catch React errors, show friendly fallback
- [ ] T010.3 Server unreachable: show "正在连接服务器..." instead of blank screen
- [ ] T010.4 API timeout (10s) handling with user notification

**Acceptance Criteria**:
- [ ] Server not running → client doesn't crash, shows "正在连接服务器..."
- [ ] Network error → toast notification
- [ ] Main process logs output to stdout (pm2-compatible)

---

## Phase 5: Deploy

### T011 部署 (服务端 + GitHub Release) (Priority: 🟢 P2)

- **Story**: US1 (reliability), US2 (distribution)
- **Estimate**: 1-2 hours
- **Dependencies**: T001-T010 ALL

**Sub-tasks**:

- [ ] T011.1 Create `.github/workflows/release.yml` — auto-build Windows installer
  - Trigger: push tag `v*`
  - OS: windows-latest
  - Steps: checkout → pnpm install → build:win → upload to Release
- [ ] T011.2 Configure `electron-builder.yml` publish section (GitHub provider)
- [ ] T011.3 Write server deployment doc + startup script
- [ ] T011.4 Create `README.md` — user-facing install + setup guide
- [ ] T011.5 Tag `v0.1.0` → trigger CI → verify Release has installer

**Acceptance Criteria**:
- [ ] GitHub Release page has Windows installer download
- [ ] Download → install → configure server → connect → functional
- [ ] Server deployed to cloud → pm2 managed → survives restart
- [ ] Feishu 9:10 push triggers reliably (server running ≥ 24 hours)

---

## Dependencies & Execution Order

### Phase Dependencies

```
T001 (Monorepo)
├── T002 (Server DB)
│   └── T003 (Server API)
│       └── T004 (Server WS + Reminder)
└── T005 (Client Scaffold)  ← can start after T001.3 (shared types)
    └── T006 (Tray + Window)
        └── T007 (Comms)    ← needs T004 (server WS)
            ├── T008 (Panel UI)
            │   └── T010 (Log/Error)
            └── T009 (Settings)
                    ↓
                T011 (Deploy) ← waits for ALL
```

### Parallel Opportunities

- **T005-T006** can run in parallel with **T002-T004** (client scaffold vs server dev)
- **T008** and **T009** can run in parallel (different components, same IPC layer)
- All tasks within same task group that are marked [P] (different files) can run in parallel

### Sequential Constraints

- T002 → T003 → T004 (server layers)
- T005 → T006 → T007 (client layers)
- T007 → T008 / T009 (IPC must exist before UI)
- T010 after T008 (needs UI components)
- T011 after ALL (full integration)

---

## Implementation Strategy

### MVP (Server-Only)
1. T001 → T002 → T003 → T004
2. **Validate**: Feishu push + REST API + WS all working
3. Deploy server — medication reminder is live

### Full Client Integration
5. T005 → T006 → T007
6. **Validate**: Client connects to server, receives WS events
7. T008 → T009 → T010
8. **Validate**: Full task panel UX, offline mode

### Ship
9. T011 → tag v0.1.0 → GitHub Release

---

## Notes

- [P] tasks = different files, no code dependencies
- [Story] label maps task to User Story for traceability
- Each T00X task is a standalone Kanban card candidate
- Server tasks must be done by a Developer; UI tasks benefit from ADHD design expertise
- Commit after each completed sub-task or logical group
- All API responses must use `{ success, data, error }` format
- All WS messages must use `{ type, payload }` envelope
- TypeScript strict mode enforced — zero `any` types
- Reminder copy must follow warm, encouraging tone (§13.3 of AI_DEVELOPMENT_GUIDE)
