# Implementation Plan: Phase 1 — Foundation + Reminder Loop

**Branch**: `phase-1-foundation` | **Date**: 2026-06-22 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `docs/specs/phase-1/spec.md`

## Summary

实现 TidalFlow Phase 1 的完整基础架构：服务端 REST API + WebSocket + 定时提醒引擎 + 飞书推送，客户端 Electron 便签面板 + 托盘 + 离线缓存 + GitHub Releases 分发。总计 11 个任务，预估 16-26 小时。

## Technical Context

**Language/Version**: TypeScript 5.3+ / Node.js ≥ 18 LTS

**Primary Dependencies**:
- 服务端: express ^4.18, better-sqlite3 ^11.0, ws ^8.16, node-cron ^3.0, @larksuiteoapi/node-sdk ^1.30
- 客户端: Electron ^28.0, electron-vite ^2.0, React ^18.2, Tailwind CSS ^3.4
- 共享: shared/types.ts, shared/constants.ts, shared/wsEvents.ts

**Storage**: SQLite (better-sqlite3)，WAL 模式。服务端主库 + 客户端只读缓存库。

**Testing**: 手动测试为主（curl + WebSocket 客户端 + Electron 窗口验证），CI 自动构建

**Target Platform**: 
- 服务端: Linux (Ubuntu 22.04, Node.js 进程)
- 客户端: Windows 10/11 (Electron 28+, NSIS 安装包)

**Project Type**: monorepo 桌面应用（pnpm workspace: server + client + shared）

**Performance Goals**: WebSocket 消息延迟 < 100ms，API 响应 < 200ms p95，内存 < 200MB

**Constraints**: 单用户、离线只读缓存（Phase 1）、无 Docker（直接 Node.js）、SQLite 同步 API

**Scale/Scope**: 1 用户，< 1000 任务，6 个 User Story，11 个实现任务

## Constitution Check

*GATE: Must pass before implementation.*

| Principle | Status | Evidence |
|-----------|--------|----------|
| I. ADHD-First Design | ✅ PASS | 零摩擦启动、渐进式披露、即时正反馈、温和提醒、容错设计 — 全部在 Phase 1 实现 |
| II. Client-Server Separation | ✅ PASS | REST API + WebSocket 推送, 客户端不直连数据库 |
| III. Security Boundaries | ✅ PASS | contextBridge + IPC 代理, API Key 认证, .env 不入库 |
| IV. Progressive Enhancement | ✅ PASS | Phase 1 只创建 tasks + reminder_logs 表, 预留 Phase 2/3 字段 |
| V. Type Safety & Code Quality | ✅ PASS | TypeScript strict, shared/types.ts 统一类型, { type, payload } 信封 |

**Verdict**: 全部通过，无违规。

## Project Structure

### Documentation (this feature)

```text
docs/specs/phase-1/
├── spec.md              # This spec (User Stories + Requirements)
├── plan.md              # This file (Technical Plan)
└── tasks.md             # Implementation task list
```

### Source Code (repository root)

```text
TidalFlow/                            # pnpm monorepo root
├── pnpm-workspace.yaml
├── package.json                      # root workspace config
├── .gitignore
├── .github/workflows/release.yml     # CI/CD: build + GitHub Release

├── shared/                           # 共享类型和常量
│   ├── package.json
│   ├── types.ts                      # Task, ReminderLog, ApiResponse, WsEvents...
│   ├── constants.ts                  # 分类映射、默认设置、文案模板
│   └── wsEvents.ts                   # WsServerEvent, WsClientEvent 类型守卫

├── server/                           # 服务端 (Node.js + Express)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example
│   └── src/
│       ├── index.ts                  # 入口：HTTP + WebSocket 启动
│       ├── app.ts                    # Express app 组装
│       ├── db/
│       │   ├── index.ts              # 数据库初始化 + WAL 模式
│       │   ├── migrations.ts         # tasks + reminder_logs 建表
│       │   ├── taskRepository.ts     # 任务 CRUD
│       │   └── reminderRepository.ts # 提醒日志
│       ├── middleware/
│       │   ├── auth.ts               # API Key 验证
│       │   └── errorHandler.ts       # 统一错误处理
│       ├── routes/
│       │   ├── index.ts              # 路由汇总 + /health
│       │   ├── tasks.ts              # 7 个任务端点
│       │   ├── reminders.ts          # POST /reminders/respond
│       │   └── settings.ts           # GET + PUT /settings
│       ├── services/
│       │   ├── taskService.ts        # 任务操作 + WebSocket 广播
│       │   ├── reminderService.ts    # 提醒触发逻辑
│       │   ├── cronService.ts        # node-cron 调度
│       │   └── feishuService.ts      # 飞书 Webhook 调用
│       └── ws/
│           └── wsServer.ts           # WebSocket 服务、认证、心跳
│
└── client/                           # 客户端 (Electron + React)
    ├── package.json
    ├── electron-builder.yml          # 打包 + 自动更新配置
    ├── tailwind.config.js
    ├── postcss.config.js
    └── src/
        ├── main/                     # Electron 主进程
        │   ├── index.ts              # 主进程入口
        │   ├── tray.ts               # 托盘图标 + 菜单
        │   ├── windows.ts            # 窗口管理（无边框便签）
        │   ├── ipc/
        │   │   ├── index.ts          # IPC 注册汇总
        │   │   ├── apiProxy.ts       # HTTP 请求代理
        │   │   ├── wsBridge.ts       # WebSocket 事件转发
        │   │   ├── cacheHandlers.ts  # 缓存操作
        │   │   └── windowHandlers.ts # 窗口操作
        │   └── services/
        │       ├── apiClient.ts      # HTTP 客户端封装
        │       ├── wsClient.ts       # WebSocket 客户端（重连逻辑）
        │       └── cacheService.ts   # 本地 SQLite 缓存
        ├── preload/
        │   └── index.ts              # contextBridge 暴露 API
        └── renderer/                 # React 渲染进程
            ├── main.tsx              # React 入口
            ├── App.tsx               # 根组件
            ├── context/
            │   └── AppContext.tsx     # 全局状态
            ├── components/
            │   ├── TaskPanel.tsx      # 主面板布局
            │   ├── TaskItem.tsx       # 任务卡片
            │   ├── TaskForm.tsx       # 新建/编辑对话框
            │   ├── ReminderToast.tsx  # 提醒弹窗
            │   ├── SettingsPanel.tsx  # 设置面板
            │   ├── ConnectionStatus.tsx # 连接状态指示器
            │   └── ProgressBar.tsx    # 进度条
            ├── hooks/
            │   ├── useTasks.ts
            │   ├── useReminder.ts
            │   ├── useSettings.ts
            │   └── useConnection.ts
            └── styles/
                └── globals.css        # Tailwind + 自定义变量
```

**Structure Decision**: Web application (Option 2 variant) — monorepo with `server/`, `client/`, `shared/`. No `src/` at root; each package is self-contained.

## Complexity Tracking

无违规。所有技术选择符合 Constitution 约束。

## Technical Decisions

### 数据库：better-sqlite3 同步 API

**选择理由**：
- 单用户、单进程，无并发写入需求
- 同步 API 比异步更简单，符合 Node.js 单线程模型
- WAL 模式允许并发读取
- 零运维、零依赖（单文件数据库）

**风险**：如果未来扩展到多用户/多进程 → 需要迁移到 PostgreSQL（Phase 4+）

### 提醒引擎：node-cron 每 5 秒检查

**选择理由**：
- 不需要毫秒级精度
- 5 秒粒度足够满足 45 分钟间隔的检查
- 低开销（每次只是条件判断）

**风险**：未来需要更复杂调度 → 可迁移到 cron 表达式精确调度

### WebSocket 重连：指数退避

**选择理由**：
- 避免网络抖动时雪崩重连
- 最大 30s 间隔确保最终恢复
- 重连后全量 sync 保证数据一致性

### 客户端离线策略：只读缓存

**选择理由**：
- Phase 1 简化设计，避免离线写入冲突
- 写入队列延后到 Phase 3（与 AI 集成一起做）
- 缓存的是服务端"最近真相"，重连同步即可

## Data Model

### 服务端 (tasks)

```sql
CREATE TABLE tasks (
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    category        TEXT DEFAULT 'other',    -- 'programming'|'drawing'|'life'|'health'|'other'
    status          TEXT DEFAULT 'pending',   -- 'pending'|'in_progress'|'completed'|'postponed'
    priority        INTEGER DEFAULT 0,        -- 0=普通, 1=重要, 2=紧急
    scheduled_date  TEXT,                     -- YYYY-MM-DD
    due_date        TEXT,
    estimated_minutes INTEGER,
    parent_task_id  TEXT,                     -- Phase 3 启用
    phase_order     INTEGER,                  -- Phase 3 启用
    source          TEXT DEFAULT 'manual',
    is_recurring    INTEGER DEFAULT 0,
    recurring_rule  TEXT,
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now')),
    completed_at    TEXT
);
```

### 服务端 (reminder_logs)

```sql
CREATE TABLE reminder_logs (
    id              TEXT PRIMARY KEY,
    reminder_type   TEXT NOT NULL,    -- 'water_stretch'|'medication'|'task_due'
    triggered_at    TEXT NOT NULL,
    responded_at    TEXT,
    response_type   TEXT,             -- 'done'|'postponed'|'ignored'
    created_at      TEXT DEFAULT (datetime('now'))
);
```

### 客户端缓存 (cached_tasks)

与服务端 tasks 表结构相同，额外增加 `synced_at` 字段作为元数据。存储最近 7 天的任务。

## API Contracts

详见 `AI_DEVELOPMENT_GUIDE.md` 第 7.1 节 (REST API 端点) 和第 6.3 节 (TypeScript 类型定义)。

### Route Summary

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/health` | 健康检查 |
| GET | `/api/v1/tasks` | 获取任务（支持 query: date/status/category） |
| GET | `/api/v1/tasks/today` | 获取今日任务 |
| GET | `/api/v1/tasks/:id` | 获取单个任务 |
| POST | `/api/v1/tasks` | 创建任务 |
| PATCH | `/api/v1/tasks/:id` | 更新任务 |
| DELETE | `/api/v1/tasks/:id` | 删除任务 |
| POST | `/api/v1/tasks/:id/complete` | 快捷完成 |
| POST | `/api/v1/tasks/:id/postpone` | 推迟任务 |
| POST | `/api/v1/reminders/respond` | 提醒响应 |
| GET | `/api/v1/settings` | 获取设置 |
| PUT | `/api/v1/settings` | 更新设置 |

### WebSocket Events

**Server → Client**:
- `reminder:trigger` — 提醒触发
- `task:created` / `task:updated` / `task:deleted` — 任务变更
- `tasks:sync` — 全量同步（重连后）
- `server:shutdown` — 服务端关机预告

**Client → Server**:
- `auth` — API Key 认证
- `ping` — 心跳（30s 间隔）

## Implementation Strategy

### MVP First (Task 1-4: Server only)
1. Monorepo 初始化 + 共享类型
2. 服务端数据库 + REST API
3. WebSocket + 提醒引擎 + 飞书
4. 至此可独立部署服务端，飞书推送可用

### Client Integration (Task 5-10)
5. 客户端脚手架
6. 托盘 + 窗口管理
7. 通信层（API Client + WS Client + 缓存）
8. 任务面板 UI
9. 设置面板
10. 日志与错误处理

### Deploy (Task 11)
11. GitHub Actions + electron-builder + 部署文档

## Risks & Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| Electron contextIsolation 导致渲染进程 Node API 不可用 | High | High | 严格按照 preload + contextBridge 模式，任务前执行检查清单 |
| WebSocket 消息丢失 | Medium | High | 重连后全量 sync；关键消息可加 sequence number |
| better-sqlite3 跨平台编译问题 | Low | Medium | 锁定版本，CI 环境验证 |
| 飞书 Webhook 限流 | Low | Low | 每日仅 1 次推送，远低于 20 次/分钟限制 |
| electron-builder 构建慢 | Medium | Low | CI 构建，本地开发不频繁构建安装包 |
