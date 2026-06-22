import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, act } from '@testing-library/react'
import { AppProvider } from '../src/renderer/src/context/AppContext'
import { useTasks } from '../src/renderer/src/hooks/useTasks'

const sampleTask = {
  id: 't1',
  title: 'Test task',
  description: 'desc',
  category: 'programming' as const,
  status: 'pending' as const,
  priority: 1,
  scheduledDate: null,
  dueDate: null,
  estimatedMinutes: 30,
  parentTaskId: null,
  phaseOrder: null,
  source: 'manual' as const,
  isRecurring: false,
  recurringRule: null,
  createdAt: '2026-06-22T08:00:00.000Z',
  updatedAt: '2026-06-22T08:00:00.000Z',
  completedAt: null,
}

function TasksConsumer({ onRender }: { onRender?: (hook: ReturnType<typeof useTasks>) => void }) {
  const tasks = useTasks()
  onRender?.(tasks)
  return <div data-testid="tasks-hook">{tasks.tasks.length} tasks</div>
}

describe('useTasks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.tidalflow.getTodayTasks.mockResolvedValue({ success: true, data: [sampleTask] })
    window.tidalflow.connectWs.mockResolvedValue(undefined)
    window.tidalflow.getCachedTasks.mockResolvedValue([])
    window.tidalflow.saveCachedTasks.mockResolvedValue(undefined)
    window.tidalflow.onWsEvent.mockReturnValue(() => {})
  })

  it('returns tasks from AppContext after loading', async () => {
    let hook: any
    render(
      <AppProvider>
        <TasksConsumer onRender={(h) => { hook = h }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(hook.isLoading).toBe(false)
    })

    expect(hook.tasks).toHaveLength(1)
    expect(hook.tasks[0].title).toBe('Test task')
    expect(hook.error).toBeNull()
  })

  it('completeTask applies optimistic update then calls API', async () => {
    window.tidalflow.completeTask.mockResolvedValue({
      success: true,
      data: { ...sampleTask, status: 'completed', completedAt: '2026-06-22T09:00:00.000Z' },
    })

    let hook: any
    render(
      <AppProvider>
        <TasksConsumer onRender={(h) => { hook = h }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(hook.isLoading).toBe(false)
    })

    await act(async () => {
      await hook.completeTask('t1')
    })

    expect(hook.tasks[0].status).toBe('completed')
    expect(window.tidalflow.completeTask).toHaveBeenCalledWith('t1')
  })

  it('completeTask rolls back optimistic update on failure', async () => {
    window.tidalflow.completeTask.mockRejectedValue(new Error('Server down'))

    let hook: any
    render(
      <AppProvider>
        <TasksConsumer onRender={(h) => { hook = h }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(hook.isLoading).toBe(false)
    })

    await act(async () => {
      try {
        await hook.completeTask('t1')
      } catch {
        // expected
      }
    })

    // Should have rolled back to pending
    expect(hook.tasks[0].status).toBe('pending')
  })

  it('postponeTask applies optimistic update then calls API', async () => {
    window.tidalflow.postponeTask.mockResolvedValue({
      success: true,
      data: { ...sampleTask, status: 'postponed' },
    })

    let hook: any
    render(
      <AppProvider>
        <TasksConsumer onRender={(h) => { hook = h }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(hook.isLoading).toBe(false)
    })

    await act(async () => {
      await hook.postponeTask('t1')
    })

    expect(hook.tasks[0].status).toBe('postponed')
    expect(window.tidalflow.postponeTask).toHaveBeenCalledWith('t1')
  })

  it('postponeTask rolls back optimistic update on failure', async () => {
    window.tidalflow.postponeTask.mockRejectedValue(new Error('Network error'))

    let hook: any
    render(
      <AppProvider>
        <TasksConsumer onRender={(h) => { hook = h }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(hook.isLoading).toBe(false)
    })

    await act(async () => {
      try {
        await hook.postponeTask('t1')
      } catch {
        // expected
      }
    })

    expect(hook.tasks[0].status).toBe('pending')
  })

  it('deleteTask removes task and calls API', async () => {
    window.tidalflow.deleteTask.mockResolvedValue({ success: true })

    let hook: any
    render(
      <AppProvider>
        <TasksConsumer onRender={(h) => { hook = h }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(hook.isLoading).toBe(false)
    })
    expect(hook.tasks).toHaveLength(1)

    await act(async () => {
      await hook.deleteTask('t1')
    })

    expect(hook.tasks).toHaveLength(0)
    expect(window.tidalflow.deleteTask).toHaveBeenCalledWith('t1')
  })
})
