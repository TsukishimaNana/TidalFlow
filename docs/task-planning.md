# Phase 1 功能矩阵 — 查漏报告

> T4 审核日期：2026-06-23
> 基线：develop 分支 (commit b36564f)
> 构建状态：✅ shared + client 编译通过

## 客户端功能

| # | 功能 | 文件 | 状态 | 备注 |
|---|------|------|------|------|
| C1 | 主窗口 (Today's Focus Plan) | `client/src/main/index.ts`, `windows.ts` | ✅ 存在 | 1180×760, min 920×640 |
| C2 | 今日任务仪表盘 (静态 demo) | `client/src/renderer/src/App.tsx` | ⚠️ 硬编码 | 3 个硬编码 demo 任务，未连接 API |
| C3 | 设置面板 (服务器/工作/提醒/飞书) | `client/src/renderer/src/components/SettingsPanel.tsx` | ✅ 存在 | 含 form、保存、恢复默认 |
| C4 | 设置持久化 | `client/src/main/settings.ts` + `useSettings.ts` | ✅ 存在 | electron-store + localStorage 回退 |
| C5 | 面板窗口 (浮动迷你窗口) | `client/src/main/panel.ts` | ✅ 存在 | 380×560, 透明无框, 右上角 |
| C6 | 系统托盘 (图标+菜单) | `client/src/main/tray.ts` | ✅ 存在 | 显示面板/设置/开机自启/退出 |
| C7 | 自动启动 | `client/src/main/tray.ts` (auto-launch) | ✅ 存在 | 托盘菜单勾选 |
| C8 | 自动更新 | `client/src/main/updater.ts` | ✅ 存在 | electron-updater, 仅 packaged |
| C9 | TaskPanel (任务列表+管理) | `client/src/renderer/src/components/TaskPanel.tsx` | 🔴 未挂载 | 文件存在但未被任何地方导入 |
| C10 | TaskForm (新建/编辑任务) | `client/src/renderer/src/components/TaskForm.tsx` | 🔴 未挂载 | 文件存在但需通过 TaskPanel 触发 |
| C11 | TaskItem (任务卡片+滑动手势) | `client/src/renderer/src/components/TaskItem.tsx` | 🔴 未挂载 | 文件存在但需通过 TaskPanel 渲染 |
| C12 | 提醒弹窗 (Toast) | `client/src/renderer/src/components/ReminderToast.tsx` | ✅ 已挂载 | App.tsx 中渲染 |
| C13 | 提醒 Hook (WS 事件) | `client/src/renderer/src/hooks/useReminder.ts` | ✅ 工作 | 直接使用 window.tidalflow.onWsEvent |
| C14 | 连接状态指示器 | `client/src/renderer/src/components/ConnectionStatus.tsx` | 🔴 未挂载 | 文件存在但 App.tsx 未导入 |
| C15 | 错误边界 | `client/src/renderer/src/components/ErrorBoundary.tsx` | ✅ 已挂载 | main.tsx 包裹 |
| C16 | 进度条组件 | `client/src/renderer/src/components/ProgressBar.tsx` | ✅ 存在 | 通用组件 |
| C17 | AppProvider (状态管理) | `client/src/renderer/src/context/AppContext.tsx` | 🔴 未挂载 | main.tsx 未包裹 AppProvider |
| C18 | useTasks hook | `client/src/renderer/src/hooks/useTasks.ts` | 🔴 不可用 | 依赖 AppContext，未挂载时崩溃 |
| C19 | useConnection hook | `client/src/renderer/src/hooks/useConnection.ts` | 🔴 不可用 | 依赖 AppContext，未挂载时崩溃 |
| C20 | IPC API 代理 | `client/src/main/ipc/apiProxy.ts` | ✅ 存在 | 主进程 HTTP 代理 |
| C21 | IPC WebSocket 桥接 | `client/src/main/ipc/wsBridge.ts` | ✅ 存在 | WS 事件转发 |
| C22 | IPC 缓存桥接 | `client/src/main/ipc/cacheBridge.ts` | ✅ 存在 | 离线任务缓存 |
| C23 | 离线缓存 | `client/src/main/services/cacheService.ts` | ✅ 存在 | SQLite 存储 |
| C24 | Logger | `client/src/main/logger.ts` + `client/src/renderer/src/utils/logger.ts` | ✅ 存在 | main+renderer |
| C25 | 完成音效 | `client/src/renderer/src/utils/sounds.ts` | ✅ 存在 | 被 TaskItem 引用 |

## 服务端功能

| # | 功能 | 文件 | 状态 | 备注 |
|---|------|------|------|------|
| S1 | Task REST API (CRUD+complete+postpone) | `server/src/routes/tasks.ts` | ✅ 存在 | 6 端点 |
| S2 | Settings REST API | `server/src/routes/settings.ts` | ✅ 存在 | GET/PUT |
| S3 | Health 端点 | `server/src/routes/health.ts` | ✅ 存在 | /api/v1/health |
| S4 | API Key 认证中间件 | `server/src/middleware/auth.ts` | ✅ 存在 | |
| S5 | 错误处理中间件 | `server/src/middleware/errorHandler.ts` | ✅ 存在 | |
| S6 | WebSocket 服务器 | `server/src/ws/wsServer.ts` | ✅ 存在 | |
| S7 | 提醒服务 (水/伸展/服药/任务到期) | `server/src/services/reminderService.ts` | ✅ 存在 | 3 种提醒类型 |
| S8 | 定时任务 (Cron) | `server/src/services/cronService.ts` | ✅ 存在 | |
| S9 | 飞书集成 | `server/src/services/feishuService.ts` | ✅ 存在 | |
| S10 | SQLite 数据库 | `server/src/db/` | ✅ 存在 | tasks + reminders |
| S11 | 优雅关闭 | `server/src/index.ts` | ✅ 存在 | SIGTERM/SIGINT |

## CI/CD

| # | 功能 | 状态 | 备注 |
|---|------|------|------|
| CI1 | Release workflow (server+client) | ✅ 存在 | release.yml: release-server + release-client |
| CI2 | Tag 触发 | ✅ 存在 | push tags v* |
| CI3 | NSIS 打包 | ✅ 存在 | electron-builder --win NSIS |
| CI4 | Draft release | ✅ 存在 | 2002d91 |
| CI5 | Test gate job | 🔴 缺失 | T3 改动(62f6026)未合并到 develop |
| CI6 | Installer acceptance test | 🔴 缺失 | T3 改动未合并 |

## 测试

| # | 类型 | 状态 | 备注 |
|---|------|------|------|
| T1 | 单元测试文件 | ✅ 存在 | 7 个 test 文件 (client×6 + server×1) |
| T2 | Vitest 配置 | 🔴 缺失 | client package.json 无 vitest 依赖 |
| T3 | test/test:e2e 脚本 | 🔴 缺失 | client package.json 无 test scripts |
| T4 | @testing-library/react | 🔴 缺失 | 测试依赖未声明 |

## 🔴 阻塞级发现 (影响功能可用性)

1. **AppProvider 未挂载** — main.tsx 未用 `<AppProvider>` 包裹。导致 useAppContext() 在任何地方调用都会 throw Error。当前 App.tsx 用硬编码数据回避了此问题，但所有真实任务管理功能不可用。
2. **TaskPanel/ConnectionStatus 未集成** — TaskPanel (任务 CRUD UI) 和 ConnectionStatus (连接状态) 已写但未渲染。面板窗口加载 `?view=panel` 但无路由处理，实际显示主仪表盘。
3. **T3 CI 门禁未合入** — test job + installer acceptance + needs 依赖仅在 `feature/phase1-t3-ci-gates-fix`，未合入 develop。
4. **测试不可运行** — vitest 未声明为依赖，无 test scripts。7 个测试文件存在但不可执行。

## 🟡 非阻塞发现

5. **task-planning.md 原不存在** — docs/ 目录整体缺失。本文件为 T4 执行中创建。
6. **AGENTS.md 引用虚假路径** — 指向 `docs/project-rules/AGENTS.md` 和 `docs/project-rules/CURRENT_SLICE.md`，均不存在。
7. **App.tsx 使用硬编码数据** — 3 个 demo 任务写死，未从 API 获取。

## 不在范围内 (Phase 2)

- 任务父子关系 (parentTaskId, phaseOrder)
- AI 分解 (source: 'ai_decomposed')
- 定期重复任务 (recurringRule)
- 多用户/团队功能
- macOS/Linux 构建
