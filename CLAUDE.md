# TidalFlow — Project Context for AI Agents

> Linux development → Windows target (Electron + GitHub Actions CI)

## Tech Stack

| Layer | Tech |
|-------|------|
| Desktop shell | Electron 28 |
| Build tool | electron-vite 5 |
| Frontend | React 18 + TypeScript 5 + TailwindCSS 3 |
| Backend | Node.js + TypeScript |
| Database | better-sqlite3 (embedded) |
| Real-time | WebSocket (ws) |
| Package manager | pnpm 8 (monorepo workspace) |
| Testing | Vitest 4 + Playwright 1.52 (E2E) |
| CI/CD | GitHub Actions (windows-latest + ubuntu-latest) |
| Installer | electron-builder 24 → NSIS (.exe) |
| Target OS | Windows 11 x64 |

## Architecture

```
TidalFlow/
├── client/          # Electron app (main + renderer + preload)
│   ├── src/main/         # Electron main process (window, tray, IPC)
│   ├── src/renderer/     # React UI (components, hooks, context)
│   ├── src/preload/      # contextBridge preload
│   ├── e2e/              # Playwright E2E smoke tests
│   └── electron-builder.yml
├── server/          # Node.js backend (API, WebSocket, DB)
├── shared/          # Shared TypeScript types (imported as @tidalflow/shared)
├── .github/workflows/release.yml   # CI: build → E2E → package → release
└── docs/
    └── project-rules/    # Spec-kit constitution, plan, tasks
```

## Cross-Platform: Linux Dev → Windows CI

Code that works on Linux CAN fail on Windows CI. Key differences:

- **Shell:** CI `windows-latest` uses PowerShell by default → always add `shell: bash`
- **Env vars:** Empty string `''` is a path on Windows → never set `WIN_CSC_LINK=''`
- **Lockfile:** Linux-generated `pnpm-lock.yaml` has platform-specific hashes
- **Case:** `process.env` is case-insensitive on Windows

## Anti-Patterns (DO NOT)

| ❌ Never | ✅ Always |
|----------|----------|
| `from 'shared'` | `from '@tidalflow/shared'` |
| `from '../../../../shared/...'` | `from '@tidalflow/shared'` |
| `import { Foo }` when Foo uses `export default` | `import Foo` (no braces) |
| `pnpm test` in CI scripts | `pnpm run test` or `cd client && pnpm run test` |
| `WIN_CSC_LINK: ''` in CI env | Only `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` |
| `--frozen-lockfile` after changing package.json | Run `pnpm install --no-frozen-lockfile` first |
| Referencing icons in electron-builder.yml that don't exist | Remove the YAML keys or add the files |
| Branch name `main` in workflow files | Use `master` (this repo's default branch) |
| `kanban_complete` before `git push` | Push first — scratch workspace is GC'd on complete |

## Release Checklist (9 items)

Before pushing a release tag, verify:
1. `server/src/` directory exists
2. No `main` references in CI workflows (repo uses `master`)
3. `pnpm install --frozen-lockfile` passes
4. No bare `from 'shared'` imports
5. `export default` / `import` pairs match
6. `client/package.json` has `"main": "./out/main/index.js"` and `"test": "vitest run"`
7. `electron-builder.yml` has no references to missing files
8. CI workflow: `shell: bash` on Windows steps, no `WIN_CSC_LINK`
9. `pnpm-lock.yaml` is current if any `package.json` changed

## Common Commands

```bash
# Dev
cd client && pnpm dev

# Build
pnpm --filter client build

# Tests
cd client && pnpm run test           # Vitest unit tests
cd client && pnpm run test:e2e       # Playwright E2E (needs built app)

# Release
git checkout develop
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
# → GitHub Actions runs build → E2E smoke → NSIS package → release
```
