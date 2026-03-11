import { WarpChainName } from '../constants'
import { WarpClientConfig, WarpUserWallets, WarpWalletDetails } from '../types'

export const getWalletFromConfigOrFail = (config: WarpClientConfig, chain: WarpChainName): string | WarpWalletDetails => {
  const wallet = config.user?.wallets?.[chain] || null
  if (!wallet) throw new Error(`No wallet configured for chain ${chain}`)
  return wallet
}

export const getWarpWalletAddress = (wallet: WarpWalletDetails | string | null | undefined) => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.address
}

export const getWarpWalletAddressFromConfig = (config: WarpClientConfig, chain: WarpChainName) =>
  getWarpWalletAddress(config.user?.wallets?.[chain] || null)

export const getWarpWalletPrivateKey = (wallet: WarpWalletDetails | string | null | undefined): string | null => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.privateKey || null
}

export const getWarpWalletMnemonic = (wallet: WarpWalletDetails | string | null | undefined): string | null => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.mnemonic || null
}

export const getWarpWalletExternalId = (wallet: WarpWalletDetails | string | null | undefined): string | null => {
  if (!wallet) return null
  if (typeof wallet === 'string') return wallet
  return wallet.externalId || null
}

export const getWarpWalletPrivateKeyFromConfig = (config: WarpClientConfig, chain: WarpChainName) =>
  getWarpWalletPrivateKey(config.user?.wallets?.[chain] || null)?.trim() || null

export const getWarpWalletMnemonicFromConfig = (config: WarpClientConfig, chain: WarpChainName) =>
  getWarpWalletMnemonic(config.user?.wallets?.[chain] || null)?.trim() || null

export const getWarpWalletExternalIdFromConfig = (config: WarpClientConfig, chain: WarpChainName) =>
  getWarpWalletExternalId(config.user?.wallets?.[chain] || null)?.trim() || null

export const getWarpWalletExternalIdFromConfigOrFail = (config: WarpClientConfig, chain: WarpChainName) => {
  const externalId = getWarpWalletExternalIdFromConfig(config, chain)
  if (!externalId) throw new Error(`No external ID configured for wallet onchain ${chain}`)
  return externalId
}

export const isWarpWalletReadOnly = (wallet: WarpWalletDetails | string | null | undefined): boolean => {
  return typeof wallet === 'string'
}

export const setWarpWalletInConfig = (config: WarpClientConfig, chain: WarpChainName, wallet: WarpWalletDetails): void => {
  if (!config.user) {
    config.user = {}
  }
  if (!config.user.wallets) {
    config.user.wallets = {} as WarpUserWallets
  }
  config.user.wallets[chain] = wallet
}

export const removeWarpWalletFromConfig = (config: WarpClientConfig, chain: WarpChainName): void => {
  if (config.user?.wallets) {
    delete config.user.wallets[chain]
  }
}

export const normalizeMnemonic = (mnemonic: string | undefined | null): string => {
  if (!mnemonic) throw new Error('Mnemonic is required')
  return typeof mnemonic === 'string' ? mnemonic.trim() : String(mnemonic).trim()
}

export const validateMnemonicLength = (mnemonic: string, expectedWords: number = 24): void => {
  const words = mnemonic.split(/\s+/).filter((w) => w.length > 0)
  if (words.length !== expectedWords) {
    throw new Error(`Mnemonic must be ${expectedWords} words. Got ${words.length} words`)
  }
}

export const normalizeAndValidateMnemonic = (mnemonic: string, expectedWords: number = 24): string => {
  const normalized = normalizeMnemonic(mnemonic)
  validateMnemonicLength(normalized, expectedWords)
  return normalized
}
