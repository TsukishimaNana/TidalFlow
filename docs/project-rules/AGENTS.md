# ADHD Time Manager (TidalFlow)

一款云端服务 + 桌面客户端的 ADHD 个人任务管理与提醒工具。

---

## 必读顺序

1. `CURRENT_SLICE.md` —— 第一顺位，本轮快照
2. `AGENTS.md` —— 第二顺位，本文件
3. 按需读 `docs/` 下对应文件

---

## 常用命令

| 命令 | 用途 |
|------|------|
| `pnpm install` | 安装 monorepo 所有依赖 |
| `pnpm --filter server dev` | 启动服务端开发模式 |
| `pnpm --filter client dev` | 启动客户端开发模式 |
| `gh auth status` | 检查 GitHub 认证 |
| `git push origin main` | 推送到主分支（仅 release PR 合并后） |

---

## 任务前检查清单

- [ ] 已读 CURRENT_SLICE.md
- [ ] 确认当前 Phase 和当前动作
- [ ] 确认无 BLOCKERS
- [ ] 确认操作在正确分支上

---

## Phase 规则

| Phase | 名称 | 状态 |
|-------|------|------|
| Phase 0 | 基础设施 & 规范 | ← 当前 |
| Phase 1 | 服务端 + 客户端基础 + 提醒闭环 | 待开始 |
| Phase 2 | 活动感知 | 待定义 |
| Phase 3 | AI 集成 + 飞书双向 | 待定义 |
| Phase 4 | 体验打磨 | 待定义 |

规则：
- 每个 Phase 只添加表/字段/API，不破坏已有接口
- Phase 完成后必须更新 CURRENT_SLICE.md 和 gate log

---

## 审阅门禁

| 门禁 | 条件 |
|------|------|
| 代码审查 | Pull Request 必须通过 review 才能合并 |
| 功能验收 | 按 AI_DEVELOPMENT_GUIDE 验收标准逐条通过 |
| Phase Gate | Phase 全部任务 done + gate log 记录后，才能推进下一 Phase |

---

## 状态词汇

| 词汇 | 含义 |
|------|------|
| DRAFT | 草稿，未审阅 |
| REVIEWED | 已审阅，可合并 |
| BLOCKED | 阻塞，需要外部输入 |
| READY | 就绪，可被 Dispatcher 派单 |

---

## 来源安全

- 禁止直接访问生产服务器数据库
- API Key 等敏感信息放 .env，不入库
- .env 必须加入 .gitignore，只提交 .env.example

---

## 路径/编码规则

```
项目根目录: /home/ubuntu/myproject/TidalFlow/
monorepo 包: server/ client/ shared/
文档: docs/project-rules/ docs/gate-logs/ docs/specs/
```

- 文件名：小写 + 连字符
- 编码：UTF-8
- 换行：LF

---

## 红线

### 绝对禁止
- 禁止在渲染进程直接 `require('electron')` → 必须通过 preload + contextBridge
- 禁止在渲染进程直接 `fetch` 服务端 → 必须通过主进程 IPC 代理
- 禁止客户端直接操作服务端数据库 → 必须通过 REST API
- 禁止客户端设置 node-cron 定时任务 → 服务端统一调度
- 禁止硬编码 API URL / WebSocket URL
- 禁止使用 `any` 类型
- 禁止超过 150 行的单个 React 组件
- 禁止提醒文案使用责备/命令式语气
- 禁止 `.env` 入 Git 仓库
- 禁止动态 Tailwind 类名拼接（如 `bg-${color}`）
- 禁止直接 push main/develop（PR 合并除外）

### ADHD 友好设计原则（优先级 > 技术便利性）
1. 零摩擦启动 — 开机自启，自动连接
2. 渐进式披露 — 只展示当前该做的事
3. 即时正反馈 — 完成任务立刻有视觉+音效反馈
4. 温和但持续 — 提醒不能太烦也不能太弱
5. 减少决策 — 系统直接说"现在做这个"
6. 容错设计 — 允许跳过/推迟，不制造愧疚
7. 离线可用 — 断网时核心功能仍可用

---

## 已知坑位

| 症状 | 原因 | 正确做法 |
|------|------|---------|
| Electron 渲染进程报 `require is not defined` | 在渲染进程用了 Node API | 通过 preload + contextBridge 暴露 |
| WebSocket 断连后无限重试 | 没设指数退避 | 重连间隔：1s→2s→4s→8s→16s→30s（最大） |
| pnpm workspace 找不到包 | 没在 pnpm-workspace.yaml 注册 | 确认 packages: ['server', 'client', 'shared'] |

---

## 文档维护

- 改完代码后，如果接口变了 → 更新 AI_DEVELOPMENT_GUIDE.md
- Phase 完成后 → 写 gate log 到 docs/gate-logs/
- 临时规则纠正 → 放 CURRENT_SLICE.md DO_NOT_REPEAT
- 永久规则 → 放本文件红线

---

## 回报要求

- Kanban 任务完成后调用 `kanban_complete(summary="...")`
- 阻塞时调用 `kanban_block(reason="...")`
- 不确定方向时在飞书群 @ Project Lead

---

## 低成本执行

- 大文件分段读取（offset + limit）
- 大文档链到 docs/，不放本文件
- Research Intern (Flash) 做搜索/资料阅读，成本是 Pro 的 1/3
