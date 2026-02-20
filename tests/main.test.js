import { describe, it, expect, vi, beforeEach } from 'vitest'

const mountMock = vi.fn()
const createAppMock = vi.fn(() => ({ mount: mountMock }))

vi.mock('vue', () => ({
  createApp: createAppMock,
}))

vi.mock('../src/App.vue', () => ({
  default: { name: 'MockApp' },
}))

vi.mock('../src/assets/main.css', () => ({}))

describe('main entry', () => {
  beforeEach(() => {
    createAppMock.mockClear()
    mountMock.mockClear()
  })

  it('creates and mounts Vue app', async () => {
    await import('../src/main.js')

    expect(createAppMock).toHaveBeenCalledTimes(1)
    expect(mountMock).toHaveBeenCalledWith('#app')
  })
})
