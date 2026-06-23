/**
 * E2E User Journey Tests - TidalFlow Windows Client
 *
 * These tests launch the packaged/dev Electron app and exercise it through
 * the renderer UI. A per-test mock API/WebSocket backend keeps CI deterministic
 * without requiring the real TidalFlow server to be running.
 */

import { expect, test } from '@playwright/test'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { _electron, type ElectronApplication, type Locator, type Page } from 'playwright'
import { WebSocketServer, type WebSocket } from 'ws'

import type { CreateTaskInput, Task, UpdateTaskInput, WsServerEvent } from '@tidalflow/shared'

const APP_READY_TIMEOUT_MS = 15_000
const API_DATE = '2026-06-23'
const API_KEY = 'tidalflow-e2e'

let app: ElectronApplication | undefined
let page: Page | undefined
let mockApi: MockTaskApiServer | undefined
let mockWs: MockWebSocketServer | undefined

class MockTaskApiServer {
  private server: Server | undefined
  private serverUrl: string | undefined
  private tasks: Task[] = []
  private nextTaskId = 1

  get url(): string {
    if (!this.serverUrl) {
      throw new Error('Mock API server has not started')
    }

    return this.serverUrl
  }

  async start(): Promise<void> {
    this.server = createServer((request, response) => {
      void this.handleRequest(request, response)
    })

    await new Promise<void>((resolve) => {
      this.server?.listen(0, '127.0.0.1', () => {
        const address = this.server?.address() as AddressInfo
        this.serverUrl = `http://127.0.0.1:${address.port}`
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return
    }

    const server = this.server
    this.server = undefined
    this.serverUrl = undefined
    server.closeAllConnections?.()

    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  }

  buildTask(overrides: Partial<Task> & Pick<Task, 'title'>): Task {
    const now = new Date().toISOString()

    return {
      id: `e2e-${this.nextTaskId++}`,
      title: overrides.title,
      description: '',
      category: 'programming',
      status: 'pending',
      priority: 0,
      scheduledDate: API_DATE,
      dueDate: null,
      estimatedMinutes: 25,
      parentTaskId: null,
      phaseOrder: null,
      source: 'manual',
      isRecurring: false,
      recurringRule: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      ...overrides
    }
  }

  markTaskInProgress(title: string): void {
    this.tasks = this.tasks.map((task) =>
      task.title === title
        ? {
            ...task,
            status: 'in_progress',
            updatedAt: new Date().toISOString()
          }
        : task
    )
  }

  private async handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
    response.setHeader('Connection', 'close')

    if (!request.url) {
      this.sendJson(response, 404, { success: false, error: 'Missing URL' })
      return
    }

    const url = new URL(request.url, this.url)
    const path = url.pathname.replace(/^\/api\/v1/, '')
    const method = request.method ?? 'GET'

    if (method === 'GET' && path === '/tasks/today') {
      this.sendJson(response, 200, { success: true, data: this.tasks })
      return
    }

    if (method === 'POST' && path === '/tasks') {
      const input = await readJsonBody<CreateTaskInput>(request)
      const task = this.buildTask({
        title: input.title,
        description: input.description ?? '',
        category: input.category ?? 'programming',
        priority: input.priority ?? 0,
        scheduledDate: input.scheduledDate ?? API_DATE,
        estimatedMinutes: input.estimatedMinutes ?? null
      })

      this.tasks = [task, ...this.tasks]
      this.sendJson(response, 200, { success: true, data: task })
      return
    }

    const taskPathMatch = path.match(/^\/tasks\/([^/]+)(?:\/([^/]+))?$/)

    if (taskPathMatch) {
      const [, taskId, action] = taskPathMatch

      if (method === 'PATCH' && !action) {
        const input = await readJsonBody<Partial<UpdateTaskInput>>(request)
        const task = this.updateTask(taskId, {
          ...input,
          updatedAt: new Date().toISOString()
        })

        this.sendTaskResponse(response, task, 'Task not found')
        return
      }

      if (method === 'POST' && action === 'complete') {
        const completedAt = new Date().toISOString()
        const task = this.updateTask(taskId, {
          status: 'completed',
          completedAt,
          updatedAt: completedAt
        })

        this.sendTaskResponse(response, task, 'Task not found')
        return
      }

      if (method === 'POST' && action === 'postpone') {
        const task = this.updateTask(taskId, {
          status: 'postponed',
          updatedAt: new Date().toISOString()
        })

        this.sendTaskResponse(response, task, 'Task not found')
        return
      }

      if (method === 'DELETE' && !action) {
        this.tasks = this.tasks.filter((task) => task.id !== taskId)
        this.sendJson(response, 200, { success: true })
        return
      }
    }

    this.sendJson(response, 404, { success: false, error: `Unhandled ${method} ${path}` })
  }

  private updateTask(taskId: string, patch: Partial<Task | UpdateTaskInput>): Task | undefined {
    let updatedTask: Task | undefined

    this.tasks = this.tasks.map((task) => {
      if (task.id !== taskId) {
        return task
      }

      updatedTask = {
        ...task,
        ...patch
      } as Task

      return updatedTask
    })

    return updatedTask
  }

  private sendTaskResponse(response: ServerResponse, task: Task | undefined, fallbackError: string): void {
    if (!task) {
      this.sendJson(response, 404, { success: false, error: fallbackError })
      return
    }

    this.sendJson(response, 200, { success: true, data: task })
  }

  private sendJson(response: ServerResponse, statusCode: number, payload: unknown): void {
    response.writeHead(statusCode, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(payload))
  }
}

class MockWebSocketServer {
  private server: WebSocketServer | undefined
  private serverUrl: string | undefined
  private sockets = new Set<WebSocket>()
  private connectionResolvers: Array<() => void> = []

  get url(): string {
    if (!this.serverUrl) {
      throw new Error('Mock WebSocket server has not started')
    }

    return this.serverUrl
  }

  async start(): Promise<void> {
    this.server = new WebSocketServer({ host: '127.0.0.1', port: 0 })

    this.server.on('connection', (socket) => {
      this.sockets.add(socket)
      socket.on('close', () => this.sockets.delete(socket))
      socket.on('error', () => undefined)

      for (const resolve of this.connectionResolvers.splice(0)) {
        resolve()
      }
    })

    await new Promise<void>((resolve) => {
      this.server?.on('listening', () => {
        const address = this.server?.address() as AddressInfo
        this.serverUrl = `ws://127.0.0.1:${address.port}`
        resolve()
      })
    })
  }

  async stop(): Promise<void> {
    if (!this.server) {
      return
    }

    for (const socket of this.sockets) {
      socket.terminate()
    }

    const server = this.server
    this.server = undefined
    this.serverUrl = undefined
    this.sockets.clear()

    await new Promise<void>((resolve) => {
      server.close(() => resolve())
    })
  }

  async waitForConnection(timeoutMs = 10_000): Promise<void> {
    if (this.sockets.size > 0) {
      return
    }

    await new Promise<void>((resolve, reject) => {
      let timer: ReturnType<typeof setTimeout> | undefined
      const connectionResolve = (): void => {
        if (timer) {
          clearTimeout(timer)
        }

        resolve()
      }

      timer = setTimeout(() => {
        this.connectionResolvers = this.connectionResolvers.filter((currentResolve) => currentResolve !== connectionResolve)
        reject(new Error('Timed out waiting for WebSocket connection'))
      }, timeoutMs)

      this.connectionResolvers.push(connectionResolve)
    })
  }

  broadcast(event: WsServerEvent): void {
    const payload = JSON.stringify(event)

    for (const socket of this.sockets) {
      if (socket.readyState === 1) {
        socket.send(payload)
      }
    }
  }
}

async function readJsonBody<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = []

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk))
  }

  const body = Buffer.concat(chunks).toString('utf8')
  return (body ? JSON.parse(body) : {}) as T
}

function currentPage(): Page {
  if (!page) {
    throw new Error('Electron page is not available')
  }

  return page
}

function currentApp(): ElectronApplication {
  if (!app) {
    throw new Error('Electron app is not available')
  }

  return app
}

function currentApi(): MockTaskApiServer {
  if (!mockApi) {
    throw new Error('Mock API server is not available')
  }

  return mockApi
}

function currentWs(): MockWebSocketServer {
  if (!mockWs) {
    throw new Error('Mock WebSocket server is not available')
  }

  return mockWs
}

function taskCards(title: string) {
  return currentPage().locator('article').filter({ has: currentPage().getByRole('heading', { name: title, exact: true }) })
}

function taskCard(title: string) {
  return taskCards(title).first()
}

async function openCreateTaskForm(): Promise<Locator> {
  const appPage = currentPage()

  await appPage.getByRole('button', { name: 'Create task' }).click()

  const dialog = appPage.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('heading', { name: 'New Task' })).toBeVisible()

  return dialog
}

async function createTaskFromUi(options: {
  title: string
  description?: string
  category?: Task['category']
  priority?: 0 | 1 | 2
  scheduledDate?: string
  estimatedMinutes?: number
}): Promise<void> {
  const dialog = await openCreateTaskForm()

  await dialog.locator('#task-title').fill(options.title)
  await dialog.locator('#task-description').fill(options.description ?? '')
  await dialog.locator('#task-category').selectOption(options.category ?? 'programming')
  await dialog.locator('#task-scheduled-date').fill(options.scheduledDate ?? API_DATE)
  await dialog.locator('#task-estimated-minutes').fill(String(options.estimatedMinutes ?? 25))
  await dialog.locator(`input[name="priority"][value="${options.priority ?? 0}"]`).check({ force: true })
  await dialog.getByRole('button', { name: 'Save' }).click()

  await expect(dialog).toBeHidden({ timeout: APP_READY_TIMEOUT_MS })
  await expect(taskCard(options.title)).toBeVisible({ timeout: APP_READY_TIMEOUT_MS })
}

async function deleteTaskFromUi(title: string): Promise<void> {
  const appPage = currentPage()
  const dialogPromise = appPage.waitForEvent('dialog')

  await Promise.all([
    dialogPromise.then(async (dialog) => {
      expect(dialog.message()).toContain(title)
      await dialog.accept()
    }),
    taskCard(title).getByRole('button', { name: 'Delete' }).dispatchEvent('click', { bubbles: true, cancelable: true })
  ])

  await expect(taskCards(title)).toHaveCount(0, { timeout: APP_READY_TIMEOUT_MS })
}

test.beforeEach(async () => {
  mockApi = new MockTaskApiServer()
  await mockApi.start()

  mockWs = new MockWebSocketServer()
  await mockWs.start()

  app = await _electron.launch({
    args: process.env.TIDALFLOW_EXE ? undefined : ['./out/main/index.js'],
    cwd: process.cwd(),
    executablePath: process.env.TIDALFLOW_EXE || undefined,
    env: {
      ...process.env,
      API_KEY,
      TIDALFLOW_API_KEY: API_KEY,
      TIDALFLOW_SERVER_URL: mockApi.url,
      TIDALFLOW_WS_URL: mockWs.url
    }
  })

  page = await app.firstWindow()

  await expect(page).toHaveTitle(/TidalFlow/)
  await expect(page.locator('#root')).toBeAttached({ timeout: APP_READY_TIMEOUT_MS })
  await expect(page.getByText("Today's Tasks")).toBeVisible({ timeout: APP_READY_TIMEOUT_MS })
})

test.afterEach(async () => {
  const runningApp = app
  app = undefined
  page = undefined

  try {
    if (runningApp) {
      await runningApp.close()
    }
  } finally {
    await mockWs?.stop()
    mockWs = undefined

    await mockApi?.stop()
    mockApi = undefined
  }
})

test.describe('TidalFlow user journeys', () => {
  test('1. 应用启动 (App Startup)', async () => {
    const appPage = currentPage()

    await expect(appPage).toHaveTitle(/TidalFlow/)
    await expect(appPage.locator('#root')).toBeAttached()
    await expect(appPage.getByText("Today's Tasks")).toBeVisible()
    await expect(appPage.getByRole('button', { name: 'Create task' })).toBeVisible()
    await expect(appPage.getByRole('button', { name: 'Refresh tasks' })).toBeVisible()
  })

  test('2. 创建任务 (Create Task)', async () => {
    await createTaskFromUi({
      title: 'Write daily focus plan',
      description: 'Pick one programming task and one health task.',
      category: 'health',
      priority: 2,
      scheduledDate: API_DATE,
      estimatedMinutes: 45
    })

    const card = taskCard('Write daily focus plan')
    await expect(card.getByRole('heading', { name: 'Write daily focus plan' })).toBeVisible()
    await expect(card.getByText('Pick one programming task and one health task.')).toBeVisible()
    await expect(card.getByText('Urgent')).toBeVisible()
    await expect(card.getByText('45m')).toBeVisible()
  })

  test('3. 编辑任务 (Edit Task)', async () => {
    await createTaskFromUi({ title: 'Draft task before edit', priority: 1 })

    await taskCard('Draft task before edit').getByRole('button', { name: 'Edit Draft task before edit' }).click()

    const dialog = currentPage().getByRole('dialog')
    await expect(dialog.getByRole('heading', { name: 'Edit Task' })).toBeVisible()
    await dialog.locator('#task-title').fill('Draft task after edit')
    await dialog.locator('#task-description').fill('Updated from the edit dialog.')
    await dialog.getByRole('button', { name: 'Save' }).click()

    await expect(dialog).toBeHidden({ timeout: APP_READY_TIMEOUT_MS })
    await expect(taskCards('Draft task before edit')).toHaveCount(0)
    await expect(taskCard('Draft task after edit')).toBeVisible()
    await expect(taskCard('Draft task after edit').getByText('Updated from the edit dialog.')).toBeVisible()
  })

  test('4. 完成任务 (Complete Task)', async () => {
    await createTaskFromUi({ title: 'Complete the visible task' })

    await taskCard('Complete the visible task').getByRole('button', { name: 'Complete task' }).click()

    const completedCard = taskCard('Complete the visible task')
    await expect(completedCard.getByText('Completed')).toBeVisible({ timeout: APP_READY_TIMEOUT_MS })
    await expect(completedCard.getByRole('button', { name: 'Completed' })).toHaveText('✓')
  })

  test('5. 推迟任务 (Postpone Task)', async () => {
    await createTaskFromUi({ title: 'Postpone the afternoon task' })

    await taskCard('Postpone the afternoon task')
      .getByRole('button', { name: 'Postpone' })
      .dispatchEvent('click', { bubbles: true, cancelable: true })

    await expect(taskCard('Postpone the afternoon task').getByText('Postponed')).toBeVisible({ timeout: APP_READY_TIMEOUT_MS })
  })

  test('6. 删除任务 (Delete Task)', async () => {
    await createTaskFromUi({ title: 'Delete this throwaway task' })

    await deleteTaskFromUi('Delete this throwaway task')

    await expect(currentPage().getByText('Delete this throwaway task')).toHaveCount(0)
  })

  test('7. 看板视图 (Kanban View / Task Sorting)', async () => {
    await createTaskFromUi({ title: 'Urgent later task', priority: 2, scheduledDate: '2026-06-25' })
    await createTaskFromUi({ title: 'Urgent earlier task', priority: 2, scheduledDate: API_DATE })
    await createTaskFromUi({ title: 'Important middle task', priority: 1, scheduledDate: '2026-06-24' })
    await createTaskFromUi({ title: 'In progress normal task', priority: 0, scheduledDate: '2026-06-26' })

    currentApi().markTaskInProgress('In progress normal task')
    await currentPage().getByRole('button', { name: 'Refresh tasks' }).click()
    await expect(taskCard('In progress normal task').getByText('In progress')).toBeVisible({ timeout: APP_READY_TIMEOUT_MS })

    await expect(currentPage().locator('article h3')).toHaveText([
      'In progress normal task',
      'Urgent earlier task',
      'Urgent later task',
      'Important middle task'
    ])
  })

  test('8. 连接状态 (Connection Status)', async () => {
    const status = currentPage().getByText(/Connected|Offline/).first()

    await expect(status).toBeVisible({ timeout: APP_READY_TIMEOUT_MS })
    await expect(status).toHaveText(/Connected|Offline/)
  })

  test('9. 系统托盘 (System Tray)', async () => {
    const electronProcess = currentApp().process()

    expect(electronProcess?.pid).toBeGreaterThan(0)
    await expect(currentPage().getByText("Today's Tasks")).toBeVisible()
    await currentPage().getByRole('button', { name: 'Refresh tasks' }).click()
    await expect(currentPage().getByText(/\d+ remaining/)).toBeVisible()
  })

  test('10. 设置面板 (Settings Panel / Tray Menu)', async () => {
    await expect(currentPage().getByText("Today's Tasks")).toBeVisible()

    const dialog = await openCreateTaskForm()
    await dialog.getByRole('button', { name: 'Close task form' }).click()

    await expect(dialog).toBeHidden()
    await expect(currentPage().getByRole('button', { name: 'Create task' })).toBeVisible()
  })

  test('11. 提醒弹窗 (Reminder Popup)', async () => {
    await currentWs().waitForConnection()

    currentWs().broadcast({
      type: 'reminder:trigger',
      payload: {
        reminderType: 'water_stretch',
        message: 'Stand up and stretch for one minute.',
        logId: 'journey-reminder-1'
      }
    })

    const toast = currentPage().locator('div[role="status"][aria-live="polite"]').filter({
      hasText: 'Stand up and stretch for one minute.'
    })

    await expect(toast).toBeVisible({ timeout: APP_READY_TIMEOUT_MS })
    await expect(toast.getByRole('button', { name: 'Dismiss reminder' })).toBeVisible()
    await toast.getByRole('button', { name: 'Dismiss reminder' }).click()
    await expect(toast).toBeHidden({ timeout: APP_READY_TIMEOUT_MS })
  })

  test('12. 空状态 (Empty State)', async () => {
    await createTaskFromUi({ title: 'Temporary empty-state task one' })
    await createTaskFromUi({ title: 'Temporary empty-state task two' })

    await deleteTaskFromUi('Temporary empty-state task one')
    await deleteTaskFromUi('Temporary empty-state task two')

    await expect(currentPage().getByText('No tasks yet')).toBeVisible({ timeout: APP_READY_TIMEOUT_MS })
    await expect(currentPage().getByText('0 remaining')).toBeVisible()
  })

  test('13. 应用关闭 (App Close)', async () => {
    const runningApp = currentApp()
    const electronProcess = runningApp.process()

    expect(electronProcess?.pid).toBeGreaterThan(0)
    await expect(currentPage().locator('#root')).toBeAttached()

    await runningApp.close()
    app = undefined
    page = undefined
  })
})
