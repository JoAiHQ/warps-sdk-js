import { AbiRegistry } from '@multiversx/sdk-core'
import { WarpChainEnv, WarpChainInfo, WarpChainName, WarpClientConfig } from '@joai/warps'
import { WarpMultiversxAbiBuilder } from './WarpMultiversxAbiBuilder'
import * as testAbiJson from './testdata/test.abi.json'

jest.mock('./helpers/general')

describe('WarpMultiversxAbiBuilder', () => {
  const mockConfig: WarpClientConfig = {
    env: 'devnet' as WarpChainEnv,
    currentUrl: 'https://usewarp.to',
  }

  const mockChainInfo: WarpChainInfo = {
    name: WarpChainName.Multiversx,
    displayName: 'MultiversX',
    chainId: 'D',
    blockTime: 6000,
    addressHrp: 'erd',
    defaultApiUrl: 'https://devnet-api.multiversx.com',
    logoUrl: 'https://example.com/egld-logo.png',
    nativeToken: {
      chain: WarpChainName.Multiversx,
      identifier: 'EGLD',
      name: 'MultiversX',
      symbol: 'EGLD',
      decimals: 18,
      logoUrl: 'https://example.com/egld-logo.png',
    },
  }

  const contractAddress = 'erd1qqqqqqqqqqqqqpgqje2f99vr6r7sk54thg03c9suzcvwr4nfl3tsfkdl36'

  let abiBuilder: WarpMultiversxAbiBuilder

  beforeEach(() => {
    abiBuilder = new WarpMultiversxAbiBuilder(mockConfig, mockChainInfo)
  })

  describe('endpointsToWarps', () => {
    it('should convert ABI endpoints to warps', () => {
      const abi = AbiRegistry.create(testAbiJson)
      const warps = abiBuilder.endpointsToWarps(abi, contractAddress)

      expect(warps).toHaveLength(2)
      expect(warps.map((w) => w.name)).toEqual(['register', 'getParticipations'])
    })

    it('should create contract action for mutable endpoints', () => {
      const abi = AbiRegistry.create(testAbiJson)
      const warps = abiBuilder.endpointsToWarps(abi, contractAddress)

      const registerWarp = warps.find((w) => w.name === 'register')!
      expect(registerWarp.actions).toHaveLength(1)

      const action = registerWarp.actions[0] as any
      expect(action.type).toBe('contract')
      expect(action.address).toBe(contractAddress)
      expect(action.func).toBe('register')
      expect(action.gasLimit).toBe(10_000_000)
    })

    it('should create query action for readonly endpoints', () => {
      const abi = AbiRegistry.create(testAbiJson)
      const warps = abiBuilder.endpointsToWarps(abi, contractAddress)

      const queryWarp = warps.find((w) => w.name === 'getParticipations')!
      expect(queryWarp.actions).toHaveLength(1)

      const action = queryWarp.actions[0] as any
      expect(action.type).toBe('query')
      expect(action.address).toBe(contractAddress)
      expect(action.func).toBe('getParticipations')
      expect(action.gasLimit).toBeUndefined()
    })

    it('should map endpoint inputs to warp action inputs', () => {
      const abi = AbiRegistry.create(testAbiJson)
      const warps = abiBuilder.endpointsToWarps(abi, contractAddress)

      const registerWarp = warps.find((w) => w.name === 'register')!
      const inputs = registerWarp.actions[0].inputs!

      expect(inputs).toHaveLength(4)
      expect(inputs[0].name).toBe('stake_token')
      expect(inputs[0].position).toBe('arg:1')
      expect(inputs[0].source).toBe('field')
      expect(inputs[1].name).toBe('reward_token')
      expect(inputs[2].name).toBe('lock_time_seconds')
      expect(inputs[3].name).toBe('managers')
    })

    it('should mark optional/option inputs as not required', () => {
      const abi = AbiRegistry.create(testAbiJson)
      const warps = abiBuilder.endpointsToWarps(abi, contractAddress)

      const registerWarp = warps.find((w) => w.name === 'register')!
      const inputs = registerWarp.actions[0].inputs!

      // stake_token is Option<TokenIdentifier> — not required
      expect(inputs[0].required).toBe(false)
      // reward_token is EgldOrEsdtTokenIdentifier — required
      expect(inputs[1].required).toBe(true)
      // lock_time_seconds is u64 — required
      expect(inputs[2].required).toBe(true)
    })

    it('should set chain name from chain info', () => {
      const abi = AbiRegistry.create(testAbiJson)
      const warps = abiBuilder.endpointsToWarps(abi, contractAddress)

      warps.forEach((warp) => {
        expect(warp.chain).toBe(WarpChainName.Multiversx)
      })
    })

    it('should include base64-encoded ABI when raw JSON is provided', () => {
      const abi = AbiRegistry.create(testAbiJson)
      const warps = abiBuilder.endpointsToWarps(abi, contractAddress, testAbiJson)

      const expectedBase64 = btoa(JSON.stringify(testAbiJson))

      warps.forEach((warp) => {
        expect((warp.actions[0] as any).abi).toBe(expectedBase64)
      })
    })

    it('should not include ABI when raw JSON is not provided', () => {
      const abi = AbiRegistry.create(testAbiJson)
      const warps = abiBuilder.endpointsToWarps(abi, contractAddress)

      warps.forEach((warp) => {
        expect((warp.actions[0] as any).abi).toBeUndefined()
      })
    })

    it('should return empty array for ABI with no endpoints', () => {
      const emptyAbi = AbiRegistry.create({ endpoints: [] })
      const warps = abiBuilder.endpointsToWarps(emptyAbi, contractAddress)

      expect(warps).toHaveLength(0)
    })
  })
})
