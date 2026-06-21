# Git 规范（AI Agent 指令版）

> 你是 AI agent，执行 git 操作时必须遵守以下规则。

---

## 分支规则

分支            | 命名示例                          | 源分支     | 合并目标              | 合并方式        | 合并后
---------------|----------------------------------|-----------|----------------------|---------------|-------
main           | `main`                           | —         | —                    | —             | 保留
develop        | `develop`                        | main      | release              | —             | 保留
feature        | `feature/REQ-001-user-login`     | develop   | develop              | Squash Merge  | 删除
hotfix         | `hotfix/BUG-2024058-order-fix`   | main      | main → develop       | Merge Commit  | 删除
release        | `release/v2.3.0`                 | develop   | main → develop       | Merge Commit  | 删除

规则：
- 分支名全小写+连字符，禁止无意义命名
- main 和 develop 禁止直接 push，必须走 PR
- 禁止 `git push -f`

---

## 提交消息

```
<类型>[作用域]: <简短描述>

[描述]

[脚注]
```

类型：`feat` `fix` `docs` `refactor` `test` `chore`
简短描述 ≤50 字，无句号
脚注格式：`Closes BUG-2024058` 或 `Relates to REQ-2024001`

---

## 开发流程

```
# 新功能
checkout develop → pull → checkout -b feature/xxx
rebase origin/develop（每日至少一次）
PR → develop → Squash Merge → 删分支

# hotfix
checkout main → pull → checkout -b hotfix/xxx
PR 先 → main，再 PR → develop → 打 tag → 删分支

# 发布
checkout develop → pull → checkout -b release/vX.Y.Z
只修 Bug 不增功能 → PR → main + develop → 打 tag → 删分支
```

---

## 版本号

`vX.Y.Z`：
- X = 不兼容 API 改动
- Y = 向下兼容新功能
- Z = 向下兼容 Bug 修复

只在 main 打 tag，打后禁止删除/修改。

---

## 合并方式

- feature→develop：**Squash Merge**
- hotfix→main/develop：**Merge Commit**
- release→main/develop：**Merge Commit**

---

## 冲突处理

```
rebase origin/develop
→ 手动解冲突（删 <<< >>> 标记）
→ git add <file>
→ git rebase --continue
```

---

## 翻车处理

| 问题 | 做法 |
|:---|:---|
| 提交未推送，内容错了 | `git commit --amend` |
| 已推送，内容错了 | 新增 fix 提交，不修改历史 |
| 误推敏感信息 | 删密钥 → filter-branch 清除历史 → 通知换密钥 |
| 误删分支 | `git checkout -b 分支名 origin/分支名` |
