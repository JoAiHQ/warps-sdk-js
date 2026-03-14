import { WarpChainName } from '../constants'
import { Warp } from '../types'
import { checkWarpAssetBalance, getRequiredAssetIds } from './warp-assets'

const chainInfo = {
  name: WarpChainName.Multiversx,
  nativeToken: { identifier: 'EGLD', name: 'EGLD', symbol: 'EGLD', chain: WarpChainName.Multiversx },
} as any

const makeWarp = (type: string, inputs: any[] = []): Warp => ({
  protocol: 'warp:1.0.0',
  name: 'test-warp',
  title: 'Test Warp',
  description: null,
  actions: [{ type, label: 'Action', inputs, primary: true } as any],
})

const makeAdapter = (assets: any[]) => ({
  chainInfo,
  dataLoader: { getAccountAssets: jest.fn().mockResolvedValue(assets) },
})

describe('getRequiredAssetIds', () => {
  it('returns native token for contract action with position=value input', () => {
    const warp = makeWarp('contract', [{ name: 'amount', type: 'biguint', position: 'value', source: 'field' }])
    expect(getRequiredAssetIds(warp, chainInfo)).toEqual(['EGLD'])
  })

  it('returns native token for transfer action with position=value input', () => {
    const warp = makeWarp('transfer', [{ name: 'amount', type: 'biguint', position: 'value', source: 'field' }])
    expect(getRequiredAssetIds(warp, chainInfo)).toEqual(['EGLD'])
  })

  it('returns native token for contract action with position=transfer input', () => {
    const warp = makeWarp('contract', [{ name: 'token', type: 'string', position: 'transfer', source: 'field' }])
    expect(getRequiredAssetIds(warp, chainInfo)).toEqual(['EGLD'])
  })

  it('returns native token for contract action with type=asset input', () => {
    const warp = makeWarp('contract', [{ name: 'payment', type: 'asset', source: 'field' }])
    expect(getRequiredAssetIds(warp, chainInfo)).toEqual(['EGLD'])
  })

  it('returns empty for query action', () => {
    const warp = makeWarp('query', [{ name: 'amount', type: 'biguint', position: 'value', source: 'field' }])
    expect(getRequiredAssetIds(warp, chainInfo)).toEqual([])
  })

  it('returns empty for contract action with only arg inputs', () => {
    const warp = makeWarp('contract', [{ name: 'recipient', type: 'address', position: 'arg:1', source: 'field' }])
    expect(getRequiredAssetIds(warp, chainInfo)).toEqual([])
  })

  it('returns empty when warp has no actions', () => {
    const warp: Warp = { protocol: 'warp:1.0.0', name: 'test', title: 'Test', description: null, actions: [] }
    expect(getRequiredAssetIds(warp, chainInfo)).toEqual([])
  })
})

describe('checkWarpAssetBalance', () => {
  const warpWithValueInput = makeWarp('contract', [{ name: 'amount', type: 'biguint', position: 'value', source: 'field' }])
  const warpWithArgOnly = makeWarp('contract', [{ name: 'recipient', type: 'address', position: 'arg:1', source: 'field' }])

  it('returns false when required asset has no balance', async () => {
    const adapter = makeAdapter([])
    expect(await checkWarpAssetBalance(warpWithValueInput, 'erd1abc', WarpChainName.Multiversx, [adapter as any])).toBe(false)
  })

  it('returns false when required asset has zero amount', async () => {
    const adapter = makeAdapter([{ identifier: 'EGLD', amount: 0n }])
    expect(await checkWarpAssetBalance(warpWithValueInput, 'erd1abc', WarpChainName.Multiversx, [adapter as any])).toBe(false)
  })

  it('returns true when required asset has a positive balance', async () => {
    const adapter = makeAdapter([{ identifier: 'EGLD', amount: 1_000_000_000_000_000_000n }])
    expect(await checkWarpAssetBalance(warpWithValueInput, 'erd1abc', WarpChainName.Multiversx, [adapter as any])).toBe(true)
  })

  it('returns true when warp has no asset transfer inputs', async () => {
    const adapter = makeAdapter([])
    expect(await checkWarpAssetBalance(warpWithArgOnly, 'erd1abc', WarpChainName.Multiversx, [adapter as any])).toBe(true)
    expect(adapter.dataLoader.getAccountAssets).not.toHaveBeenCalled()
  })

  it('returns true when adapter is not found (non-fatal)', async () => {
    expect(await checkWarpAssetBalance(warpWithValueInput, 'erd1abc', WarpChainName.Multiversx, [])).toBe(true)
  })
})
