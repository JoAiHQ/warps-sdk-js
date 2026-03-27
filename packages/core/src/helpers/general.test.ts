import { WarpChainName } from '../constants'
import { Warp, WarpAction, WarpActionType, WarpMeta } from '../types'
import { doesWarpRequireWallet, evaluateWhenCondition, getWarpInputAction, isWarpActionAutoExecute, replacePlaceholders } from './general'

describe('getWarpInputAction', () => {
  const createMockWarp = (actions: WarpAction[], meta?: Partial<WarpMeta>): Warp => ({
    protocol: 'warp:1.0.0',
    chain: WarpChainName.Ethereum,
    name: 'test-warp',
    title: 'Test Warp',
    description: 'Test description',
    actions,
    meta: meta as WarpMeta | undefined,
  })

  const createMockAction = (type: WarpActionType, label = 'Test Action'): WarpAction => ({
    type,
    label,
  })

  describe('should return the first non-native action', () => {
    it('should return the first non-native action and correct index', () => {
      const contractAction = createMockAction('contract', 'Contract Action')
      const transferAction = createMockAction('transfer', 'Transfer Action')
      const warp = createMockWarp([contractAction, transferAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(contractAction)
      expect(result.action.label).toBe('Contract Action')
      expect(result.index).toBe(0)
    })

    it('should return the first non-native action when multiple non-native exist', () => {
      const firstAction = createMockAction('transfer', 'First Transfer')
      const secondAction = createMockAction('contract', 'Second Contract')
      const warp = createMockWarp([firstAction, secondAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(firstAction)
      expect(result.action.label).toBe('First Transfer')
      expect(result.index).toBe(0)
    })
  })

  describe('auto-detection skips native action types', () => {
    it('should return the first non-native action when mixed with link actions', () => {
      const linkAction = createMockAction('link', 'Link Action')
      const transferAction = createMockAction('transfer', 'Transfer Action')
      const contractAction = createMockAction('contract', 'Contract Action')
      const warp = createMockWarp([linkAction, transferAction, contractAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(linkAction)
      expect(result.action.label).toBe('Link Action')
      expect(result.index).toBe(0)
    })

    it('should return the first non-native action when multiple non-native actions exist', () => {
      const transferAction = createMockAction('transfer', 'Transfer Action')
      const queryAction = createMockAction('query', 'Query Action')
      const warp = createMockWarp([transferAction, queryAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(transferAction)
      expect(result.action.label).toBe('Transfer Action')
      expect(result.index).toBe(0)
    })

    it('should return the first non-native action (transfer before collect)', () => {
      const transferAction = createMockAction('transfer', 'Transfer Action')
      const collectAction = createMockAction('collect', 'Collect Action')
      const warp = createMockWarp([transferAction, collectAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(transferAction)
      expect(result.action.label).toBe('Transfer Action')
      expect(result.index).toBe(0)
    })

    it('should return the first non-native action when mixed with multiple link actions', () => {
      const linkAction1 = createMockAction('link', 'Link Action 1')
      const transferAction = createMockAction('transfer', 'Transfer Action')
      const linkAction2 = createMockAction('link', 'Link Action 2')
      const contractAction = createMockAction('contract', 'Contract Action')
      const warp = createMockWarp([linkAction1, transferAction, linkAction2, contractAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(linkAction1)
      expect(result.action.label).toBe('Link Action 1')
      expect(result.index).toBe(0)
    })
  })

  describe('native types (state, mount, unmount, loop) are skipped', () => {
    it.each(['state', 'mount', 'unmount', 'loop'] as const)('%s falls through to first-action fallback', (type) => {
      const hostAction = createMockAction(type as any, 'Host Action')
      const warp = createMockWarp([hostAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(hostAction)
      expect(result.index).toBe(0)
    })

    it('skips state/mount/unmount when a non-native action is present', () => {
      const stateAction = createMockAction('state' as any, 'Read State')
      const collectAction = createMockAction('collect', 'Collect Data')
      const warp = createMockWarp([stateAction, collectAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(collectAction)
      expect(result.index).toBe(1)
    })
  })

  describe('when only native actions exist', () => {
    it('should return the first action as fallback when only link actions exist', () => {
      const linkAction = createMockAction('link', 'Single Link')
      const warp = createMockWarp([linkAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(linkAction)
      expect(result.action.label).toBe('Single Link')
      expect(result.index).toBe(0)
    })

    it('should return the first link action when multiple link actions exist', () => {
      const linkAction1 = createMockAction('link', 'Link Action 1')
      const linkAction2 = createMockAction('link', 'Link Action 2')
      const warp = createMockWarp([linkAction1, linkAction2])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(linkAction1)
      expect(result.action.label).toBe('Link Action 1')
      expect(result.index).toBe(0)
    })
  })

  describe('when no actions exist', () => {
    it('should throw an error when actions array is empty', () => {
      const warp = createMockWarp([], { identifier: 'empty-hash' })

      expect(() => getWarpInputAction(warp)).toThrow('Warp has no actions: empty-hash')
    })

    it('should throw an error without hash when meta is undefined', () => {
      const warp = createMockWarp([])

      expect(() => getWarpInputAction(warp)).toThrow('Warp has no actions: undefined')
    })
  })

  describe('edge cases', () => {
    it('should handle single non-native action', () => {
      const transferAction = createMockAction('transfer', 'Single Transfer')
      const warp = createMockWarp([transferAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(transferAction)
      expect(result.action.label).toBe('Single Transfer')
      expect(result.index).toBe(0)
    })

    it('should handle single link action', () => {
      const linkAction = createMockAction('link', 'Only Link')
      const warp = createMockWarp([linkAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(linkAction)
      expect(result.action.label).toBe('Only Link')
      expect(result.index).toBe(0)
    })

    it('should return the first non-native action regardless of order', () => {
      const transferAction = createMockAction('transfer', 'Transfer')
      const linkAction = createMockAction('link', 'Link')
      const warp = createMockWarp([transferAction, linkAction])

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(transferAction)
      expect(result.action.label).toBe('Transfer')
      expect(result.index).toBe(0)
    })

    it('should not modify the original actions array when finding first non-native action', () => {
      const linkAction = createMockAction('link', 'Link Action')
      const transferAction = createMockAction('transfer', 'Transfer Action')
      const contractAction = createMockAction('contract', 'Contract Action')
      const originalActions = [linkAction, transferAction, contractAction]
      const warp = createMockWarp(originalActions)

      const result = getWarpInputAction(warp)

      expect(result.action).toBe(linkAction)
      expect(result.index).toBe(0)
      expect(warp.actions).toEqual(originalActions)
    })
  })
})

describe('isWarpActionAutoExecute', () => {
  const createMockWarp = (actions: WarpAction[], meta?: Partial<WarpMeta>): Warp => ({
    protocol: 'warp:1.0.0',
    chain: WarpChainName.Ethereum,
    name: 'test-warp',
    title: 'Test Warp',
    description: 'Test description',
    actions,
    meta: meta as WarpMeta | undefined,
  })

  const createMockAction = (type: WarpActionType, auto?: boolean, label = 'Test Action'): WarpAction => ({
    type,
    label,
    auto,
  })

  describe('when action.auto is explicitly false', () => {
    it('should return false regardless of action type', () => {
      expect(isWarpActionAutoExecute(createMockAction('transfer', false))).toBe(false)
      expect(isWarpActionAutoExecute(createMockAction('link', false))).toBe(false)
    })
  })

  describe('when action type is link', () => {
    it('should return true if link has auto: true', () => {
      expect(isWarpActionAutoExecute(createMockAction('link', true))).toBe(true)
    })

    it('should return false if link does not have auto: true', () => {
      expect(isWarpActionAutoExecute(createMockAction('link'))).toBe(false)
    })
  })

  describe('when action type is not link', () => {
    it('should return true for transfer actions', () => {
      expect(isWarpActionAutoExecute(createMockAction('transfer'))).toBe(true)
    })

    it('should return true for contract actions', () => {
      expect(isWarpActionAutoExecute(createMockAction('contract'))).toBe(true)
    })

    it('should return true for query actions', () => {
      expect(isWarpActionAutoExecute(createMockAction('query'))).toBe(true)
    })

    it('should return true for collect actions', () => {
      expect(isWarpActionAutoExecute(createMockAction('collect'))).toBe(true)
    })
  })
})

describe('doesWarpRequireWallet', () => {
  const makeWarp = (actionTypes: WarpActionType[], chain?: WarpChainName): Warp => ({
    protocol: 'warp:1.0.0',
    name: 'test-warp',
    title: 'Test',
    description: null,
    chain,
    actions: actionTypes.map((type) => ({ type, label: type })),
  })

  it('returns required=true and chain for a transfer action', () => {
    const result = doesWarpRequireWallet(makeWarp(['transfer'], WarpChainName.Multiversx))
    expect(result).toEqual({ required: true, chain: WarpChainName.Multiversx })
  })

  it('returns required=true and chain for a contract action', () => {
    const result = doesWarpRequireWallet(makeWarp(['contract'], WarpChainName.Ethereum))
    expect(result).toEqual({ required: true, chain: WarpChainName.Ethereum })
  })

  it('returns required=true when mixed with non-wallet actions', () => {
    const result = doesWarpRequireWallet(makeWarp(['query', 'transfer'], WarpChainName.Base))
    expect(result).toEqual({ required: true, chain: WarpChainName.Base })
  })

  it('returns required=false and chain=null for a query-only warp', () => {
    const result = doesWarpRequireWallet(makeWarp(['query']))
    expect(result).toEqual({ required: false, chain: null })
  })

  it('returns required=false and chain=null for a collect-only warp', () => {
    const result = doesWarpRequireWallet(makeWarp(['collect']))
    expect(result).toEqual({ required: false, chain: null })
  })

  it('returns required=false and chain=null for a link-only warp', () => {
    const result = doesWarpRequireWallet(makeWarp(['link']))
    expect(result).toEqual({ required: false, chain: null })
  })

  it('returns required=false and chain=null for an empty actions array', () => {
    const result = doesWarpRequireWallet(makeWarp([]))
    expect(result).toEqual({ required: false, chain: null })
  })

  it('returns chain=null when warp has no chain and requires wallet', () => {
    const result = doesWarpRequireWallet(makeWarp(['transfer']))
    expect(result).toEqual({ required: true, chain: null })
  })

  it('returns required=true for a collect action with source user:wallet input', () => {
    const warp: Warp = { ...makeWarp(['collect'], WarpChainName.Multiversx), actions: [{ type: 'collect', label: 'Collect', inputs: [{ name: 'Address', type: 'address', source: 'user:wallet', required: true }] }] }
    expect(doesWarpRequireWallet(warp)).toEqual({ required: true, chain: WarpChainName.Multiversx })
  })

  it('returns required=true for a collect action with {{USER_WALLET}} default', () => {
    const warp: Warp = { ...makeWarp(['collect'], WarpChainName.Multiversx), actions: [{ type: 'collect', label: 'Collect', inputs: [{ name: 'Address', type: 'address', source: 'field', default: '{{USER_WALLET}}', required: true }] }] }
    expect(doesWarpRequireWallet(warp)).toEqual({ required: true, chain: WarpChainName.Multiversx })
  })

  it('returns required=true for a query action with {{USER_WALLET_PUBLICKEY}} default', () => {
    const warp: Warp = { ...makeWarp(['query'], WarpChainName.Ethereum), actions: [{ type: 'query', label: 'Query', inputs: [{ name: 'Key', type: 'string', source: 'field', default: '{{USER_WALLET_PUBLICKEY}}' }] }] }
    expect(doesWarpRequireWallet(warp)).toEqual({ required: true, chain: WarpChainName.Ethereum })
  })

  it('returns required=false for a collect action with a regular field input', () => {
    const warp: Warp = { ...makeWarp(['collect']), actions: [{ type: 'collect', label: 'Collect', inputs: [{ name: 'Address', type: 'address', source: 'field', required: true }] }] }
    expect(doesWarpRequireWallet(warp)).toEqual({ required: false, chain: null })
  })
})

describe('evaluateWhenCondition', () => {
  it('should return true for truthy expressions', () => {
    expect(evaluateWhenCondition('true')).toBe(true)
    expect(evaluateWhenCondition('1 === 1')).toBe(true)
    expect(evaluateWhenCondition('"test" !== ""')).toBe(true)
    expect(evaluateWhenCondition('5 > 3')).toBe(true)
  })

  it('should return false for falsy expressions', () => {
    expect(evaluateWhenCondition('false')).toBe(false)
    expect(evaluateWhenCondition('1 === 2')).toBe(false)
    expect(evaluateWhenCondition('"" !== ""')).toBe(false)
    expect(evaluateWhenCondition('5 < 3')).toBe(false)
  })

  it('should handle string comparisons', () => {
    expect(evaluateWhenCondition("'test' === 'test'")).toBe(true)
    expect(evaluateWhenCondition("'test' !== 'other'")).toBe(true)
    expect(evaluateWhenCondition("'0x0000000000000000000000000000000000000000' !== '0x0000000000000000000000000000000000000000'")).toBe(
      false
    )
  })

  it('should handle complex expressions', () => {
    expect(evaluateWhenCondition('(1 + 1) === 2')).toBe(true)
    expect(evaluateWhenCondition('true && false')).toBe(false)
    expect(evaluateWhenCondition('true || false')).toBe(true)
  })

  it('should throw error for invalid expressions', () => {
    expect(() => evaluateWhenCondition('invalid syntax !!!')).toThrow()
    expect(() => evaluateWhenCondition('undefinedFunction()')).toThrow()
  })
})

describe('replacePlaceholders', () => {
  it('should replace simple string placeholders', () => {
    expect(replacePlaceholders('Hello {{name}}', { name: 'World' })).toBe('Hello World')
  })

  it('should replace multiple placeholders', () => {
    expect(replacePlaceholders('{{a}} and {{b}}', { a: 'foo', b: 'bar' })).toBe('foo and bar')
  })

  it('should return empty string for missing keys', () => {
    expect(replacePlaceholders('{{missing}}', {})).toBe('')
  })

  it('should return empty string for null values', () => {
    expect(replacePlaceholders('{{key}}', { key: null })).toBe('')
  })

  it('should return empty string for undefined values', () => {
    expect(replacePlaceholders('{{key}}', { key: undefined })).toBe('')
  })

  it('should preserve numeric zero values', () => {
    expect(replacePlaceholders('amount={{BALANCE}}', { BALANCE: 0 })).toBe('amount=0')
  })

  it('should preserve string zero values', () => {
    expect(replacePlaceholders('amount={{BALANCE}}', { BALANCE: '0' })).toBe('amount=0')
  })

  it('should preserve empty string values', () => {
    expect(replacePlaceholders('value={{EMPTY}}', { EMPTY: '' })).toBe('value=')
  })

  it('should preserve false boolean values', () => {
    expect(replacePlaceholders('flag={{FLAG}}', { FLAG: false })).toBe('flag=false')
  })

  it('should handle numeric values', () => {
    expect(replacePlaceholders('n={{NUM}}', { NUM: 42 })).toBe('n=42')
  })

  it('should leave text without placeholders unchanged', () => {
    expect(replacePlaceholders('no placeholders here', { key: 'value' })).toBe('no placeholders here')
  })

  it('should handle query string style placeholders', () => {
    expect(replacePlaceholders('id={{ID}}&amount={{AMOUNT}}', { ID: 'abc', AMOUNT: 0 })).toBe('id=abc&amount=0')
  })
})

