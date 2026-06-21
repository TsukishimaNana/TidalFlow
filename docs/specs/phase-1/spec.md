# Feature Specification: Phase 1 — 服务端基础 + 客户端基础 + 提醒闭环

**Feature Branch**: `phase-1-foundation`

**Created**: 2026-06-22

**Status**: Draft

**Input**: AI_DEVELOPMENT_GUIDE.md Phase 1 章节 (第 3.2 节 + 第 6-13 章)

## User Scenarios & Testing

### User Story 1 — 服药提醒从不遗漏 (Priority: P1)

每天 9:10 飞书自动推送服药提醒 + 今日任务摘要，无论电脑是否开机。

**Why this priority**: 服药是健康底线，不可中断。飞书推送依赖服务端 24/7 运行，是可靠性最高的一环。

**Independent Test**: 部署服务端后修改系统时间到 9:10，验证飞书群收到消息卡片。

**Acceptance Scenarios**:

1. **Given** 服务端正常运行，**When** 系统时间到达 9:10，**Then** 飞书群收到服药提醒 + 今日任务列表消息卡片
2. **Given** 当日已发送飞书推送，**When** 服务端重启，**Then** 不会重复发送当日推送
3. **Given** 客户端未开机，**When** 系统时间到达 9:10，**Then** 飞书推送仍然触发（服务端独立运作）

---

### User Story 2 — 桌面任务面板随时可用 (Priority: P1)

开机自启一个小便签窗口，直接看到今日任务，无需任何手动操作。

**Why this priority**: 零摩擦启动是 ADHD 用户使用工具的核心前提。每次手动启动 = 多一次放弃机会。

**Independent Test**: Windows 启动后自动出现便签式任务面板，配置服务端地址后可加载任务。

**Acceptance Scenarios**:

1. **Given** 已配置开机自启，**When** 系统开机登录，**Then** 托盘图标出现 + 任务面板自动显示
2. **Given** 面板显示中，**When** 点击关闭按钮，**Then** 窗口最小化到托盘，应用不退出
3. **Given** 面板最小化，**When** 双击托盘图标，**Then** 面板重新显示
4. **Given** 面板窗口，**When** 用户拖拽标题栏区域，**Then** 窗口可自由移动，无边框/圆角/12px 半径
5. **Given** 托盘图标可见，**When** 右键点击，**Then** 显示菜单：显示面板 / 设置 / 退出

---

### User Story 3 — 服务端全天候自动提醒 (Priority: P1)

工作时间 (10:00-17:00) 每 45 分钟推送喝水/拉伸提醒，午休 (12:00-13:40) 静默，不制造骚扰。

**Why this priority**: 温和但持续的提醒是 ADHD 时间管理的核心价值，45 分钟周期有医学依据。

**Independent Test**: 启动服务端 + 客户端连接，等待 45 分钟后观察 WebSocket 推送提醒。

**Acceptance Scenarios**:

1. **Given** 客户端已通过 WebSocket 认证，**When** 距上次提醒 ≥ 45 分钟且在工作时间，**Then** 客户端收到 `reminder:trigger` 事件并显示桌面提醒
2. **Given** 系统时间在 12:00-13:40，**When** 提醒引擎检查，**Then** 不触发任何提醒
3. **Given** 客户端已收到提醒，**When** 用户点击 "已完成 👍"，**Then** 提醒消失 + 记录 reminder_log
4. **Given** 客户端已收到提醒，**When** 用户 5 秒内无操作，**Then** 提醒从 toast 升级为常驻弹窗
5. **Given** 无客户端在线，**When** 提醒触发时间到达，**Then** 飞书接收兜底提醒消息

---

### User Story 4 — 任务 CRUD 全生命周期 (Priority: P2)

创建任务、编辑、标记完成、推迟，所有操作实时同步到服务端，组件间实时推送。

**Why this priority**: 任务管理是工具的基础功能，但需要先有连接和提醒基础设施。

**Independent Test**: 通过 curl 完成完整 CRUD 链路：创建 → 查询 → 更新 → 标记完成 → 删除。

**Acceptance Scenarios**:

1. **Given** 用户在面板点击 "+"，**When** 填写标题后回车，**Then** 任务出现在列表 + WebSocket 推送 `task:created`
2. **Given** 任务列表中有一个待完成任务，**When** 点击完成按钮，**Then** 任务变绿+划线 + 进度条更新 + WebSocket 推送 `task:updated`
3. **Given** 任务列表中有一个任务，**When** 点击推迟 → 选择日期，**Then** 任务`scheduled_date` 更新到新日期
4. **Given** 编辑器打开，**When** 修改分类/优先级/描述 → 保存，**Then** 服务端和客户端同时更新
5. **Given** 空任务列表，**When** 面板加载，**Then** 显示 "今天还没有任务，轻松的一天？"

---

### User Story 5 — 离线时也能查看任务 (Priority: P2)

断网后客户端显示本地缓存的任务数据，按钮灰掉但给出友好提示，不白屏不崩溃。

**Why this priority**: 离线可用的设计原则要求断网时不能丢失已加载的信息。

**Independent Test**: 关闭服务端，观察客户端切换到离线模式，显示缓存数据。

**Acceptance Scenarios**:

1. **Given** 客户端在线时已获取任务数据，**When** 服务端断开，**Then** 连接指示器变红 + 显示 "离线"，任务列表显示缓存的最近数据
2. **Given** 客户端离线，**When** 用户点击创建/编辑/完成按钮，**Then** 按钮灰掉 + hover 提示 "当前离线"
3. **Given** 客户端离线，**When** 服务端恢复，**Then** WebSocket 重连 → 收到 `tasks:sync` → 全量更新为最新数据

---

### User Story 6 — 配置灵活可调 (Priority: P3)

通过托盘菜单打开设置窗口，可配置服务器连接、工作时间、提醒间隔和飞书 Webhook。

**Why this priority**: 设置是必需功能，但不需要第一时间使用（默认值够用）。

**Independent Test**: 修改提醒间隔为 15 分钟 → 保存 → 验证接下来触发间隔变化。

**Acceptance Scenarios**:

1. **Given** 右键托盘 → 设置，**When** 设置窗口打开，**Then** 显示：服务器连接 / 工作时间 / 提醒 / 飞书 / 应用设置
2. **Given** 修改服务器地址 + API Key，**When** 保存，**Then** 客户端使用新地址重连
3. **Given** 设置窗口打开，**When** 点击 "测试连接"，**Then** 显示连接成功/失败结果
4. **Given** 修改提醒间隔为 30，**When** 保存，**Then** 服务端下次提醒按新间隔触发

---

### Edge Cases

- WebSocket 断开后重连时如何避免消息丢失？（重连后全量 `tasks:sync`）
- 系统时间被手动修改到 9:10 两次？（飞书推送用日期标记防重复）
- 客户端和服务端时间不同步？（全部时间以服务端 UTC 为准）
- 提醒恰好落在午休边界 12:00 或 13:40？（边界包含：午休期间不触发，13:40 后可触发）
- .env 文件是否入 Git？（.gitignore 中排除，提供 .env.example）
- 多个客户端同时连接同一服务端？（单用户场景，但 WebSocket 广播设计支持多客户端）
- 飞书 Webhook URL 无效？（静默记录错误日志，不阻塞其他功能）

## Requirements

### Functional Requirements

- **FR-001**: 服务端 MUST 提供 REST API（tasks CRUD + settings + health check）
- **FR-002**: 服务端 MUST 提供 WebSocket 服务（任务变更推送 + 提醒事件推送）
- **FR-003**: 服务端 MUST 通过 node-cron 实现 45 分钟周期提醒引擎，午休自动静默
- **FR-004**: 服务端 MUST 每日 9:10 通过飞书 Webhook 推送服药提醒 + 今日任务摘要
- **FR-005**: 服务端 MUST 使用 API Key 认证中间件保护所有端点
- **FR-006**: 客户端 MUST 实现开机自启 + 系统托盘常驻
- **FR-007**: 客户端 MUST 提供无边框/圆角/12px 半径的便签式任务面板 (380×560)
- **FR-008**: 客户端 MUST 支持任务创建/编辑/删除/标记完成/推迟操作
- **FR-009**: 客户端 MUST 通过 WebSocket 接收服务端推送并触发桌面通知
- **FR-010**: 客户端 MUST 维护本地 SQLite 缓存，断网时显示缓存数据
- **FR-011**: 客户端 MUST 提供设置面板（服务器连接、工作时间、提醒间隔、飞书 URL）
- **FR-012**: 客户端 MUST 显示连接状态指示器（在线/离线/重连中）
- **FR-013**: 客户端 MUST 通过 GitHub Releases + electron-updater 实现自动更新
- **FR-014**: 所有 API 响应 MUST 使用 `{ success, data, error }` 统一格式
- **FR-015**: 所有 WebSocket 消息 MUST 使用 `{ type, payload }` 信封结构
- **FR-016**: 所有 UI 文案 MUST 使用温和、鼓励性的语气（见文案规范）

### Key Entities

- **Task**: 核心实体，包含标题、描述、分类、状态、优先级、计划日期、预估时间。服务端主库 + 客户端 SQLite 缓存。
- **ReminderLog**: 提醒记录，类型（喝水拉伸/服药/任务到期），触发时间，响应类型（完成/推迟/忽略）。
- **AppSettings**: 应用设置，工作时间段、提醒间隔、飞书 Webhook URL。服务端和客户端分别存储。

## Success Criteria

### Measurable Outcomes

- **SC-001**: 服务端 REST API 7 个端点全部可调用，通过 curl 验证
- **SC-002**: WebSocket 连接建立后 3 秒内收到 `tasks:sync` 事件
- **SC-003**: 提醒引擎在工作时间内每 ≥45 分钟准确触发一次
- **SC-004**: 飞书 9:10 推送连续 24 小时准时触发，无重复
- **SC-005**: 客户端从开机到面板显示 ≤ 5 秒
- **SC-006**: 客户端断网 → 显示缓存数据 < 1 秒过渡
- **SC-007**: 客户端重连成功后全量同步 ≤ 2 秒
- **SC-008**: 所有 11 个任务 AC 全部通过
- **SC-009**: TypeScript 编译零错误，strict 模式
- **SC-010**: 安装包构建成功 + GitHub Release 可下载

## Assumptions

- 用户使用 Windows 10/11，不涉及 macOS/Linux 桌面
- 服务端部署在 Oracle Cloud 免费实例或类似 Linux 服务器
- 飞书自定义机器人已创建，Webhook URL 已获取
- 个人工具，单用户场景，不需要多用户认证/权限
- 用户有 GitHub 账号用于 Releases 分发
- 用户有 pnpm ≥ 8.0 和 Node.js ≥ 18 LTS 的开发环境
- 客户端首次安装后由用户手动配置服务端地址和 API Key
- 客户端离线期间不产生新的写入数据（仅读取缓存，写入队列延后到 Phase 3）
- 提醒间隔默认 45 分钟，用户可在 15-120 范围内调整
- DeepSeek API Key 在 Phase 1 仅预留，Phase 3 才启用
