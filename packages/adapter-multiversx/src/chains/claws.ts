import { WarpChainAsset, WarpChainInfo, WarpChainName } from '@joai/warps'
import { createMultiversxAdapter } from './common'

export const NativeTokenClaw: WarpChainAsset = {
  chain: WarpChainName.Claws,
  identifier: 'CLAW',
  name: 'Claws',
  symbol: 'CLAW',
  decimals: 18,
  logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/tokens/logos/claw.svg',
}

const chainInfo: WarpChainInfo = {
  name: WarpChainName.Claws,
  displayName: 'Claws Network',
  chainId: 'C',
  blockTime: 600,
  addressHrp: 'claw',
  defaultApiUrl: 'https://api.claws.network',
  logoUrl: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/claws.png',
  nativeToken: NativeTokenClaw,
  minGasPrice: 20000000000000n,
}

export const ClawsAdapter = createMultiversxAdapter(WarpChainName.Claws, {
  mainnet: chainInfo,
  testnet: chainInfo,
  devnet: chainInfo,
})
