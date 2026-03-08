import { WarpCompositeResolver } from './WarpCompositeResolver'
import { WarpResolver, WarpResolverResult } from './types/resolver'

const mockResult: WarpResolverResult = {
  warp: { protocol: 'warp:3.0.0', name: 'test', title: 'Test', actions: [] } as any,
  brand: null,
  registryInfo: { hash: 'abc', alias: 'test', trust: 'verified' as const, owner: null, createdAt: null, upgradedAt: null, brand: null, upgrade: null },
}

const createMockResolver = (result: WarpResolverResult | null = null): WarpResolver => ({
  getByAlias: jest.fn().mockResolvedValue(result),
  getByHash: jest.fn().mockResolvedValue(result),
})

describe('WarpCompositeResolver', () => {
  it('returns first matching result for alias', async () => {
    const r1 = createMockResolver(null)
    const r2 = createMockResolver(mockResult)
    const r3 = createMockResolver(null)
    const composite = new WarpCompositeResolver([r1, r2, r3])

    const result = await composite.getByAlias('test')

    expect(result).toBe(mockResult)
    expect(r1.getByAlias).toHaveBeenCalledWith('test', undefined)
    expect(r2.getByAlias).toHaveBeenCalledWith('test', undefined)
    expect(r3.getByAlias).not.toHaveBeenCalled()
  })

  it('returns first matching result for hash', async () => {
    const r1 = createMockResolver(null)
    const r2 = createMockResolver(mockResult)
    const composite = new WarpCompositeResolver([r1, r2])

    const result = await composite.getByHash('abc')

    expect(result).toBe(mockResult)
    expect(r1.getByHash).toHaveBeenCalledWith('abc', undefined)
    expect(r2.getByHash).toHaveBeenCalledWith('abc', undefined)
  })

  it('returns null when no resolver matches', async () => {
    const r1 = createMockResolver(null)
    const r2 = createMockResolver(null)
    const composite = new WarpCompositeResolver([r1, r2])

    expect(await composite.getByAlias('unknown')).toBeNull()
    expect(await composite.getByHash('unknown')).toBeNull()
  })

  it('works with empty resolver list', async () => {
    const composite = new WarpCompositeResolver([])

    expect(await composite.getByAlias('test')).toBeNull()
    expect(await composite.getByHash('test')).toBeNull()
  })

  it('returns first resolver result when multiple match', async () => {
    const result2: WarpResolverResult = { ...mockResult, warp: { ...mockResult.warp, name: 'second' } as any }
    const r1 = createMockResolver(mockResult)
    const r2 = createMockResolver(result2)
    const composite = new WarpCompositeResolver([r1, r2])

    const result = await composite.getByAlias('test')

    expect(result!.warp.name).toBe('test')
    expect(r2.getByAlias).not.toHaveBeenCalled()
  })
})
