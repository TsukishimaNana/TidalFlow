# Handoff — TidalFlow 项目交接文档

> 最后更新: 2026-06-23
> 当前分支: `develop` (commit 0297581)

## 当前路线

```
Phase 1 开发完成 → 发布前检查 → Tag v1.0.0 → Release
```

## 最近变更

| 日期 | 变更 | 提交 |
|------|------|------|
| 2026-06-23 | CI: 禁用代码签名 (CSC_IDENTITY_AUTO_DISCOVERY) | 0297581 |
| 2026-06-23 | electron-builder 打包配置修复 (icon/NSIS/CSP/productName) | 41bb738 |
| 2026-06-23 | bugfix: apiClient 环境变量处理, Vitest stubEnv 兼容 | f14ea5f |
| 2026-06-23 | T8: apiClient 测试 22 条覆盖 (PATCH/query/health/error 等) | (PR) |
| 2026-06-23 | T5: L1 单元测试 14/14 通过 | (PR) |

## 关键决策

1. **Windows-only 发布**: Linux 开发 → Windows NSIS 打包 (CI `windows-latest`)
2. **代码签名禁用**: 开发/测试阶段不要求 EV 证书; 正式发布前需采购
3. **electron-builder productName**: 对齐 `TidalFlow` (非 `client`)
4. **分支策略**: `feature/*` → PR → Squash Merge → `develop` → Tag → `main`
5. **Vite 构建主流**: ESBuild 编译 + Vitest 测试

## 待办

- [ ] 项目经理加载 `release-preflight` skill 执行 10 项发布前检查
- [ ] 采购 EV 代码签名证书（正式发布用）
- [ ] 测试 NSIS 安装器在真实 Windows VM 上的行为
