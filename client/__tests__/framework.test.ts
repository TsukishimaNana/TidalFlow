import { describe, it, expect } from 'vitest'

describe('Vitest 框架验证', () => {
  it('基础断言测试', () => {
    expect(1 + 1).toBe(2)
  })

  it('字符串匹配测试', () => {
    expect('TidalFlow').toContain('Tidal')
  })

  it('对象结构测试', () => {
    const task = { id: 't1', title: '测试任务', status: 'done' }
    expect(task).toHaveProperty('status', 'done')
    expect(task.id).toMatch(/^t\d+$/)
  })
})
