# CURRENT_SLICE — TidalFlow Phase 1 发布前检查阶段

> 当前阶段: **Phase 1 Pre-Release Check** — 最后验证和文档完善。
> 目标分支: `develop` → `main` (v1.0.0)

## 已完成

- [x] Electron 窗口 + 托盘图标 (main/renderer/preload)
- [x] React UI: 任务面板 + 添加/完成/删除
- [x] Node.js 后端: REST API + WebSocket + SQLite
- [x] electron-builder NSIS 打包配置 (fix: icon, CSP, productName)
- [x] CI: GitHub Actions release pipeline (build → E2E smoke → NSIS)
- [x] L1 单元测试: apiClient 22 条用例全通过
- [x] L1 单元测试: 基础 14/14 通过
- [x] CI fix: CSC_IDENTITY_AUTO_DISCOVERY disable signing

## 进行中 / 待完成

- [ ] 三核心文档修复 (AGENTS.md / CURRENT_SLICE.md / Handoff.md)
- [ ] docs/spec/INDEX.md 路由表
- [ ] docs/gate-logs/ 目录建立
- [ ] 发布前项目经理 10 项检查
- [ ] Tag v1.0.0 → Release

## 关键约定

- 分支从 `develop` 切出，PR 合并回 `develop`
- 提交格式: `<type>(scope): <desc>`，脚注引用 Kanban ID
- 发布: `git tag vX.Y.Z` → CI 自动构建
