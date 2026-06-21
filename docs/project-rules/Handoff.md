# Handoff

> 长期接手协议。当前具体下一步在 CURRENT_SLICE.md，本文件不追踪每轮任务。

## 项目路线

ADHD Time Manager (TidalFlow) 是一款为 ADHD 用户设计的个人任务管理与提醒工具。Phase 1 搭建服务端 (Express + SQLite + WebSocket + 飞书推送) 和桌面客户端 (Electron + React + Tailwind)，形成提醒闭环。Phase 2 加入活动感知（窗口/空闲检测），Phase 3 接入 AI 任务拆解和飞书双向通信，Phase 4 持续体验打磨。

## 接手原则

- 先读 CURRENT_SLICE.md + AGENTS.md
- 按需读 docs/ 下对应文件
- 不确定 Phase 目标时读 AI_DEVELOPMENT_GUIDE.md
- 不确定规范时读 docs/project-rules/AGENTS.md 红线

## 技术栈

| 层 | 技术 |
|----|------|
| 服务端 | Node.js 18+ / Express / better-sqlite3 / ws / node-cron |
| 客户端 | Electron 28 / React 18 / TypeScript 5 / Tailwind 3 |
| 包管理 | pnpm monorepo workspace |
| AI | DeepSeek (openai 兼容 SDK) |
| 部署 | GitHub Actions + electron-builder |
| 通知 | 飞书 Webhook |

## 团队

| 角色 | Profile | 职责 |
|------|---------|------|
| Product Owner | 用户 | 需求 + 终验 |
| Project Lead | project-lead | 任务拆解、看板管理、审查 |
| Engineer | engineer | 编码实现 |
| Intern | research-intern | 搜索、文档阅读、资料整理 |

## 关键链路

```
用户笔记本 (Win 11)           云服务器 (24/7)
┌──────────────────┐        ┌────────────────┐
│ Electron Client  │←─REST─│ Express Server  │
│  + 托盘 + 便签UI  │──WS──→│  + SQLite       │
│  + 桌面通知       │        │  + node-cron    │
│  + 本地缓存       │        │  + 飞书推送      │
└──────────────────┘        └────────────────┘
```
