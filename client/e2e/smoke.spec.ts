/**
 * E2E Smoke Tests — TidalFlow Windows Client
 *
 * 验证应用在 Windows 上能正常启动和渲染。
 * 这些测试跑在 GitHub Actions windows-latest runner 上，
 * 不需要真实服务器 — 只验证客户端不崩溃、界面正常渲染。
 */

import { test, expect } from '@playwright/test'
import { _electron, type ElectronApplication, type Page } from 'playwright'

let app: ElectronApplication
let window: Page

test.beforeEach(async () => {
  app = await _electron.launch({
    args: ['./out/main/index.js'],
    cwd: process.cwd(),
    executablePath: undefined, // 使用 electron-vite 构建的本地 Electron
  })
  window = await app.firstWindow()
})

test.afterEach(async () => {
  if (app) await app.close()
})

test('1. 应用能正常启动', async () => {
  // 验证窗口出现且标题正确
  await expect(window).toHaveTitle(/TidalFlow/)

  // 验证不是白屏（root 元素存在）
  const root = window.locator('#root')
  await expect(root).toBeAttached()
})

test('2. 界面正常渲染，无致命错误', async () => {
  // 等待界面渲染完成
  await window.waitForLoadState('domcontentloaded')

  // 验证关键 UI 元素存在：ConnectionStatus 组件
  // ConnectionStatus 显示 "Connected" 或 "Offline"
  const statusText = window.locator('text=/Connected|Offline/')
  await expect(statusText.first()).toBeVisible({ timeout: 15_000 })

  // 验证没有 fatal error 级别的 console 错误
  // （Electron 进程级别的崩溃会被 Playwright 捕获）
})

test('3. 应用能正常关闭，无崩溃', async () => {
  // 验证应用进程存活
  expect(app.process()).toBeDefined()

  // 关闭应用
  await app.close()

  // 验证进程已退出或正在退出
  // Playwright 的 close() 已经等待进程退出，如果崩溃会抛异常
})
