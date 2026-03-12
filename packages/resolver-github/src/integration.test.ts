/**
 * Integration test that fetches the real GitHub catalog manifest.
 * Run with: npx jest --config jest.config.mjs integration.test.ts
 */
import { WarpGitHubResolver } from './WarpGitHubResolver'

const TIMEOUT = 15000

describe('WarpGitHubResolver Integration', () => {
  it('fetches real mainnet manifest and resolves a warp by alias', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('omniset-deposit-arbitrum')

    expect(result).not.toBeNull()
    expect(result!.warp).toBeDefined()
    expect(result!.warp.protocol).toBe('warp:3.0.0')
    expect(result!.warp.name).toBe('OmniSet: Deposit Arbitrum')
    expect(result!.registryInfo!.hash).toBeTruthy()
    expect(result!.registryInfo!.trust).toBe('verified')
    expect(result!.registryInfo!.alias).toBe('omniset-deposit-arbitrum')
    expect(result!.brand).not.toBeNull()
    expect(result!.brand!.name).toBe('OmniSet')
  }, TIMEOUT)

  it('resolves by full key (chain:alias)', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('arbitrum:omniset-deposit-arbitrum')

    expect(result).not.toBeNull()
    expect(result!.warp.name).toBe('OmniSet: Deposit Arbitrum')
  }, TIMEOUT)

  it('resolves by hash and cross-checks with alias', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const byAlias = await resolver.getByAlias('omniset-deposit-arbitrum')
    expect(byAlias).not.toBeNull()

    const byHash = await resolver.getByHash(byAlias!.registryInfo!.hash)
    expect(byHash).not.toBeNull()
    expect(byHash!.warp.name).toBe(byAlias!.warp.name)
  }, TIMEOUT)

  it('returns null for unknown alias', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('__nonexistent_warp__')
    expect(result).toBeNull()
  }, TIMEOUT)

  it('caches manifest across multiple calls', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet', refreshInterval: 60000 })

    const r1 = await resolver.getByAlias('omniset-deposit-arbitrum')
    const r2 = await resolver.getByAlias('omniset-deposit-arbitrum')

    expect(r1).not.toBeNull()
    expect(r2).not.toBeNull()
    expect(r1!.warp.name).toBe(r2!.warp.name)
    // Only 1 fetch should have been made (caching)
  }, TIMEOUT)

  it('warp has correct meta fields', async () => {
    const resolver = new WarpGitHubResolver({ env: 'mainnet' })
    const result = await resolver.getByAlias('omniset-deposit-arbitrum')

    expect(result).not.toBeNull()
    expect(result!.warp.meta).toBeDefined()
    expect(result!.warp.meta!.chain).toBe('arbitrum')
    expect(result!.warp.meta!.hash).toBeTruthy()
    expect(result!.warp.meta!.creator).toBe('github:JoAiHQ/warps')
    expect(result!.warp.meta!.identifier).toBe('@arbitrum:omniset-deposit-arbitrum')
  }, TIMEOUT)
})
