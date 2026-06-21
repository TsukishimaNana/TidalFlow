# Current Slice

用途：每轮可覆盖的最小接手面（~2KB）。
新会话只读本文件和 AGENTS.md；历史细节不足时读 Handoff 或 docs/gate-logs/。

---

## CURRENT_PHASE

**Phase 0 | IN PROGRESS** — 基础设施 & 项目规范搭建

## CURRENT_ACTION

编写三核心文档（AGENTS.md / CURRENT_SLICE.md / Handoff.md），初始化 Git 仓库，打包 Git 规范 Skill。

## NEXT_TASK

1. T0.0: Git 仓库初始化 + gh 认证 → engineer 已认领
2. T0.1: 三核心文档编写 → project-lead 执行中
3. T0.2: Git 规范 Skill 打包（依赖 T0.1）
4. T0.3: spec-kit 初始化（依赖 T0.1）

## BLOCKERS

- 无

## DO_NOT_REPEAT

- Kanban create 的 title 是位置参数不是 `--title`，parent 用 task ID 而非标题文本
- 新建 board 先 `kanban boards create <slug>` 再 `--board <slug> create`
- gh CLI 安装后需要 `gh auth login` 认证

## READ_IF_*

- 开发 Phase 1: 读 AI_DEVELOPMENT_GUIDE.md（项目总纲）+ docs/specs/phase-1/spec.md
- 操作 Git: 读 docs/git-standards-for-ai-agents.md + skill tidalflow-git
- 接手新会话: 读 AGENTS.md → 本文件
