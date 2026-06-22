import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AppProvider, useAppContext } from '../src/renderer/src/context/AppContext'
import { act } from 'react'

// Consumer component that exposes context for testing
function TestConsumer({ onRender }: { onRender?: (ctx: ReturnType<typeof useAppContext>) => void }) {
  const ctx = useAppContext()
  onRender?.(ctx)
  return <div data-testid="consumer">{ctx.tasks.length} tasks, {ctx.isLoading ? 'loading' : 'ready'}{ctx.error ? `, error: ${ctx.error}` : ''}</div>
}

const sampleTask = {
  id: 't1',
  title: 'Write tests',
  description: '',
  category: 'programming' as const,
  status: 'pending' as const,
  priority: 1,
  scheduledDate: null,
  dueDate: null,
  estimatedMinutes: null,
  parentTaskId: null,
  phaseOrder: null,
  source: 'manual' as const,
  isRecurring: false,
  recurringRule: null,
  createdAt: '2026-06-22T08:00:00.000Z',
  updatedAt: '2026-06-22T08:00:00.000Z',
  completedAt: null,
}

describe('AppProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.tidalflow.getTodayTasks.mockResolvedValue({ success: true, data: [] })
    window.tidalflow.connectWs.mockResolvedValue(undefined)
    window.tidalflow.getCachedTasks.mockResolvedValue([])
    window.tidalflow.saveCachedTasks.mockResolvedValue(undefined)
    window.tidalflow.onWsEvent.mockReturnValue(() => {})
  })

  it('initializes with loading state and calls refreshTasks + connect', async () => {
    let ctx: any
    render(
      <AppProvider>
        <TestConsumer onRender={(c) => { ctx = c }} />
      </AppProvider>
    )

    expect(ctx.isLoading).toBe(true)
    expect(ctx.tasks).toEqual([])
    expect(ctx.isConnected).toBe(false)

    await waitFor(() => {
      expect(ctx.isLoading).toBe(false)
    })

    expect(window.tidalflow.getTodayTasks).toHaveBeenCalled()
    expect(window.tidalflow.connectWs).toHaveBeenCalled()
  })

  it('shows offline error and falls back to cached tasks when fetch fails', async () => {
    window.tidalflow.getTodayTasks.mockRejectedValue(new Error('Network down'))
    window.tidalflow.getCachedTasks.mockResolvedValue([sampleTask])

    let ctx: any
    render(
      <AppProvider>
        <TestConsumer onRender={(c) => { ctx = c }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(ctx.isLoading).toBe(false)
    })

    expect(ctx.error).toContain('Offline')
    expect(ctx.tasks).toHaveLength(1)
  })

  it('shows generic error message when fetch fails and no cached tasks', async () => {
    window.tidalflow.getTodayTasks.mockRejectedValue(new Error('ERR_CONNECTION_TIMEOUT'))
    window.tidalflow.getCachedTasks.mockResolvedValue([])

    let ctx: any
    render(
      <AppProvider>
        <TestConsumer onRender={(c) => { ctx = c }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(ctx.isLoading).toBe(false)
    })

    expect(ctx.error).toBe('ERR_CONNECTION_TIMEOUT')
  })

  it('handles tasks:sync WebSocket event', async () => {
    let wsCallback: (event: any) => void = () => {}
    window.tidalflow.onWsEvent.mockImplementation((cb: any) => {
      wsCallback = cb
      return () => {}
    })

    let ctx: any
    render(
      <AppProvider>
        <TestConsumer onRender={(c) => { ctx = c }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(ctx.isLoading).toBe(false)
    })

    await act(async () => {
      wsCallback({ type: 'tasks:sync', payload: [sampleTask, { ...sampleTask, id: 't2', title: 'Task 2' }] })
    })

    expect(ctx.tasks).toHaveLength(2)
    expect(ctx.isConnected).toBe(true)
  })

  it('handles task:created WebSocket event by upserting', async () => {
    let wsCallback: (event: any) => void = () => {}
    window.tidalflow.onWsEvent.mockImplementation((cb: any) => {
      wsCallback = cb
      return () => {}
    })

    let ctx: any
    render(
      <AppProvider>
        <TestConsumer onRender={(c) => { ctx = c }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(ctx.isLoading).toBe(false)
    })

    await act(async () => {
      wsCallback({ type: 'task:created', payload: sampleTask })
    })

    expect(ctx.tasks).toHaveLength(1)
  })

  it('handles task:deleted WebSocket event', async () => {
    let wsCallback: (event: any) => void = () => {}
    window.tidalflow.onWsEvent.mockImplementation((cb: any) => {
      wsCallback = cb
      return () => {}
    })
    window.tidalflow.getTodayTasks.mockResolvedValue({ success: true, data: [sampleTask] })

    let ctx: any
    render(
      <AppProvider>
        <TestConsumer onRender={(c) => { ctx = c }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(ctx.isLoading).toBe(false)
    })
    expect(ctx.tasks).toHaveLength(1)

    await act(async () => {
      wsCallback({ type: 'task:deleted', payload: { id: 't1' } })
    })

    expect(ctx.tasks).toHaveLength(0)
  })

  it('handles server:shutdown event by loading cached tasks', async () => {
    let wsCallback: (event: any) => void = () => {}
    window.tidalflow.onWsEvent.mockImplementation((cb: any) => {
      wsCallback = cb
      return () => {}
    })
    window.tidalflow.getCachedTasks.mockResolvedValue([sampleTask])

    let ctx: any
    render(
      <AppProvider>
        <TestConsumer onRender={(c) => { ctx = c }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(ctx.isLoading).toBe(false)
    })

    await act(async () => {
      wsCallback({ type: 'server:shutdown', payload: { message: 'bye' } })
    })

    expect(ctx.isConnected).toBe(false)
  })

  it('throws when useAppContext used outside AppProvider', () => {
    // Suppress console.error for this test
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    function BadConsumer() {
      useAppContext()
      return null
    }

    expect(() => render(<BadConsumer />)).toThrow('useAppContext must be used within AppProvider')

    spy.mockRestore()
  })

  it('deletes task with optimistic rollback on failure', async () => {
    window.tidalflow.getTodayTasks.mockResolvedValue({ success: true, data: [sampleTask] })
    window.tidalflow.deleteTask.mockRejectedValue(new Error('Server gone'))

    let ctx: any
    render(
      <AppProvider>
        <TestConsumer onRender={(c) => { ctx = c }} />
      </AppProvider>
    )

    await waitFor(() => {
      expect(ctx.isLoading).toBe(false)
    })

    // Attempt delete
    await act(async () => {
      try {
        await ctx.deleteTask('t1')
      } catch {
        // expected
      }
    })

    // Should have rolled back — task still present
    expect(ctx.tasks).toHaveLength(1)
    expect(ctx.error).toBe('Server gone')
  })
})
