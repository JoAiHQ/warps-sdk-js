import { WarpChainName } from '../constants'
import { Warp, WarpAction, WarpActionType, WarpMeta } from '../types'
import { evaluateWhenCondition, getWarpPrimaryAction, isWarpActionAutoExecute } from './general'

describe('getWarpPrimaryAction', () => {
  const createMockWarp = (actions: WarpAction[], meta?: Partial<WarpMeta>): Warp => ({
    protocol: 'warp:1.0.0',
    chain: WarpChainName.Ethereum,
    name: 'test-warp',
    title: 'Test Warp',
    description: 'Test description',
    actions,
    meta: meta as WarpMeta | undefined,
  })

  const createMockAction = (type: WarpActionType, primary?: boolean, label = 'Test Action'): WarpAction => ({
    type,
    label,
    primary,
  })

  describe('when an action has primary: true', () => {
    it('should return the action with primary: true and correct index', () => {
      const primaryAction = createMockAction('transfer', true, 'Primary Transfer')
      const secondaryAction = createMockAction('contract', false, 'Secondary Contract')
      const warp = createMockWarp([secondaryAction, primaryAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(primaryAction)
      expect(result.action.label).toBe('Primary Transfer')
      expect(result.index).toBe(1) // primaryAction is at index 1
    })

    it('should return the first action with primary: true when multiple exist', () => {
      const firstPrimary = createMockAction('transfer', true, 'First Primary')
      const secondPrimary = createMockAction('contract', true, 'Second Primary')
      const warp = createMockWarp([firstPrimary, secondPrimary])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(firstPrimary)
      expect(result.action.label).toBe('First Primary')
      expect(result.index).toBe(0) // firstPrimary is at index 0
    })
  })

  describe('when no action has primary: true', () => {
    it('should return the first detectable action when mixed with non-detectable types', () => {
      const linkAction = createMockAction('link', false, 'Link Action')
      const transferAction = createMockAction('transfer', false, 'Transfer Action')
      const contractAction = createMockAction('contract', false, 'Contract Action')
      const warp = createMockWarp([linkAction, transferAction, contractAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(transferAction)
      expect(result.action.label).toBe('Transfer Action')
      expect(result.index).toBe(1) // transferAction is at index 1
    })

    it('should return the first detectable action when multiple detectable actions exist', () => {
      const transferAction = createMockAction('transfer', false, 'Transfer Action')
      const queryAction = createMockAction('query', false, 'Query Action')
      const warp = createMockWarp([transferAction, queryAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(transferAction)
      expect(result.action.label).toBe('Transfer Action')
      expect(result.index).toBe(0) // transferAction is at index 0
    })

    it('should return the first detectable action (transfer before collect)', () => {
      const transferAction = createMockAction('transfer', false, 'Transfer Action')
      const collectAction = createMockAction('collect', false, 'Collect Action')
      const warp = createMockWarp([transferAction, collectAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(transferAction)
      expect(result.action.label).toBe('Transfer Action')
      expect(result.index).toBe(0) // transferAction is at index 0
    })

    it('should return the first detectable action when mixed with multiple non-detectable types', () => {
      const linkAction1 = createMockAction('link', false, 'Link Action 1')
      const transferAction = createMockAction('transfer', false, 'Transfer Action')
      const linkAction2 = createMockAction('link', false, 'Link Action 2')
      const contractAction = createMockAction('contract', false, 'Contract Action')
      const warp = createMockWarp([linkAction1, transferAction, linkAction2, contractAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(transferAction)
      expect(result.action.label).toBe('Transfer Action')
      expect(result.index).toBe(1) // transferAction is at index 1
    })
  })

  describe('when only non-detectable actions exist', () => {
    it('should return the first link action when only link actions exist', () => {
      const linkAction = createMockAction('link', false, 'Single Link')
      const warp = createMockWarp([linkAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(linkAction)
      expect(result.action.label).toBe('Single Link')
      expect(result.index).toBe(0)
    })

    it('should return the first link action when multiple link actions exist', () => {
      const linkAction1 = createMockAction('link', false, 'Link Action 1')
      const linkAction2 = createMockAction('link', false, 'Link Action 2')
      const warp = createMockWarp([linkAction1, linkAction2])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(linkAction1)
      expect(result.action.label).toBe('Link Action 1')
      expect(result.index).toBe(0)
    })

    it('should return the link marked as primary when multiple link actions exist', () => {
      const linkAction1 = createMockAction('link', false, 'Link Action 1')
      const linkAction2 = createMockAction('link', true, 'Primary Link Action')
      const warp = createMockWarp([linkAction1, linkAction2])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(linkAction2)
      expect(result.action.label).toBe('Primary Link Action')
      expect(result.index).toBe(1)
    })
  })

  describe('when no actions exist', () => {
    it('should throw an error when actions array is empty', () => {
      const warp = createMockWarp([], { identifier: 'empty-hash' })

      expect(() => getWarpPrimaryAction(warp)).toThrow('Warp has no primary action: empty-hash')
    })

    it('should throw an error without hash when meta is undefined', () => {
      const warp = createMockWarp([])

      expect(() => getWarpPrimaryAction(warp)).toThrow('Warp has no primary action: undefined')
    })
  })

  describe('edge cases', () => {
    it('should handle single detectable action', () => {
      const transferAction = createMockAction('transfer', false, 'Single Transfer')
      const warp = createMockWarp([transferAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(transferAction)
      expect(result.action.label).toBe('Single Transfer')
      expect(result.index).toBe(0) // single action at index 0
    })

    it('should handle single primary action', () => {
      const primaryAction = createMockAction('link', true, 'Primary Link')
      const warp = createMockWarp([primaryAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(primaryAction)
      expect(result.action.label).toBe('Primary Link')
      expect(result.index).toBe(0) // single action at index 0
    })

    it('should prioritize primary flag over detectable types', () => {
      const detectableAction = createMockAction('transfer', false, 'Detectable Transfer')
      const primaryLinkAction = createMockAction('link', true, 'Primary Link')
      const warp = createMockWarp([detectableAction, primaryLinkAction])

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(primaryLinkAction)
      expect(result.action.label).toBe('Primary Link')
      expect(result.index).toBe(1) // primaryLinkAction is at index 1
    })

    it('should not modify the original actions array when finding first detectable action', () => {
      const linkAction = createMockAction('link', false, 'Link Action')
      const transferAction = createMockAction('transfer', false, 'Transfer Action')
      const contractAction = createMockAction('contract', false, 'Contract Action')
      const originalActions = [linkAction, transferAction, contractAction]
      const warp = createMockWarp(originalActions)

      const result = getWarpPrimaryAction(warp)

      expect(result.action).toBe(transferAction)
      expect(result.index).toBe(1) // transferAction is at index 1
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

  const createMockAction = (type: WarpActionType, auto?: boolean, primary?: boolean, label = 'Test Action'): WarpAction => ({
    type,
    label,
    auto,
    primary,
  })

  describe('when action.auto is explicitly false', () => {
    it('should return false regardless of action type', () => {
      const transferAction = createMockAction('transfer', false)
      const linkAction = createMockAction('link', false)
      const warp = createMockWarp([transferAction, linkAction])

      expect(isWarpActionAutoExecute(transferAction, warp)).toBe(false)
      expect(isWarpActionAutoExecute(linkAction, warp)).toBe(false)
    })
  })

  describe('when action type is link', () => {
    it('should return true if link is the primary action', () => {
      const linkAction = createMockAction('link', undefined, true, 'Primary Link')
      const transferAction = createMockAction('transfer', undefined, false, 'Transfer')
      const warp = createMockWarp([transferAction, linkAction])

      expect(isWarpActionAutoExecute(linkAction, warp)).toBe(true)
    })

    it('should return true if link has auto: true', () => {
      const linkAction = createMockAction('link', true, false, 'Auto Link')
      const transferAction = createMockAction('transfer', undefined, false, 'Transfer')
      const warp = createMockWarp([linkAction, transferAction])

      expect(isWarpActionAutoExecute(linkAction, warp)).toBe(true)
    })

    it('should return false if link is not primary and auto is not true', () => {
      const linkAction1 = createMockAction('link', undefined, false, 'Non-Primary Link')
      const transferAction = createMockAction('transfer', undefined, false, 'Transfer')
      const linkAction2 = createMockAction('link', undefined, false, 'Primary Link')
      const warp = createMockWarp([linkAction1, transferAction, linkAction2])

      expect(isWarpActionAutoExecute(linkAction1, warp)).toBe(false)
    })

    it('should return true if link is primary even when auto is undefined', () => {
      const linkAction = createMockAction('link', undefined, true, 'Primary Link')
      const warp = createMockWarp([linkAction])

      expect(isWarpActionAutoExecute(linkAction, warp)).toBe(true)
    })
  })

  describe('when action type is not link', () => {
    it('should return true for transfer actions', () => {
      const transferAction = createMockAction('transfer', undefined, false, 'Transfer')
      const warp = createMockWarp([transferAction])

      expect(isWarpActionAutoExecute(transferAction, warp)).toBe(true)
    })

    it('should return true for contract actions', () => {
      const contractAction = createMockAction('contract', undefined, false, 'Contract')
      const warp = createMockWarp([contractAction])

      expect(isWarpActionAutoExecute(contractAction, warp)).toBe(true)
    })

    it('should return true for query actions', () => {
      const queryAction = createMockAction('query', undefined, false, 'Query')
      const warp = createMockWarp([queryAction])

      expect(isWarpActionAutoExecute(queryAction, warp)).toBe(true)
    })

    it('should return true for collect actions', () => {
      const collectAction = createMockAction('collect', undefined, false, 'Collect')
      const warp = createMockWarp([collectAction])

      expect(isWarpActionAutoExecute(collectAction, warp)).toBe(true)
    })
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
