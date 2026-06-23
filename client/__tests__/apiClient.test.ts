import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { apiClient, getApiKey, getWsUrl } from '../src/main/services/apiClient'

// We need to mock process.env for these tests (main process)
describe('apiClient', () => {
  describe('getApiKey', () => {
    beforeEach(() => {
      vi.unstubAllEnvs()
    })

    it('returns empty string when no env vars set', () => {
      vi.stubEnv('API_KEY', undefined as any)
      vi.stubEnv('TIDALFLOW_API_KEY', undefined as any)
      expect(getApiKey()).toBe('')
    })

    it('reads from API_KEY env var', () => {
      vi.stubEnv('API_KEY', 'test-key-123')
      expect(getApiKey()).toBe('test-key-123')
    })

    it('prefers API_KEY over TIDALFLOW_API_KEY', () => {
      vi.stubEnv('TIDALFLOW_API_KEY', 'new-key')
      vi.stubEnv('API_KEY', 'old-key')
      expect(getApiKey()).toBe('old-key')
    })
  })

  describe('getWsUrl', () => {
    it('uses TIDALFLOW_WS_URL when set', () => {
      vi.stubEnv('TIDALFLOW_WS_URL', 'wss://custom.example.com/ws')
      expect(getWsUrl()).toBe('wss://custom.example.com/ws')
    })

    it('constructs ws:// from http:// server URL', () => {
      vi.stubEnv('TIDALFLOW_WS_URL', undefined as any)
      vi.stubEnv('TIDALFLOW_SERVER_URL', 'http://localhost:4000')
      expect(getWsUrl()).toBe('ws://localhost:4000/ws')
    })

    it('constructs wss:// from https:// server URL', () => {
      vi.stubEnv('TIDALFLOW_WS_URL', undefined as any)
      vi.stubEnv('TIDALFLOW_SERVER_URL', 'https://tidal.example.com')
      expect(getWsUrl()).toBe('wss://tidal.example.com/ws')
    })

    it('falls back to DEFAULT_SERVER_URL', () => {
      vi.stubEnv('TIDALFLOW_WS_URL', undefined as any)
      vi.stubEnv('TIDALFLOW_SERVER_URL', undefined as any)
      vi.stubEnv('SERVER_URL', undefined as any)
      expect(getWsUrl()).toBe('ws://localhost:3000/ws')
    })
  })

  describe('HTTP methods (with mocked fetch)', () => {
    const mockFetch = vi.fn()
    let originalFetch: typeof global.fetch

    beforeEach(() => {
      originalFetch = global.fetch
      global.fetch = mockFetch
      vi.stubEnv('TIDALFLOW_API_KEY', undefined as any)
      vi.stubEnv('API_KEY', 'test-key')
      vi.stubEnv('TIDALFLOW_SERVER_URL', 'http://localhost:3000')
    })

    afterEach(() => {
      global.fetch = originalFetch
      vi.unstubAllEnvs()
      mockFetch.mockReset()
    })

    it('apiClient.get sends GET with X-API-Key header', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: [{ id: '1' }] }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))

      const result = await apiClient.get('/tasks')

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [url, init] = mockFetch.mock.calls[0]
      expect(url).toContain('/api/v1/tasks')
      expect(init.method).toBe('GET')
      expect(init.headers['X-API-Key']).toBe('test-key')
      expect(result.success).toBe(true)
    })

    it('apiClient.post sends POST with JSON body', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true, data: { id: 't1' } }), {
        status: 201,
        headers: { 'content-type': 'application/json' },
      }))

      const result = await apiClient.post('/tasks', { title: 'Test' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      const [_url, init] = mockFetch.mock.calls[0]
      expect(init.method).toBe('POST')
      expect(init.headers['Content-Type']).toBe('application/json')
      expect(JSON.parse(init.body)).toEqual({ title: 'Test' })
      expect(result.success).toBe(true)
    })

    it('apiClient.get returns error on HTTP 500', async () => {
      mockFetch.mockResolvedValueOnce(new Response('Server Error', {
        status: 500,
        headers: { 'content-type': 'text/plain' },
      }))

      const result = await apiClient.get('/tasks')

      expect(result.success).toBe(false)
      expect(result.error).toContain('500')
    })

    it('apiClient catches network errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'))

      const result = await apiClient.get('/health')

      expect(result.success).toBe(false)
      expect(result.error).toBe('ECONNREFUSED')
    })

    it('apiClient handles non-Error thrown objects', async () => {
      mockFetch.mockRejectedValueOnce('connection lost')

      const result = await apiClient.get('/status')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Network request failed')
    })

    it('apiClient.put sends PUT request', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))

      const result = await apiClient.put('/tasks/t1', { title: 'Updated' })

      expect(mockFetch).toHaveBeenCalledTimes(1)
      expect(mockFetch.mock.calls[0][1].method).toBe('PUT')
      expect(result.success).toBe(true)
    })

    it('apiClient.delete sends DELETE request', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))

      const result = await apiClient.delete('/tasks/t1')

      expect(mockFetch.mock.calls[0][1].method).toBe('DELETE')
      expect(result.success).toBe(true)
    })
  })
})
