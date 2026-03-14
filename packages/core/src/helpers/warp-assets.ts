import { WarpChainName } from '../constants'
import { ChainAdapter, Warp, WarpChainInfo, WarpContractAction, WarpTransferAction } from '../types'
import { findWarpAdapterForChain, getWarpPrimaryAction } from './general'

export const getRequiredAssetIds = (warp: Warp, chainInfo: WarpChainInfo): string[] => {
  let primaryAction: ReturnType<typeof getWarpPrimaryAction> | null = null
  try {
    primaryAction = getWarpPrimaryAction(warp)
  } catch {
    return []
  }

  const action = primaryAction?.action as WarpTransferAction | WarpContractAction | null
  if (!action || (action.type !== 'contract' && action.type !== 'transfer')) return []

  const inputs = action.inputs ?? []
  const hasAssetTransfer = inputs.some(
    (i) => i.position === 'value' || i.position === 'transfer' || i.type === 'asset'
  )

  if (!hasAssetTransfer) return []

  return [chainInfo.nativeToken.identifier]
}

export const checkWarpAssetBalance = async (
  warp: Warp,
  walletAddress: string,
  walletChain: WarpChainName,
  adapters: ChainAdapter[]
): Promise<boolean> => {
  try {
    const adapter = findWarpAdapterForChain(walletChain, adapters)
    const requiredIds = getRequiredAssetIds(warp, adapter.chainInfo)
    if (!requiredIds.length) return true

    const assets = await adapter.dataLoader.getAccountAssets(walletAddress)
    const balances = new Map(assets.map((a) => [a.identifier, a.amount ?? 0n]))

    return requiredIds.every((id) => (balances.get(id) ?? 0n) > 0n)
  } catch {
    return true
  }
}
