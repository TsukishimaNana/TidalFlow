# ADHD 时间管家 — AI 开发总纲 v2.0

> **文件用途**: 本文件是项目的**唯一真实来源 (Single Source of Truth)**，供所有 AI Agent 在开发、审查、迭代时参考。任何模糊的设计决策均应回到本文件寻找答案。
>
> **AI Agent 阅读指南**: 
> - **如果你只想读一章**: 读第 3 章「功能矩阵」和第 12 章「Phase 1 详细任务清单」
> - **如果你要写代码**: 额外读第 4 章「系统架构」、第 5 章「技术规格」、第 7 章「通信协议」
> - **如果你要写数据库**: 读第 6 章「数据设计」
> - **如果你遇到了模糊决策**: 读第 13 章「AI Agent 开发守则」
>
> **v2.0 变更说明** (vs v1.0): 架构从纯本地 Electron 应用变更为 **云服务端 (Server) + 桌面客户端 (Client)** 的 Client-Server 架构。服务端负责任务存储、定时提醒、飞书集成、AI 拆解；客户端负责任务面板 UI、活动监测、桌面通知、本地缓存。

---

## 1. 项目定义

### 1.1 一句话描述

一款**云端服务 + 桌面客户端**的 ADHD 个人任务管理与提醒工具。服务端 24/7 运行以保证飞书提醒可靠性，桌面客户端通过便签式面板展示任务、监测工作活动、推送桌面通知。

### 1.2 目标用户画像

```
用户身份:     程序员 + 绘画师（使用 Clip Studio Paint）
核心挑战:     ADHD，注意力难以集中，拖延严重，已影响工作
工作设备:     Windows 11 笔记本
工作时间:     10:00 - 17:00（午休 12:00 - 13:40），晚间可选加班
通讯工具:     飞书
AI 偏好:      DeepSeek
开发方式:     AI Vibe Coding（由 AI Agent 完成大部分编码）
部署方式:     服务端部署于云服务器（24/7），客户端通过 GitHub Releases 分发
```

### 1.3 核心价值主张

| 痛点 | 本软件解决方案 |
|------|--------------|
| 早上不知道今天要做什么 | 服务端 9:10 通过飞书推送今日任务摘要 + 服药提醒 |
| 飞书提醒依赖电脑开机 | 服务端 24/7 运行，即使电脑关机也能准时推送 |
| 工作时忘记喝水/活动 | 服务端计时，通过 WebSocket 推送桌面提醒（45分钟周期） |
| 不知道自己工作了多久 | 客户端检测 CSP/终端前台窗口 → 上报服务端记录工时 |
| 经常走神刷手机 | 客户端检测键鼠空闲 → 注意力拉回提醒 |
| 大任务不知道从何开始 | 服务端调用 DeepSeek AI 自动拆解为阶段性子任务 |
| 任务拖延不处理 | 服务端分级提醒升级 + 拖延告警 |
| 软件更新麻烦 | GitHub Releases 自动更新（electron-updater） |

### 1.4 非目标（明确不做什么）

> **DECISION**: 以下功能明确排除，AI Agent 不应尝试实现。

- ❌ 团队协作 / 多用户 / 多设备同时登录
- ❌ 移动端 App
- ❌ 日历集成（Google Calendar / Outlook）
- ❌ 语音输入
- ❌ 微信集成
- ❌ 番茄钟计时器（用户已有其他工具）
- ❌ 习惯打卡统计的复杂可视化（Phase 4 再说）
- ❌ OAuth / 复杂用户认证（个人工具，API Key 足够）

---

## 2. 设计约束

### 2.1 ADHD 友好设计原则

> **这些原则优先级高于技术便利性。AI Agent 在做任何 UX 决策时必须遵守。**

| # | 原则 | 含义 | 反例 |
|---|------|------|------|
| 1 | **零摩擦启动** | 开机自启，自动连接服务端，直接展示任务 | 启动后需要手动输入服务器地址 |
| 2 | **渐进式披露** | 只展示当前该做的事，不要信息轰炸 | 一屏显示所有任务 + 统计 + 设置 |
| 3 | **即时正反馈** | 完成任务立刻有视觉+音效反馈 | 点了完成没反应 |
| 4 | **温和但持续** | 提醒不能太烦（会被关掉），不能太弱（会被忽略） | 弹窗拦截式提醒太频繁 |
| 5 | **减少决策** | 系统直接说"现在做这个"，不要让用户排序 | 展示一堆待办让用户自己选 |
| 6 | **容错设计** | 允许跳过、推迟、重新规划，不制造愧疚 | "你又拖延了！"式的责备文案 |
| 7 | **离线可用** | 断网时核心功能（查看任务、标记完成）仍可用 | 无网络时白屏报错 |

### 2.2 技术约束

| 约束 | 值 | 理由 |
|------|-----|------|
| 服务端运行环境 | Node.js >= 18 LTS | 与客户端同一语言，AI 上下文统一 |
| 服务端数据库 | SQLite (better-sqlite3) | 单用户、数据量小、零运维，后续可迁移到 PostgreSQL |
| 客户端操作系统 | Windows 10/11 only | 用户唯一使用环境 |
| 客户端框架 | Electron 28+ | AI 训练数据最多的桌面框架 |
| 包管理器 | pnpm (monorepo workspace) | 依赖管理严格，monorepo 支持好 |
| 实时通信 | WebSocket (ws 库) | 服务端→客户端推送提醒和任务更新 |
| 离线策略 | 客户端本地 SQLite 缓存 + 重连自动同步 | 保证断网可用 |
| API 认证 | 静态 API Key（服务端 .env + 客户端设置） | 个人工具，简单认证足够 |

### 2.3 视觉设计约束

```
色彩策略:
  主色调:   暖橙色/琥珀色系 (#F59E0B — amber-500)
  背景:     暖灰/奶油色 (stone-50, amber-50)
  强调色:   柔绿色 (#10B981 — emerald-500) 表示完成
  危险色:   柔红色 (#EF4444 — red-400) 仅用于 DDL 告警
  
窗口风格:
  类型:     便签式无边框窗口
  圆角:     12px
  阴影:     Tailwind shadow-lg
  默认尺寸: 380 × 560px
  拖拽:     标题栏区域（顶部 40px）可拖拽
  置顶:     默认置顶，可开关
  关闭行为: 最小化到系统托盘（不退出应用）
  
动效:
  完成任务: 淡绿色背景 + 0.3s 过渡
  提醒弹出: 从顶部滑入 + 0.2s ease-out
  进度条:   0.5s ease 过渡
```

---

## 3. 功能矩阵

### 3.1 功能全景

```
Phase 1 ─┐  服务端基础 + 客户端基础 + 提醒闭环
          │  ✅ 服务端: REST API + WebSocket + 定时提醒引擎
          │  ✅ 服务端: 飞书 9:10 服药+任务摘要推送 (24/7 可靠)
          │  ✅ 客户端: 系统托盘 + 开机自启
          │  ✅ 客户端: 便签式任务面板 (连接服务端)
          │  ✅ 客户端: 45分钟喝水/拉伸提醒 (服务端驱动)
          │  ✅ GitHub Releases 分发 + electron-updater 自动更新
          │
Phase 2 ─┤  活动感知 + 工时记录
          │  ✅ 客户端前台窗口检测 (识别 CSP / 终端 / VS Code)
          │  ✅ 客户端键鼠空闲检测
          │  ✅ 走神提醒 (客户端触发 + 服务端记录)
          │  ✅ 自动工时记录 (客户端上报 → 服务端存储)
          │
Phase 3 ─┤  AI 集成 + 飞书深度联动
          │  ✅ 飞书应用机器人接收自然语言任务输入
          │  ✅ DeepSeek API 任务拆解 (大目标 → 子阶段)
          │  ✅ 飞书 → 服务端 → WebSocket → 客户端任务同步
          │  ✅ 拖延检测 + 分级提醒升级
          │  ✅ 客户端离线队列 + 重连自动同步
          │
Phase 4 ─┘  体验打磨 + 个性化
          │  ✅ 每日/每周复盘摘要 (服务端生成 → 飞书推送)
          │  ✅ 成就感可视化 (连续完成天数、累计工时)
          │  ✅ 能量/精力标签 + 智能排序
          │  ✅ 打断恢复提示
          │  ✅ 个性化参数调优
```

### 3.2 Phase 1 功能边界（当前实现范围）

```
服务端（必须完成）:
  ✅ Express REST API (tasks CRUD + settings + health check)
  ✅ WebSocket 服务 (任务变更推送 + 提醒事件推送)
  ✅ SQLite 数据库 (tasks + reminder_logs 表)
  ✅ 定时提醒引擎 (node-cron, 45分钟周期, 午休静默)
  ✅ 飞书 Webhook 推送 (每日 9:10 服药 + 今日任务摘要)
  ✅ API Key 认证中间件
  ✅ CORS 配置

客户端（必须完成）:
  ✅ 开机自启动 + 系统托盘
  ✅ 连接服务端 (配置服务器地址 + API Key)
  ✅ 便签式任务面板 (无边框、圆角、可拖拽、默认置顶)
  ✅ 任务创建 / 编辑 / 删除 / 标记完成 / 推迟
  ✅ WebSocket 接收服务端推送 → 桌面提醒
  ✅ 本地 SQLite 缓存 (断网时显示缓存数据)
  ✅ 基础设置页 (服务器连接、工作时间、提醒间隔、飞书 Webhook URL)
  ✅ 连接状态指示器 (在线/离线/重连中)

不包含:
  ❌ 窗口/进程检测
  ❌ 键鼠空闲检测
  ❌ 工时统计
  ❌ AI 任务拆解
  ❌ 飞书消息接收（仅单向推送）
  ❌ 数据看板/统计
  ❌ 离线写入队列（Phase 1 离线只读缓存，Phase 3 支持离线写入）
```

---

## 4. 系统架构

### 4.1 总架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                        云服务器 (24/7)                             │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   Express Server (Node.js)                    │ │
│  │                                                               │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │ │
│  │  │ REST API │  │WebSocket │  │  Cron    │  │  Feishu  │    │ │
│  │  │ Routes   │  │ Server   │  │Scheduler │  │  Client  │    │ │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │ │
│  │       │             │             │             │            │ │
│  │  ┌────┴─────────────┴─────────────┴─────────────┴────┐      │ │
│  │  │                  Service Layer                      │      │ │
│  │  │  · TaskService       · ReminderService              │      │ │
│  │  │  · FeishuService     · CrontabService               │      │ │
│  │  └──────────────────────┬─────────────────────────────┘      │ │
│  │                         │                                     │ │
│  │  ┌──────────────────────┴─────────────────────────────┐      │ │
│  │  │              SQLite (better-sqlite3)                 │      │ │
│  │  │  · tasks  · reminder_logs  · work_logs (Phase 2)    │      │ │
│  │  └────────────────────────────────────────────────────┘      │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              未来扩展 (Phase 3-4)                             │ │
│  │  ┌──────────┐  ┌──────────────────┐                          │ │
│  │  │ DeepSeek │  │ 飞书应用机器人     │                          │ │
│  │  │ API      │  │ (接收用户消息)     │                          │ │
│  │  └──────────┘  └──────────────────┘                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
└───────────────────────────┬──────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                │   WebSocket (wss://)   │  实时推送: 提醒、任务变更
                │   REST API (https://)  │  数据操作: CRUD、设置
                └───────────┬───────────┘
                            │
┌───────────────────────────┴──────────────────────────────────────┐
│                    用户笔记本 (Windows 11)                         │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Electron Desktop Client                         │ │
│  │                                                               │ │
│  │  Main Process (src/main/)                                     │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │ │
│  │  │  Tray    │  │  Auto    │  │  WS      │  │  API     │    │ │
│  │  │  Manager │  │  Launch  │  │  Client  │  │  Client  │    │ │
│  │  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │ │
│  │                                                               │ │
│  │  ┌──────────────────────────────────────────────────────┐    │ │
│  │  │          Local Cache (SQLite, read-only Phase 1)      │    │ │
│  │  └──────────────────────────────────────────────────────┘    │ │
│  │                                                               │ │
│  │  Preload (contextBridge + IPC)                                │ │
│  │  ┌──────────────────────────────────────────────────────┐    │ │
│  │  │  window.api  →  IPC  →  Main Process  →  Server API  │    │ │
│  │  └──────────────────────────────────────────────────────┘    │ │
│  │                                                               │ │
│  │  Renderer Process (React, src/renderer/)                      │ │
│  │  ┌──────────────────────────────────────────────────────┐    │ │
│  │  │  TaskPanel  │  TaskForm  │  ReminderToast  │  Settings│    │ │
│  │  └──────────────────────────────────────────────────────┘    │ │
│  │                                                               │ │
│  │  Phase 2 扩展 (本地监测，未来添加):                            │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐                   │ │
│  │  │  Active  │  │  Idle    │  │  Desktop │                   │ │
│  │  │  Window  │  │  Monitor │  │  Notify  │                   │ │
│  │  │  Detector│  │          │  │          │                   │ │
│  │  └──────────┘  └──────────┘  └──────────┘                   │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────┘
```

### 4.2 职责边界

| 职责 | 服务端 | 客户端 | 说明 |
|------|:---:|:---:|------|
| 任务数据存储（主库） | ✅ | ❌ | 服务端 SQLite 是唯一数据源 |
| 任务数据缓存（本地） | ❌ | ✅ | 客户端缓存今日任务，断网时可读 |
| 定时提醒触发 | ✅ | ❌ | 服务端 cron 24/7，不受客户端开关机影响 |
| 桌面通知展示 | ❌ | ✅ | 需要系统级 Notification API |
| 飞书推送 | ✅ | ❌ | 24/7 运行，永不漏推 |
| 活动监测 | ❌ | ✅ | 需要系统级权限（前台窗口、键鼠输入） |
| 任务面板 UI | ❌ | ✅ | 桌面端本地渲染 |
| AI 任务拆解 | ✅ | ❌ | 调用 DeepSeek API，集中管理成本 |
| 设置存储 | ✅ (主) | ✅ (本地缓存) | 服务端存业务设置，客户端存窗口偏好+连接配置 |
| 自动更新 | ❌ | ✅ | electron-updater 检查 GitHub Releases |

### 4.3 数据流向

```
【任务查询流程】
  用户打开面板 → 客户端请求服务端 API → 服务端查询 SQLite → 返回 JSON
  → 客户端渲染 UI + 写入本地缓存

【任务创建流程】  
  用户填写表单 → 客户端 POST 服务端 API → 服务端写入 SQLite
  → 服务端通过 WebSocket 广播变更 → 客户端收到 → 更新 UI + 更新缓存

【提醒推送流程】
  服务端 cron 触发 → ReminderService 判断是否应提醒
  → WebSocket 推送提醒事件到客户端 → 客户端显示桌面通知 + 面板 toast

【飞书推送流程】
  服务端 cron 9:10 触发 → FeishuService 查询今日任务
  → 构建消息卡片 → 调用飞书 Webhook → 记录 reminder_log

【离线降级流程 (Phase 1)】
  客户端检测 WebSocket 断开 → UI 显示"离线"状态
  → 用户操作任务 → 提示"当前离线，请检查网络" ← Phase 1 离线只读
  → 重连成功 → 清除离线状态 → 自动拉取最新数据并更新缓存
```

---

## 5. 技术规格

### 5.1 技术栈总览

| 层 | 位置 | 技术 | 版本 | 选型理由 |
|----|------|------|------|---------|
| 服务端运行环境 | Server | Node.js | >= 18 LTS | 与客户端同语言，一个 repo 一套心智模型 |
| 服务端框架 | Server | Express | ^4.18 | AI 训练数据最多的 Node 框架，生态最成熟 |
| 服务端数据库 | Server | better-sqlite3 | ^11.0 | 单用户零运维，同步 API 简单可靠 |
| 服务端定时 | Server | node-cron | ^3.0 | 标准 cron 语法，AI 熟悉度高 |
| 服务端 WebSocket | Server | ws | ^8.16 | 轻量原生实现，比 Socket.IO 更简单 |
| 服务端飞书 SDK | Server | @larksuiteoapi/node-sdk | ^1.30 | 飞书官方 |
| 服务端 AI SDK | Server | openai (兼容) | ^4.0 | DeepSeek API 兼容 OpenAI 格式 |
| 桌面框架 | Client | Electron | ^28.0 | AI 训练数据最多，系统 API 成熟 |
| 构建工具 | Client | electron-vite | ^2.0 | Electron + Vite 专用，HMR 开箱即用 |
| UI 框架 | Client | React | ^18.2 | AI 生成 React 代码质量最高 |
| 类型系统 | All | TypeScript | ^5.3 | 类型约束减少 AI 生成代码的运行时错误 |
| 样式方案 | Client | Tailwind CSS | ^3.4 | AI 对 Tailwind 类名极为熟悉 |
| 客户端数据库 | Client | better-sqlite3 | ^11.0 | 本地缓存，与服务端同一套 API |
| 开机自启 | Client | auto-launch | ^5.0 | 标准 Windows 注册表操作 |
| 自动更新 | Client | electron-updater | ^6.1 | 检查 GitHub Releases，自动下载更新 |
| 打包 | Client | electron-builder | ^24.0 | Windows NSIS 安装包 |
| 窗口检测 | Client | active-win | ^8.2 | Phase 2: 纯 JS 无编译 |
| 包管理 | Root | pnpm | >= 8.0 | monorepo workspace，依赖严格 |

### 5.2 不使用的技术（明确排除）

| 排除 | 理由 |
|------|------|
| PostgreSQL / MySQL | 单用户个人工具，SQLite 足够，零运维 |
| Socket.IO | 太重，ws 库足够（不需要自动重连等黑盒逻辑） |
| Redux / MobX | 状态量小，React Context + useReducer 足够 |
| Ant Design / MUI | 太重，便签风格需要轻量自定义 |
| Prisma / TypeORM | SQLite 只有几张表，手写 SQL 更可控 |
| Docker (Phase 1) | 先直接跑 Node 进程，Phase 3+ 再容器化 |
| Redis | 单进程单用户，不需要消息队列 |
| Nginx | Express 直接暴露，个人工具不需要反向代理 |

---

## 6. 数据设计

### 6.1 服务端数据库 (Source of Truth)

```sql
-- ============================================
-- Phase 1: tasks 表 (服务端主库)
-- ============================================
CREATE TABLE tasks (
    id              TEXT PRIMARY KEY,        -- UUID v4 (服务端生成)
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    category        TEXT DEFAULT 'other',    -- 'programming' | 'drawing' | 'life' | 'health' | 'other'
    status          TEXT DEFAULT 'pending',  -- 'pending' | 'in_progress' | 'completed' | 'postponed'
    priority        INTEGER DEFAULT 0,       -- 0=普通, 1=重要, 2=紧急
    scheduled_date  TEXT,                    -- YYYY-MM-DD, NULL=随时待办
    due_date        TEXT,                    -- YYYY-MM-DD
    estimated_minutes INTEGER,
    -- 以下字段 Phase 1 预留，Phase 3 开始使用
    parent_task_id  TEXT,
    phase_order     INTEGER,
    source          TEXT DEFAULT 'manual',   -- 'manual' | 'feishu' | 'ai_decomposed'
    is_recurring    INTEGER DEFAULT 0,
    recurring_rule  TEXT,
    -- 时间戳
    created_at      TEXT DEFAULT (datetime('now')),
    updated_at      TEXT DEFAULT (datetime('now')),
    completed_at    TEXT
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_scheduled ON tasks(scheduled_date);
CREATE INDEX idx_tasks_category ON tasks(category);

-- ============================================
-- Phase 1: reminder_logs 表
-- ============================================
CREATE TABLE reminder_logs (
    id              TEXT PRIMARY KEY,
    reminder_type   TEXT NOT NULL,           -- 'water_stretch' | 'medication' | 'task_due'
    triggered_at    TEXT NOT NULL,
    responded_at    TEXT,
    response_type   TEXT,                    -- 'done' | 'postponed' | 'ignored'
    created_at      TEXT DEFAULT (datetime('now'))
);

CREATE INDEX idx_reminder_date ON reminder_logs(date(triggered_at));

-- ============================================
-- Phase 2 扩展: work_logs 表 (暂不创建)
-- ============================================
-- CREATE TABLE work_logs (
--     id              TEXT PRIMARY KEY,
--     task_id         TEXT,
--     app_name        TEXT,           -- 'CLIPStudioPaint', 'WindowsTerminal', 'VSCode' ...
--     started_at      TEXT,
--     ended_at        TEXT,
--     duration_minutes INTEGER,
--     idle_interruptions INTEGER DEFAULT 0,
--     created_at      TEXT DEFAULT (datetime('now'))
-- );
```

### 6.2 客户端本地缓存 (只读备份)

```sql
-- ============================================
-- Phase 1: 客户端缓存表 (local-cache.sqlite)
-- ============================================

-- 与服务端 tasks 结构相同，但仅存储最近 7 天的任务
CREATE TABLE cached_tasks (
    -- 与服务端 tasks 完全相同的字段
    id              TEXT PRIMARY KEY,
    title           TEXT NOT NULL,
    description     TEXT DEFAULT '',
    category        TEXT DEFAULT 'other',
    status          TEXT DEFAULT 'pending',
    priority        INTEGER DEFAULT 0,
    scheduled_date  TEXT,
    due_date        TEXT,
    estimated_minutes INTEGER,
    parent_task_id  TEXT,
    phase_order     INTEGER,
    source          TEXT DEFAULT 'manual',
    is_recurring    INTEGER DEFAULT 0,
    recurring_rule  TEXT,
    created_at      TEXT,
    updated_at      TEXT,
    completed_at    TEXT,
    -- 缓存元数据
    synced_at       TEXT DEFAULT (datetime('now'))  -- 最后同步时间
);

-- 客户端本地设置 (窗口位置、连接配置等)
CREATE TABLE local_settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);
```

### 6.3 TypeScript 类型定义

```typescript
// shared/types.ts — 服务端和客户端共用

export interface Task {
  id: string;
  title: string;
  description: string;
  category: 'programming' | 'drawing' | 'life' | 'health' | 'other';
  status: 'pending' | 'in_progress' | 'completed' | 'postponed';
  priority: number;
  scheduledDate: string | null;
  dueDate: string | null;
  estimatedMinutes: number | null;
  parentTaskId: string | null;
  phaseOrder: number | null;
  source: 'manual' | 'feishu' | 'ai_decomposed';
  isRecurring: boolean;
  recurringRule: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  category?: Task['category'];
  priority?: number;
  scheduledDate?: string;
  dueDate?: string;
  estimatedMinutes?: number;
}

export interface UpdateTaskInput {
  id: string;
  title?: string;
  description?: string;
  category?: Task['category'];
  status?: Task['status'];
  priority?: number;
  scheduledDate?: string | null;
  dueDate?: string | null;
  estimatedMinutes?: number | null;
}

export interface ReminderLog {
  id: string;
  reminderType: 'water_stretch' | 'medication' | 'task_due';
  triggeredAt: string;
  respondedAt: string | null;
  responseType: 'done' | 'postponed' | 'ignored' | null;
}

// ============================================
// WebSocket 消息类型
// ============================================
export type WsServerEvent =
  | { type: 'reminder:trigger'; payload: { reminderType: string; message: string; logId: string } }
  | { type: 'task:created'; payload: Task }
  | { type: 'task:updated'; payload: Task }
  | { type: 'task:deleted'; payload: { id: string } }
  | { type: 'tasks:sync'; payload: Task[] }         // 全量同步（重连后）
  | { type: 'server:shutdown'; payload: { message: string } };

export type WsClientEvent =
  | { type: 'auth'; payload: { apiKey: string } }
  | { type: 'ping' };

// ============================================
// API 响应格式
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface AppSettings {
  workHours: {
    start: string;        // "10:00"
    end: string;          // "17:00"
    lunchStart: string;   // "12:00"
    lunchEnd: string;     // "13:40"
  };
  reminders: {
    waterStretchIntervalMinutes: number;
    medicationTime: string;        // "09:10"
    enabled: boolean;
  };
  feishu: {
    webhookUrl: string;
    dailyReminderEnabled: boolean;
  };
}
```

---

## 7. 通信协议

### 7.1 REST API 端点

```
Base URL: http(s)://<server-host>:<port>/api/v1
认证方式: 所有请求携带 Header: X-API-Key: <api-key>

── 健康检查 ──
GET    /health                           → { status: "ok", uptime: number }

── 任务 ──
GET    /tasks                            → ApiResponse<Task[]>           (全部)
GET    /tasks?date=2026-06-21            → ApiResponse<Task[]>           (按日期)
GET    /tasks?status=pending             → ApiResponse<Task[]>           (按状态)
GET    /tasks?category=programming       → ApiResponse<Task[]>           (按分类)
GET    /tasks/today                      → ApiResponse<Task[]>           (今日)
GET    /tasks/:id                        → ApiResponse<Task>
POST   /tasks                            → ApiResponse<Task>             (创建)
PATCH  /tasks/:id                        → ApiResponse<Task>             (更新)
DELETE /tasks/:id                        → ApiResponse<void>             (删除)
POST   /tasks/:id/complete              → ApiResponse<Task>             (快捷完成)
POST   /tasks/:id/postpone              → ApiResponse<Task>             (推迟, body: { untilDate })

── 提醒 ──
POST   /reminders/respond               → ApiResponse<void>             (body: { logId, response })

── 设置 ──
GET    /settings                         → ApiResponse<AppSettings>
PUT    /settings                         → ApiResponse<AppSettings>
```

### 7.2 WebSocket 协议

```
连接: ws(s)://<server-host>:<port>/ws

客户端连接流程:
  1. 客户端建立 WebSocket 连接
  2. 客户端发送认证消息: { type: "auth", payload: { apiKey: "xxx" } }
  3. 服务端验证 → 成功则发送当前任务同步: { type: "tasks:sync", payload: Task[] }
  4. 服务端验证 → 失败则关闭连接 (code 4001)
  5. 之后保持长连接，服务端主动推送事件

心跳:
  客户端每 30 秒发送: { type: "ping" }
  服务端回复 pong (WebSocket 协议级)
  超过 60 秒无心跳 → 服务端断开连接

重连策略 (客户端):
  断线后指数退避重连: 1s → 2s → 4s → 8s → 16s → 30s (最大)
  重连成功后自动发送 auth → 获取 tasks:sync 全量同步
```

### 7.3 客户端 IPC (内部)

```
客户端 Electron 内部 IPC (preload contextBridge):

窗口操作:
  window:toggle-panel          → 切换面板显示/隐藏
  window:set-always-on-top     → 设置置顶

服务端通信代理 (主进程代理 HTTP 请求):
  api:get    → GET 请求代理
  api:post   → POST 请求代理
  api:patch  → PATCH 请求代理
  api:delete → DELETE 请求代理

  > 渲染进程调用 window.api.get('/tasks/today') 
  > → preload IPC → 主进程 httpGet(serverUrl + '/api/v1/tasks/today')
  > → 返回结果给渲染进程

WebSocket 事件转发:
  ws:event    → 主进程 WebSocket 收到服务端推送 → 转发到渲染进程

本地缓存:
  cache:getTasks    → 从本地 SQLite 获取缓存任务
  cache:saveTasks   → 保存任务到本地缓存
```

---

## 8. 运行时策略

### 8.1 服务端提醒引擎

```
服务端 node-cron 每秒检查一次状态:

  决策树:
  当前时间在工作日？
    ├─ 否 → 不触发提醒
    └─ 是 → 当前时间在 10:00-17:00 之间？
              ├─ 否 → 不触发提醒
              └─ 是 → 当前时间在 12:00-13:40 (午休) 之间？
                        ├─ 是 → 不触发提醒
                        └─ 否 → 距上次提醒 >= 45分钟？
                                  ├─ 是 → 检查是否有在线客户端
                                  │         ├─ 有 → WebSocket 推送提醒
                                  │         └─ 无 → 飞书推送提醒 (兜底)
                                  └─ 否 → 等待下次检查

特殊时间点:
  09:10 ─ 飞书推送服药提醒 + 今日任务摘要 (无论客户端是否在线)
  12:00 ─ WebSocket 推送午休提醒，引擎进入静默
  13:40 ─ WebSocket 推送下午开始提醒，引擎恢复
  16:45 ─ WebSocket 推送收尾提醒: 检查今日任务完成情况
  17:00 ─ 引擎进入可选模式 (有客户端在线则继续，否则休眠)
```

### 8.2 提醒升级策略

```
Phase 1: 两级提醒

L1 — 温和提醒 (首次触发):
  触发:  45分钟周期到达
  方式:  服务端 WebSocket → 客户端 → 桌面通知 + 面板 toast
  文案:  "该补充水分啦 🥤，起来拉伸一下吧~"
  操作:  点击通知 → "已完成 👍" / "再等3分钟 ⏰"
  超时:  30秒后通知自动消失，面板 toast 保留

L2 — 加强提醒 (5分钟后未响应):
  触发:  L1 触发后 5 分钟无客户端回应
  方式:  服务端 → 客户端 → 面板 toast 常驻 (不可自动消失) + 托盘图标闪烁
  操作:  必须点击按钮消除
  兜底:  若客户端不在线 → 飞书推送提醒

Phase 3 扩展 L3 — 紧急提醒:
  触发:  任务 DDL 临近 / 多次忽视 L2
  方式:  弹窗阻断 + 飞书强提醒
```

### 8.3 客户端离线处理 (Phase 1)

```
客户端状态机:

  ONLINE ──(WS断开)──→ OFFLINE
                         │
                         ├─ UI: 连接状态指示器变红 "离线"
                         ├─ UI: 任务列表切换为本地缓存数据 (只读)
                         ├─ UI: 创建/编辑/完成按钮灰掉 + hover 提示"当前离线"
                         └─ 自动重连 (指数退避)
                              │
                              ├─ 成功 → ONLINE (全量同步 + 清除离线状态)
                              └─ 失败 → 继续 OFFLINE + 重试
```

---

## 9. 飞书集成规格

### 9.1 集成方式

```
Phase 1: 飞书自定义机器人 Webhook (单向推送)
  触发方:  服务端 (24/7 运行)
  可靠性:  不受客户端开关机影响
  频率限制: 飞书自定义机器人 1 次/秒, 20 次/分钟 ← 我们的频率远低于此

Phase 3: 飞书应用机器人 (双向通信)
  新增:  用户在飞书发消息 → 服务端接收 → 解析意图 → 执行操作
```

### 9.2 消息模板

```typescript
// 每日 9:10 推送
const medicationReminderCard = {
  msg_type: "interactive",
  card: {
    header: {
      title: { tag: "plain_text", content: "☀️ 早上好！新的一天" },
      template: "orange"
    },
    elements: [
      {
        tag: "div",
        text: { tag: "lark_md", content: "💊 **先吃药哦**\n按时服药很重要，照顾好自己~" }
      },
      { tag: "hr" },
      {
        tag: "div",
        text: { tag: "lark_md", content: "📋 **今日任务** ({{count}} 项)\n{{taskList}}" }
      },
      {
        tag: "div",
        text: { tag: "lark_md", content: "⏰ 工作时间: 10:00 - 17:00\n💧 每45分钟会提醒喝水拉伸\n🍱 午休: 12:00 - 13:40" }
      },
      { tag: "hr" },
      {
        tag: "note",
        elements: [{ tag: "plain_text", content: "🐱 ADHD 时间管家 · 云端守护中" }]
      }
    ]
  }
};

// 兜底提醒 (客户端不在线时)
const fallbackReminderCard = {
  msg_type: "interactive",
  card: {
    header: {
      title: { tag: "plain_text", content: "⏰ 活动提醒" },
      template: "blue"
    },
    elements: [
      {
        tag: "div",
        text: { tag: "lark_md", content: "🥤 该喝口水了\n🤸 起来拉伸一下吧\n\n_检测到桌面端不在线，通过飞书提醒你~_" }
      }
    ]
  }
};
```

---

## 10. 部署方案

### 10.1 服务端部署

```
推荐方案（按成本从低到高）:

方案 A — Oracle Cloud 永久免费 (推荐):
  规格:    4 ARM vCPU, 24GB RAM, 200GB 存储
  系统:    Ubuntu 22.04
  成本:    ¥0/月 (永久免费)
  部署:    Git clone → pnpm install → pm2 start

方案 B — Railway / Render 免费层:
  规格:    512MB RAM, 共享 CPU
  成本:    ¥0/月 (有使用额度限制)
  部署:    Git push 自动部署

方案 C — 轻量云服务器:
  规格:    1 vCPU, 1GB RAM
  成本:    ~¥30-50/月
  部署:    同方案 A

部署步骤 (方案 A):
  1. 创建 Oracle Cloud 免费实例 (Ubuntu 22.04)
  2. 安装 Node.js 18 LTS + pnpm
  3. git clone <repo>
  4. cd server && pnpm install
  5. 配置 .env (API_KEY, FEISHU_WEBHOOK_URL, DEEPSEEK_API_KEY 等)
  6. pm2 start dist/index.js --name adhd-server
  7. pm2 save && pm2 startup
  8. (可选) 配置 Cloudflare Tunnel 或 frp 做内网穿透 + HTTPS
```

### 10.2 客户端分发 (GitHub Releases)

```
分发流程:
  1. 开发完成 → 推送代码到 GitHub main 分支
  2. GitHub Actions 触发构建:
     - pnpm install
     - cd client && pnpm build:win
     - 生成 Windows NSIS 安装包 (.exe)
  3. 创建 GitHub Release → 上传安装包
  4. electron-updater 自动检测新版本 → 通知用户更新

GitHub Actions 工作流 (client/.github/workflows/release.yml):
  trigger: push tag v*
  jobs:
    build:
      runs-on: windows-latest
      steps:
        - uses: actions/checkout
        - uses: pnpm/action-setup
        - run: pnpm install
        - run: cd client && pnpm build:win
        - uses: softprops/action-gh-release
          with:
            files: client/dist/*.exe

electron-updater 配置 (electron-builder.yml):
  publish:
    provider: github
    owner: <github-username>
    repo: <repo-name>
```

### 10.3 项目仓库结构 (GitHub)

```
adhd-time-manager/                    # GitHub 仓库根目录
├── .github/
│   └── workflows/
│       └── release.yml               # 自动构建 + Release
│
├── server/                           # 服务端 (Express + SQLite)
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env.example                  # 环境变量模板
│   └── src/
│       ├── index.ts                  # 入口
│       ├── app.ts                    # Express 应用配置
│       ├── routes/
│       │   ├── index.ts
│       │   ├── tasks.ts
│       │   ├── reminders.ts
│       │   └── settings.ts
│       ├── services/
│       │   ├── taskService.ts
│       │   ├── reminderService.ts
│       │   ├── feishuService.ts
│       │   └── cronService.ts
│       ├── db/
│       │   ├── index.ts              # 数据库初始化
│       │   ├── migrations.ts         # 建表
│       │   ├── taskRepository.ts
│       │   └── reminderRepository.ts
│       ├── ws/
│       │   └── wsServer.ts           # WebSocket 服务
│       └── middleware/
│           ├── auth.ts               # API Key 认证
│           └── errorHandler.ts
│
├── client/                           # 桌面客户端 (Electron + React)
│   ├── electron.vite.config.ts
│   ├── electron-builder.yml
│   ├── package.json
│   ├── tailwind.config.js
│   └── src/
│       ├── main/                     # Electron 主进程
│       │   ├── index.ts              # 入口
│       │   ├── tray.ts               # 系统托盘
│       │   ├── windows.ts            # 窗口管理
│       │   ├── ipc/
│       │   │   ├── index.ts          # IPC 注册入口
│       │   │   ├── apiProxy.ts       # HTTP 请求代理
│       │   │   ├── wsBridge.ts       # WebSocket 桥接
│       │   │   ├── cacheHandlers.ts  # 本地缓存操作
│       │   │   └── windowHandlers.ts # 窗口操作
│       │   ├── services/
│       │   │   ├── apiClient.ts      # HTTP 客户端 (调用服务端 API)
│       │   │   ├── wsClient.ts       # WebSocket 客户端 (连接服务端)
│       │   │   ├── cacheService.ts   # 本地缓存管理
│       │   │   └── notificationService.ts
│       │   └── utils/
│       │       └── paths.ts
│       ├── preload/
│       │   ├── index.ts              # contextBridge
│       │   └── index.d.ts
│       ├── renderer/                 # React 渲染进程
│       │   ├── index.html
│       │   ├── main.tsx
│       │   ├── App.tsx
│       │   ├── components/
│       │   │   ├── TaskPanel.tsx
│       │   │   ├── TaskItem.tsx
│       │   │   ├── TaskForm.tsx
│       │   │   ├── ReminderToast.tsx
│       │   │   ├── SettingsPanel.tsx
│       │   │   ├── ConnectionStatus.tsx   # 在线/离线/重连指示器
│       │   │   └── ProgressBar.tsx
│       │   ├── hooks/
│       │   │   ├── useTasks.ts
│       │   │   ├── useReminder.ts
│       │   │   ├── useSettings.ts
│       │   │   └── useConnection.ts       # WebSocket 连接状态
│       │   ├── context/
│       │   │   └── AppContext.tsx
│       │   └── styles/
│       │       └── globals.css
│       └── resources/
│           ├── icon.png
│           └── tray-icon.png
│
├── shared/                           # 共享类型和常量
│   ├── types.ts                      # Task, ReminderLog, ApiResponse 等
│   ├── constants.ts                  # 默认设置、IPC channel 名称
│   └── wsEvents.ts                   # WebSocket 事件类型定义
│
├── package.json                      # 根 workspace 配置
├── pnpm-workspace.yaml               # pnpm monorepo 配置
├── .gitignore
├── README.md
└── AI_DEVELOPMENT_GUIDE.md           # 本文件
```

### 10.4 pnpm Workspace 配置

```yaml
# pnpm-workspace.yaml
packages:
  - 'server'
  - 'client'
  - 'shared'
```

```json
// 根 package.json (关键字段)
{
  "name": "adhd-time-manager",
  "private": true,
  "scripts": {
    "dev:server": "pnpm --filter server dev",
    "dev:client": "pnpm --filter client dev",
    "build:server": "pnpm --filter server build",
    "build:client": "pnpm --filter client build:win",
    "typecheck": "pnpm -r typecheck"
  }
}
```

---

## 11. 开发路线图

### 11.1 四阶段总览

```
Phase 1 ─ 服务端 + 客户端基础 + 提醒闭环 (预计 7-10 天)
  ├─ 服务端: REST API + WebSocket + 定时提醒 + 飞书推送 + SQLite
  ├─ 客户端: 托盘 + 任务面板 + 连接服务端 + 桌面通知 + 本地缓存
  ├─ 部署: 服务端上云 + GitHub Actions 构建 + GitHub Release
  └─ 验收: 提醒全链路正常 (服务端→客户端→桌面通知)，飞书 9:10 准时推送

Phase 2 ─ 活动感知 (预计 3-5 天)
  ├─ 客户端: 前台窗口检测 + 键鼠空闲检测 + 走神提醒
  ├─ 服务端: work_logs 表 + 工时统计 API
  └─ 验收: 一天结束后 work_logs 有正确的工作记录

Phase 3 ─ AI 集成 + 飞书双向 (预计 7-10 天)
  ├─ 服务端: DeepSeek 任务拆解 + 飞书应用机器人消息接收
  ├─ 客户端: 离线写入队列 + 重连自动同步
  ├─ 服务端: 拖延检测 + L3 提醒升级
  └─ 验收: 飞书发"拆解：一周内完成XX" → 客户端收到子任务

Phase 4 ─ 体验打磨 (持续迭代)
  ├─ 服务端生成每日/每周复盘摘要 → 飞书推送
  ├─ 客户端: 成就感可视化
  ├─ 能量/精力标签 + 智能任务排序
  └─ 验收: 使用 2 周后自我评估 ADHD 管理改善程度
```

### 11.2 依赖关系

```
Phase 1 (基础设施)
  ├──→ Phase 2 (活动感知, 纯扩展, 不修改 Phase 1 接口)
  ├──→ Phase 3 (AI + 飞书双向, 扩展 Phase 1 接口)
  └──→ Phase 4 (体验打磨, 持续性)

规则: 每个 Phase 只添加表/字段/API，不破坏已有接口
```

---

## 12. Phase 1 详细任务清单

> **使用说明**: 每个任务包含验收标准（AC）。AI Agent 必须在所有 AC 满足后才能标记任务完成。
> 
> **任务状态**: `pending` → `in_progress` → `completed`
>
> **开发顺序**: 建议先完成服务端（任务 1-4），再完成客户端（任务 5-9），最后部署（任务 10-11）。
>   任务 3 和 5 可并行（服务端 API 和客户端脚手架无依赖）。

### 任务 1: Monorepo 初始化 + 共享类型

| 项 | 内容 |
|----|------|
| **优先级** | 🔴 最高 |
| **预估时间** | 30-60 分钟 |
| **依赖** | 无 |

**子任务**:
- [ ] 创建根 `package.json` (pnpm workspace)
- [ ] 创建 `pnpm-workspace.yaml`
- [ ] 创建 `shared/package.json` + `shared/types.ts` + `shared/constants.ts` + `shared/wsEvents.ts`
- [ ] 创建 `.gitignore` (node_modules, dist, .env, *.db, *.sqlite)
- [ ] 验证：`pnpm install` 在根目录成功

**验收标准 (AC)**:
- [ ] `pnpm install` 无报错
- [ ] `shared/types.ts` 包含第 6.3 节所有类型定义
- [ ] TypeScript 编译 `shared/` 无错误

---

### 任务 2: 服务端项目初始化 + 数据库层

| 项 | 内容 |
|----|------|
| **优先级** | 🔴 最高 |
| **预估时间** | 1-2 小时 |
| **依赖** | 任务 1 |

**子任务**:
- [ ] 创建 `server/package.json` (express, better-sqlite3, ws, node-cron, @larksuiteoapi/node-sdk, uuid, cors, dotenv, tsx)
- [ ] 创建 `server/tsconfig.json`
- [ ] 创建 `server/.env.example` (PORT, API_KEY, FEISHU_WEBHOOK_URL, DEEPSEEK_API_KEY)
- [ ] 实现 `server/src/db/index.ts` — 数据库初始化 + WAL 模式
- [ ] 实现 `server/src/db/migrations.ts` — tasks + reminder_logs 建表
- [ ] 实现 `server/src/db/taskRepository.ts` — 完整 CRUD + 查询方法
- [ ] 实现 `server/src/db/reminderRepository.ts` — 插入 + 查询
- [ ] 在 `server/src/index.ts` 中写启动验证：自动建表 + 打印成功消息

**验收标准 (AC)**:
- [ ] `pnpm --filter server dev` 启动 → 数据库文件自动创建
- [ ] taskRepository 的 CRUD 方法全部可调用（手动 import 测试）
- [ ] 数据库 WAL 模式已启用

---

### 任务 3: 服务端 REST API + 认证中间件

| 项 | 内容 |
|----|------|
| **优先级** | 🔴 最高 |
| **预估时间** | 2-3 小时 |
| **依赖** | 任务 2 |

**子任务**:
- [ ] 实现 `server/src/middleware/auth.ts` — API Key 验证中间件
- [ ] 实现 `server/src/middleware/errorHandler.ts` — 统一错误处理
- [ ] 实现 `server/src/routes/tasks.ts` — 全部 7 个任务端点
- [ ] 实现 `server/src/routes/reminders.ts` — POST /reminders/respond
- [ ] 实现 `server/src/routes/settings.ts` — GET + PUT /settings
- [ ] 实现 `server/src/routes/index.ts` — 路由汇总 + /health
- [ ] 实现 `server/src/app.ts` — Express 应用组装
- [ ] 实现 `server/src/index.ts` — HTTP 服务器启动
- [ ] 用 curl 或 Postman 测试全部端点

**验收标准 (AC)**:
- [ ] `GET /api/v1/health` 返回 `{ status: "ok" }`
- [ ] 无 API Key 的请求返回 401
- [ ] 正确 API Key 的请求返回 200 + 数据
- [ ] POST 创建任务 → GET 能查到 → PATCH 更新成功 → DELETE 删除成功
- [ ] POST /tasks/:id/complete → 任务 status 变为 completed，completed_at 有值
- [ ] GET /tasks/today → 只返回今日 scheduled 的任务

---

### 任务 4: 服务端 WebSocket + 定时提醒引擎 + 飞书推送

| 项 | 内容 |
|----|------|
| **优先级** | 🔴 最高 |
| **预估时间** | 3-4 小时 |
| **依赖** | 任务 3 |

**子任务**:
- [ ] 实现 `server/src/ws/wsServer.ts` — WebSocket 服务
  - 连接认证 (验证 API Key)
  - 心跳检测 (60s 超时断开)
  - 广播函数 (向所有已认证客户端推送)
- [ ] 实现 `server/src/services/taskService.ts` — 任务操作 + 变更后广播 WebSocket
- [ ] 实现 `server/src/services/reminderService.ts` — 提醒触发逻辑
  - 判断是否应触发 (工作时间 + 午休排除 + 间隔检查)
  - 生成提醒消息
  - 记录 reminder_log
  - 通过 WebSocket 广播推送
- [ ] 实现 `server/src/services/cronService.ts` — node-cron 调度
  - 每 5 秒检查一次是否应触发提醒 (生产环境可调整)
  - 9:10 触发飞书推送
  - 12:00 午休开始推送
  - 13:40 下午开始推送
- [ ] 实现 `server/src/services/feishuService.ts` — 飞书 Webhook 调用
  - 每日推送 (带防重复逻辑)
  - 兜底提醒 (无客户端在线时)
- [ ] 集成到 `server/src/index.ts` — HTTP + WebSocket 共用端口启动

**验收标准 (AC)**:
- [ ] WebSocket 连接 → 发送 auth → 收到 `tasks:sync` 事件
- [ ] 通过 REST API 创建任务 → WebSocket 客户端收到 `task:created` 事件
- [ ] 服务端运行 ≥ 45 分钟后 → WebSocket 客户端收到 `reminder:trigger` 事件
- [ ] 修改系统时间到 9:10 → 飞书收到服药提醒消息卡片
- [ ] 修改系统时间到 12:00 → 午休期间不触发提醒
- [ ] 修改系统时间到 13:40 → 恢复提醒触发
- [ ] 当日已发送飞书推送 → 服务端重启 → 不会重复发送

---

### 任务 5: 客户端项目脚手架

| 项 | 内容 |
|----|------|
| **优先级** | 🔴 最高 |
| **预估时间** | 1 小时 |
| **依赖** | 任务 1 (可与任务 2-4 并行) |

**子任务**:
- [ ] 使用 `pnpm create @electron-vite/create` 初始化 client/ (React + TypeScript)
- [ ] 配置 Tailwind CSS (tailwind.config.js + postcss.config.js + globals.css)
- [ ] 配置 `electron-builder.yml` (appId, productName, NSIS 安装包, publish 指向 GitHub)
- [ ] 安装额外依赖: auto-launch, electron-updater
- [ ] 验证：`pnpm --filter client dev` 能启动 Electron 窗口显示 React 页面

**验收标准 (AC)**:
- [ ] `pnpm --filter client dev` → Electron 窗口正常显示
- [ ] Tailwind CSS 类名生效
- [ ] `pnpm --filter client build:win` → 生成安装包
- [ ] TypeScript 编译无错误

---

### 任务 6: 客户端系统托盘 + 开机自启 + 窗口管理

| 项 | 内容 |
|----|------|
| **优先级** | 🔴 最高 |
| **预估时间** | 1-2 小时 |
| **依赖** | 任务 5 |

**子任务**:
- [ ] 实现 `client/src/main/tray.ts` — 托盘图标 + 右键菜单 (显示面板 / 设置 / 退出)
- [ ] 实现 `client/src/main/windows.ts` — 创建无边框便签窗口 (380×560, 圆角, 可拖拽, 默认置顶)
- [ ] 集成 auto-launch (首次启动默认开启)
- [ ] 关闭窗口 → 最小化到托盘 (不退出应用)
- [ ] 双击托盘 → 显示面板
- [ ] 实现 `client/src/main/ipc/windowHandlers.ts` — 窗口操作 IPC

**验收标准 (AC)**:
- [ ] 启动 → 托盘图标出现 + 任务面板显示
- [ ] 右键托盘 → 三个菜单项都可点击
- [ ] 关闭面板 → 窗口隐藏, 托盘仍在
- [ ] 双击托盘 → 面板重新显示
- [ ] 面板无边框、有圆角、可拖拽 (通过标题栏区域)
- [ ] 退出 → 完全关闭

---

### 任务 7: 客户端服务通信层 (API Client + WebSocket Client + 缓存)

| 项 | 内容 |
|----|------|
| **优先级** | 🔴 最高 |
| **预估时间** | 2-3 小时 |
| **依赖** | 任务 6 + 服务端任务 4 完成 |

**子任务**:
- [ ] 实现 `client/src/main/services/apiClient.ts` — HTTP 客户端封装
  - 读取设置中的 serverUrl 和 apiKey
  - 所有请求携带 X-API-Key header
  - 统一错误处理 (网络错误、超时、服务端错误)
- [ ] 实现 `client/src/main/services/wsClient.ts` — WebSocket 客户端
  - 连接服务端 → 发送 auth → 接收事件
  - 心跳 (30s ping)
  - 断线重连 (指数退避: 1s→2s→4s→8s→16s→30s)
  - 事件转发到渲染进程 (通过 IPC)
- [ ] 实现 `client/src/main/services/cacheService.ts` — 本地 SQLite 缓存
  - 初始化客户端缓存数据库
  - syncTasks(tasks: Task[]) — 批量写入/更新缓存
  - getCachedTasks() — 读取缓存
- [ ] 实现 `client/src/main/ipc/apiProxy.ts` — IPC 代理 HTTP 请求
- [ ] 实现 `client/src/main/ipc/wsBridge.ts` — IPC 转发 WebSocket 事件
- [ ] 实现 `client/src/main/ipc/cacheHandlers.ts` — IPC 缓存操作
- [ ] 实现 `client/src/preload/index.ts` — contextBridge 暴露 API

**验收标准 (AC)**:
- [ ] 客户端配置正确的 serverUrl + apiKey → 启动后自动连接 WebSocket
- [ ] 渲染进程调用 `window.api.get('/tasks/today')` → 返回服务端数据
- [ ] WebSocket 收到 `reminder:trigger` → 渲染进程触发桌面通知
- [ ] WebSocket 断开 → 自动重连 → 重连成功后收到 `tasks:sync`
- [ ] 服务端不可达 → UI 显示离线状态 → 任务列表显示本地缓存数据
- [ ] 离线时缓存数据可读，但写入操作提示 "当前离线"

---

### 任务 8: 客户端任务面板 UI

| 项 | 内容 |
|----|------|
| **优先级** | 🟡 高 |
| **预估时间** | 3-5 小时 |
| **依赖** | 任务 7 |

**子任务**:
- [ ] 实现 `ConnectionStatus.tsx` — 连接状态指示器 (绿色在线 / 红色离线 / 黄色重连中)
- [ ] 实现 `TaskPanel.tsx` — 主面板布局
  - 顶部: 日期 + 连接状态 + 进度条 + 设置齿轮图标
  - 中部: 任务列表 (按 status 分组: 待完成 → 进行中 → 已完成)
  - 底部: 快速添加按钮 (+)
- [ ] 实现 `TaskItem.tsx` — 单个任务卡片
  - 标题、分类标签 (颜色编码)、优先级指示
  - 操作按钮: 开始/完成(大勾) / 推迟 / 编辑 / 删除
  - 完成动效: 0.3s 淡绿色过渡 + 划线
- [ ] 实现 `TaskForm.tsx` — 新建/编辑对话框
  - 自动聚焦标题输入框
  - 分类下拉: 编程🖥️ / 绘画🎨 / 生活🏠 / 健康💪 / 其他📌
  - 计划日期选择器
  - 预估时间输入
  - 回车提交，Esc 取消
- [ ] 实现 `ReminderToast.tsx` — 提醒弹窗
  - 从面板顶部滑入
  - 两个按钮: "已完成 👍" / "再等3分钟 ⏰"
  - 5 秒无操作 → 升级为常驻
- [ ] 实现 `ProgressBar.tsx` — 今日完成进度条
  - 计算: completed / (completed + pending) × 100%
  - 暖色渐变填充 + 0.5s 过渡动效
- [ ] 实现 hooks: `useTasks.ts`, `useReminder.ts`, `useConnection.ts`
- [ ] 实现 `AppContext.tsx` — 全局状态管理

**验收标准 (AC)**:
- [ ] 面板显示今日任务列表 (空状态时显示 "今天没有任务，点击 + 添加")
- [ ] 点击 + → 表单弹出 → 填标题 → 回车 → 任务出现在列表
- [ ] 点击完成 → 任务变绿 + 划线 + 进度条更新
- [ ] 点击推迟 → 弹出日期选择 → 任务移到对应日期
- [ ] 编辑任务 → 修改 → 保存 → 列表更新
- [ ] 收到 WebSocket 提醒 → toast 滑入 → 点击完成 → toast 消失
- [ ] 离线时任务列表显示缓存数据，按钮灰掉并有 tooltip 提示
- [ ] 重新上线 → 自动全量同步 → 列表更新为最新数据

---

### 任务 9: 客户端设置面板

| 项 | 内容 |
|----|------|
| **优先级** | 🟢 中 |
| **预估时间** | 1-2 小时 |
| **依赖** | 任务 7 |

**子任务**:
- [ ] 实现 `SettingsPanel.tsx` — 独立窗口 (有边框, 420×500)
  - 服务器连接: URL + API Key + 测试连接按钮
  - 工作时间: 4 个时间输入 (开始/结束/午休开始/午休结束)
  - 提醒设置: 间隔分钟数 (默认45, 范围15-120)
  - 飞书: Webhook URL + 测试按钮 + 每日提醒开关
  - 应用: 开机自启开关 / 置顶开关
- [ ] 实现 `useSettings.ts` — 设置读写 Hook
- [ ] 保存后: 本地设置写文件 + 服务端设置通过 API 同步

**验收标准 (AC)**:
- [ ] 托盘菜单 → 设置 → 打开设置窗口
- [ ] 修改服务器地址 → 保存 → 客户端立即使用新地址重连
- [ ] 点击 "测试连接" → 显示成功/失败结果
- [ ] 修改提醒间隔 → 服务端下次提醒按新间隔触发
- [ ] 点击飞书测试 → 飞书收到测试消息

---

### 任务 10: 客户端日志与错误处理

| 项 | 内容 |
|----|------|
| **优先级** | 🟢 中 |
| **预估时间** | 1 小时 |
| **依赖** | 任务 8 |

**子任务**:
- [ ] 主进程关键操作打日志 (连接、断开、重连、API 调用错误)
- [ ] 渲染进程全局错误边界 (Error Boundary)
- [ ] 服务端不可达时显示友好提示而非白屏
- [ ] API 调用超时 (10s) 处理

**验收标准 (AC)**:
- [ ] 服务端未启动时客户端不崩溃，显示 "正在连接服务器..."
- [ ] 网络错误有 toast 提示
- [ ] 主进程日志输出到 stdout (方便 pm2 收集)

---

### 任务 11: 部署 (服务端 + GitHub Release)

| 项 | 内容 |
|----|------|
| **优先级** | 🟢 中 |
| **预估时间** | 1-2 小时 |
| **依赖** | 任务 1-10 全部完成 |

**子任务**:
- [ ] 创建 `.github/workflows/release.yml` — 自动构建 Windows 安装包
- [ ] 配置 `electron-builder.yml` publish 段
- [ ] 服务端部署文档 + 启动脚本
- [ ] 创建 README.md (用户视角的安装和使用说明)
- [ ] 打 tag v0.1.0 → 触发 GitHub Actions → 验证 Release 有安装包

**验收标准 (AC)**:
- [ ] GitHub Release 页面有 Windows 安装包下载
- [ ] 下载安装 → 启动 → 配置服务器地址 → 连接成功 → 功能正常
- [ ] 服务端部署到云服务器 → pm2 管理 → 重启后自动恢复
- [ ] 飞书 9:10 推送准时触发 (服务端运行 ≥ 24 小时验证)

---

## 13. AI Agent 开发守则

### 13.1 编码模式（必须做的）

| 场景 | 做法 | 示例 |
|------|------|------|
| 服务端 API 响应 | 统一格式 `{ success, data, error }` | `res.json({ success: true, data: task })` |
| 服务端错误处理 | 所有 route handler 用 try-catch + next(err) | `app.use(errorHandler)` |
| WebSocket 消息 | 所有消息使用 `{ type, payload }` 结构 | 见 §6.3 WsServerEvent 类型 |
| 客户端调用服务端 | 渲染进程 → preload IPC → 主进程 HTTP → 服务端 | `window.api.get('/tasks/today')` |
| 服务端推送客户端 | 服务端 WebSocket → 主进程 → IPC → 渲染进程 | `ws:event` IPC channel |
| 数据库操作 | 仅服务端直接操作 SQLite，客户端通过 API + 本地缓存 | 客户端不直接写服务端数据库 |
| 定时任务 | 仅服务端使用 node-cron，客户端不设定时器 | 避免客户端时间不准/时区问题 |
| 组件状态 | React Context + useReducer | `AppContext.tsx` |
| 样式 | Tailwind CSS + CSS 变量（主题色） | `<div className="bg-amber-50 rounded-xl">` |
| 类型 | 所有 API 参数和返回值显式类型 | 使用 shared/types.ts |
| 时间处理 | 统一使用 ISO 8601 字符串，服务端以 UTC 存储 | `new Date().toISOString()` |

### 13.2 反模式（绝对不能做的）

| ❌ 反模式 | ✅ 正确做法 |
|----------|-----------|
| 在渲染进程中直接 `require('electron')` | 通过 preload + contextBridge |
| 在渲染进程中直接调用 `fetch` 到服务端 | 通过主进程 IPC 代理 (避免 CORS + 统一管理 API Key) |
| 客户端直接操作服务端数据库 | 通过 REST API |
| 在客户端设置 node-cron 定时任务 | 服务端统一调度 |
| 硬编码 API URL / WebSocket URL | 读取配置文件 |
| 使用 `any` 类型 | 使用 shared/types.ts 中的明确类型 |
| WebSocket 消息不使用 type 字段 | 始终使用 `{ type, payload }` 结构 |
| 忘记心跳导致 WebSocket 断连 | 客户端每 30s ping，服务端 60s 超时 |
| 超过 150 行的单个组件 | 拆分为子组件 |
| 提醒文案使用责备/命令式语气 | 使用温和、鼓励的语气 (见 §13.3) |
| 忽略 .env 文件安全 | .env 加入 .gitignore，提供 .env.example 模板 |

### 13.3 文案规范

> 所有提醒和 UI 文案必须：温和、鼓励、不制造焦虑。

| 场景 | ✅ 好的文案 | ❌ 坏的文案 |
|------|-----------|-----------|
| 喝水提醒 | "该补充水分啦 🥤，起来走两步吧~" | "你已经45分钟没喝水了！" |
| 拉伸提醒 | "肩膀还好吗？伸个懒腰吧 🤸" | "久坐有害健康，请立即起身" |
| 走神提醒 | "刚才在做什么来着？慢慢回来就好 😊" | "检测到注意力分散！" |
| 任务未完成 | "没关系，我们稍微调整一下计划？" | "你又没完成任务！" |
| 服药提醒 | "按时吃药，照顾好自己 💊" | "服药时间到了，请立即服药" |
| 午休开始 | "午休时间到 ☀️，好好休息一下吧~" | "系统进入午休模式" |
| 下午开始 | "下午好！继续加油哦 💪" | "提醒引擎已恢复" |
| 空任务列表 | "今天还没有任务，轻松的一天？" | "无待办任务" |
| 连接断开 | "正在重新连接...当前显示的是缓存数据 📡" | "WebSocket connection failed" |
| 任务全完成 | "太棒了！今天的任务全部完成 🎉" | "0 pending tasks" |

### 13.4 常见 AI Agent 陷阱

| 陷阱 | 预防措施 |
|------|---------|
| 客户端和服务端时间不同步 | 服务端统一管理时间，客户端不依赖本地时间 |
| WebSocket 消息丢失 | 重连后服务端发送 `tasks:sync` 全量同步 |
| 飞书 Webhook URL 泄露 | `.env.example` 中用占位符，README 中说明如何获取 |
| 客户端缓存与服务端不一致 | 每次重连全量同步；API 操作后立即更新缓存 |
| Electron contextIsolation | 不能在渲染进程中使用 Node.js API，必须通过 preload |
| SQLite 并发写入 | better-sqlite3 是同步 API，单进程无并发问题；设置 WAL 模式允许读并发 |
| Windows 路径 | 使用 `path.join()` 和 `app.getPath()`，不硬编码路径 |
| Tailwind PurgeCSS | 避免动态类名拼接 (如 `bg-${color}`)，使用完整类名或 safelist |
| electron-builder 构建慢 | CI 中用 GitHub Actions，本地开发不需要频繁构建 |
| 服务端重启丢失定时任务状态 | 启动时从数据库恢复状态（检查上次提醒时间、当日飞书是否已发） |

### 13.5 关键文件路径备忘

```
AI Agent 生成代码时，必须使用以下路径和命名:

服务端入口:        server/src/index.ts
服务端 Express:    server/src/app.ts
服务端路由:        server/src/routes/{tasks,reminders,settings}.ts
服务端服务:        server/src/services/{task,reminder,feishu,cron}Service.ts
服务端数据库:      server/src/db/{index,migrations,taskRepository,reminderRepository}.ts
服务端 WebSocket:  server/src/ws/wsServer.ts
服务端中间件:      server/src/middleware/{auth,errorHandler}.ts

客户端主进程入口:  client/src/main/index.ts
客户端托盘:        client/src/main/tray.ts
客户端窗口:        client/src/main/windows.ts
客户端 IPC:        client/src/main/ipc/{index,apiProxy,wsBridge,cacheHandlers,windowHandlers}.ts
客户端服务:        client/src/main/services/{apiClient,wsClient,cacheService,notificationService}.ts
客户端 Preload:    client/src/preload/index.ts
客户端 React 入口: client/src/renderer/main.tsx
客户端根组件:      client/src/renderer/App.tsx
客户端组件:        client/src/renderer/components/{TaskPanel,TaskItem,TaskForm,ReminderToast,SettingsPanel,ConnectionStatus,ProgressBar}.tsx
客户端 Hooks:      client/src/renderer/hooks/{useTasks,useReminder,useSettings,useConnection}.ts
客户端 Context:    client/src/renderer/context/AppContext.tsx

共享类型:          shared/types.ts
共享常量:          shared/constants.ts
WebSocket 事件:    shared/wsEvents.ts
```

---

## 附录 A: 快速启动命令

```bash
# 克隆仓库
git clone <repo-url> && cd adhd-time-manager

# 安装所有依赖
pnpm install

# ===== 开发模式 =====

# 终端 1: 启动服务端 (http://localhost:3001)
pnpm dev:server

# 终端 2: 启动客户端 (Electron + HMR)
pnpm dev:client

# ===== 构建 =====

# 构建服务端
pnpm build:server

# 构建客户端 (Windows 安装包)
pnpm build:client

# ===== 类型检查 =====
pnpm typecheck

# ===== 部署 =====

# 服务端 (在云服务器上)
cd server
cp .env.example .env    # 编辑 .env 填入真实配置
pnpm build
pm2 start dist/index.js --name adhd-server
pm2 save
```

## 附录 B: 环境变量 (.env)

```bash
# server/.env — 服务端环境变量

# 服务
PORT=3001
NODE_ENV=production

# API 认证 (客户端连接时使用)
API_KEY=your-secret-api-key-here

# 飞书
FEISHU_WEBHOOK_URL=https://open.feishu.cn/open-apis/bot/v2/hook/xxxxx

# DeepSeek (Phase 3 启用)
DEEPSEEK_API_KEY=sk-xxxxx
DEEPSEEK_BASE_URL=https://api.deepseek.com

# 数据库 (默认 server/data/adhd.db)
# DATABASE_PATH=/var/data/adhd.db
```

## 附录 C: 参考资源

| 资源 | 链接 | 用途 |
|------|------|------|
| Express 文档 | https://expressjs.com/ | 服务端框架 |
| better-sqlite3 | https://github.com/WiseLibs/better-sqlite3 | 数据库 API |
| ws 库文档 | https://github.com/websockets/ws | WebSocket |
| electron-vite | https://electron-vite.org/ | 客户端构建工具 |
| Electron 文档 | https://www.electronjs.org/docs | 主进程 API |
| Tailwind CSS | https://tailwindcss.com/docs | 样式 |
| 飞书自定义机器人 | https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot | 飞书 Webhook |
| DeepSeek API | https://platform.deepseek.com/api-docs | LLM (Phase 3) |
| electron-builder | https://www.electron.build/ | 打包和自动更新 |
| Oracle Cloud 免费 | https://www.oracle.com/cloud/free/ | 免费云服务器 |

---

> **文件版本**: v2.0  
> **创建日期**: 2026-06-21  
> **v2.0 变更**: 架构从纯本地 Electron 变更为 Client-Server。服务端 24/7 云端运行负责任务存储+定时提醒+飞书集成；客户端通过 REST API + WebSocket 连接服务端。  
> **维护规则**: 每完成一个 Phase，更新本文档中对应的功能边界、数据模型和 API 端点
