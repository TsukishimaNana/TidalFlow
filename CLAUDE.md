# TidalFlow — 项目上下文

> Linux 开发 → Windows 发布 (Electron + GitHub Actions CI)

## 技术栈

Electron 28 | React 18 | TypeScript 5 | TailwindCSS 3 | better-sqlite3 | WebSocket | pnpm 8 monorepo | Vitest 4 | electron-builder 24 → NSIS

## 目录结构

```
client/          # Electron 桌面端 (main/renderer/preload)
server/          # Node.js 后端 (API + WebSocket + DB)
shared/          # 共享类型 (import as @tidalflow/shared)
.github/workflows/release.yml   # CI: build → E2E smoke → NSIS → release
docs/project-rules/   # spec-kit constitution/plan/tasks
```

## 关键约定

- 共享类型: `from '@tidalflow/shared'` — 不用裸 `'shared'` 或深层相对路径
- 分支: 从 `develop` 切出，PR 回到 `develop`（非 `main`）
- 提交: `<type>(scope): <desc>` 格式，脚注引用 Kanban 任务 ID
- 禁止 `git push --force` 到共享分支

## 常用命令

```bash
pnpm --filter client dev          # 开发
pnpm --filter client build        # 构建
cd client && pnpm run test        # 单元测试 (Vitest)
cd client && pnpm run test:e2e    # E2E 测试 (Playwright, 需先 build)
```

## 发布流程

```
push tag vX.Y.Z → CI 自动构建 → E2E 烟雾测试 → NSIS 打包 → GitHub Release
```

发布前 Project Lead 加载 `release-preflight` skill 执行 10 项检查。
