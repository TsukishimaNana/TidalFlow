import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock ws module
vi.mock('ws', () => {
  const EventEmitter = require('events')
  return {
    default: class MockWebSocket extends EventEmitter {
      static OPEN = 1
      static CONNECTING = 0
      static CLOSED = 3
      readyState = MockWebSocket.CONNECTING
      url: string
      send = vi.fn()
      close = vi.fn(function (this: MockWebSocket) {
        this.readyState = MockWebSocket.CLOSED
        this.emit('close')
      })

      constructor(url: string) {
        super()
        this.url = url
        // Simulate async open
        setTimeout(() => {
          this.readyState = MockWebSocket.OPEN
          this.emit('open')
        }, 0)
      }
    },
  }
})

import { WsClient } from '../src/main/services/wsClient'
import type { WsServerEvent } from '../../shared/src/wsEvents'

describe('WsClient', () => {
  let client: WsClient

  beforeEach(() => {
    vi.useFakeTimers()
    client = new WsClient()
  })

  afterEach(() => {
    // Clear heartbeat interval to prevent timer leaks
    if ((client as any).heartbeatTimer) {
      clearInterval((client as any).heartbeatTimer)
    }
    client.disconnect()
    vi.useRealTimers()
  })

  // Helper to advance past the async open (0ms timeout)
  async function advancePastOpen(): Promise<void> {
    await vi.advanceTimersByTimeAsync(10)
  }

  it('sends auth message on connect', async () => {
    client.connect('ws://localhost:3000/ws', 'my-api-key')
    await advancePastOpen()

    const socket = (client as any).socket
    expect(socket).not.toBeNull()
    expect(socket.send).toHaveBeenCalled()
    const sentData = JSON.parse(socket.send.mock.calls[0][0])
    expect(sentData.type).toBe('auth')
    expect(sentData.payload.apiKey).toBe('my-api-key')
  })

  it('does not reconnect on same URL if already open', async () => {
    client.connect('ws://localhost:3000/ws', 'key')
    await advancePastOpen()
    const firstSocket = (client as any).socket

    client.connect('ws://localhost:3000/ws', 'key')
    expect((client as any).socket).toBe(firstSocket)
  })

  it('fires onEvent callbacks on received message', async () => {
    const callback = vi.fn()
    client.onEvent(callback)
    client.connect('ws://localhost:3000/ws', 'key')
    await advancePastOpen()

    const socket = (client as any).socket
    const syncEvent: WsServerEvent = {
      type: 'tasks:sync',
      payload: [{ id: 't1', title: 'Task 1' } as any],
    }
    socket.emit('message', JSON.stringify(syncEvent))

    expect(callback).toHaveBeenCalledTimes(1)
    expect(callback.mock.calls[0][0].type).toBe('tasks:sync')
    expect(callback.mock.calls[0][0].payload).toHaveLength(1)
  })

  it('onEvent returns unsubscribe function', async () => {
    const callback = vi.fn()
    const unsubscribe = client.onEvent(callback)
    client.connect('ws://localhost:3000/ws', 'key')
    await advancePastOpen()

    unsubscribe()
    const socket = (client as any).socket
    socket.emit('message', JSON.stringify({ type: 'tasks:sync', payload: [] }))
    expect(callback).not.toHaveBeenCalled()
  })

  it('disconnect stops reconnect attempts', async () => {
    client.connect('ws://localhost:3000/ws', 'key')
    await advancePastOpen()

    const socket = (client as any).socket
    client.disconnect()

    expect((client as any).shouldReconnect).toBe(false)
    expect(socket.close).toHaveBeenCalledWith(1000, 'Client disconnect')
  })

  it('attempts reconnect after close when shouldReconnect is true', async () => {
    client.connect('ws://localhost:3000/ws', 'key')
    await advancePastOpen()

    const socket = (client as any).socket
    socket.readyState = 3
    socket.emit('close')

    // Should schedule reconnect after 1s
    expect((client as any).reconnectTimer).not.toBeNull()

    // Stop heartbeat to prevent timer loops during advance
    if ((client as any).heartbeatTimer) clearInterval((client as any).heartbeatTimer)

    await vi.advanceTimersByTimeAsync(2000)

    // Should have opened a new socket
    expect((client as any).socket).not.toBeNull()
  })

  it('does not schedule reconnect when shouldReconnect is false', async () => {
    client.connect('ws://localhost:3000/ws', 'key')
    await advancePastOpen()

    ;(client as any).shouldReconnect = false
    const socket = (client as any).socket
    socket.readyState = 3
    socket.emit('close')

    expect((client as any).reconnectTimer).toBeNull()
  })

  it('ignores malformed JSON messages gracefully', async () => {
    const callback = vi.fn()
    client.onEvent(callback)
    client.connect('ws://localhost:3000/ws', 'key')
    await advancePastOpen()

    const socket = (client as any).socket
    socket.emit('message', 'not valid json at all')
    expect(callback).not.toHaveBeenCalled()
  })

  it('starts heartbeat on open and sends ping', async () => {
    client.connect('ws://localhost:3000/ws', 'key')
    await advancePastOpen()

    const socket = (client as any).socket
    socket.send.mockClear()

    // Advance past heartbeat interval
    await vi.advanceTimersByTimeAsync(35_000)

    expect(socket.send).toHaveBeenCalled()
    const sentData = JSON.parse(socket.send.mock.calls[0][0])
    expect(sentData.type).toBe('ping')
  })
})
