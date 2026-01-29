import { WarpChainInfo, WarpChainName } from '@joai/warps'
import { WarpSuiOutput } from './WarpSuiOutput'

describe('WarpSuiOutput', () => {
  const config = { env: 'devnet' as const }
  const chain: WarpChainInfo = {
    name: WarpChainName.Sui,
    displayName: 'Sui',
    chainId: '1',
    blockTime: 3000,
    addressHrp: '0x',
    defaultApiUrl: 'https://fullnode.devnet.sui.io',
    logoUrl: 'https://example.com/sui-chain-logo.png',
    nativeToken: {
      chain: WarpChainName.Sui,
      identifier: 'SUI',
      name: 'Sui',
      symbol: 'SUI',
      decimals: 9,
      logoUrl: 'https://example.com/sui-logo.png',
    },
  }
  const output = new WarpSuiOutput(config, chain)

  it('should extract contract results', async () => {
    const warp = { output: { foo: 'out.foo' }, actions: [{ inputs: [] }] } as any
    const tx = { returnValues: { foo: 'string:bar' }, effects: { status: { status: 'success' } }, digest: '0xabc' }
    const res = await output.extractContractOutput(warp, 1, tx, [])
    expect(res.values.string).toEqual(['string:bar'])
    expect(res.values.native).toEqual(['string:bar'])
    expect(res.output.foo).toBe('string:bar')
  })

  it('should extract query results', async () => {
    const warp = { output: { bar: 'out.bar' }, actions: [{ inputs: [] }] } as any
    const values = [{ bar: 'string:baz' }]
    const res = await output.extractQueryOutput(warp, values, 1, [])
    expect(res.values.string).toEqual(['[object Object]'])
    expect(res.values.native).toEqual([{ bar: 'string:baz' }])
    expect(res.output.bar).toBe('string:baz')
  })
})
