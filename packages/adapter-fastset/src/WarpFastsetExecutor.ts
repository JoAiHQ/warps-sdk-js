import {
  AdapterWarpExecutor,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  WarpAdapterGenericTransaction,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
} from '@joai/warps'
import { getConfiguredFastsetClient, hexToUint8Array } from './helpers'
import { FastsetClient } from './sdk'

export class WarpFastsetExecutor implements AdapterWarpExecutor {
  private readonly client: FastsetClient

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.client = getConfiguredFastsetClient(this.config, this.chain)
  }

  async createTransaction(executable: WarpExecutable): Promise<any> {
    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (action.type === 'transfer') return this.createTransferTransaction(executable)
    if (action.type === 'contract') return this.createContractCallTransaction(executable)
    if (action.type === 'query') throw new Error('WarpFastsetExecutor: Invalid action type for createTransaction; Use executeQuery instead')
    if (action.type === 'collect')
      throw new Error('WarpFastsetExecutor: Invalid action type for createTransaction; Use executeCollect instead')
    throw new Error(`WarpFastsetExecutor: Invalid action type (${action.type})`)
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<WarpAdapterGenericTransaction> {
    if (!executable.destination) throw new Error('WarpFastsetExecutor: createTransfer - destination not set')
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpFastsetExecutor: createTransfer - user address not set')
    const senderPubKey = FastsetClient.decodeBech32Address(userWallet)
    const recipientPubKey = FastsetClient.decodeBech32Address(executable.destination)
    const nonce = await this.client.getNextNonce(userWallet)

    const isSingleNativeTransfer =
      executable.transfers.length === 1 && executable.transfers[0].identifier === this.chain.nativeToken?.identifier

    const nativeAmountInTransfers = isSingleNativeTransfer ? executable.transfers[0].amount : 0n
    const nativeAmountTotal = nativeAmountInTransfers + executable.value

    if (nativeAmountTotal > 0n) {
      return {
        sender: senderPubKey,
        recipient: { FastSet: recipientPubKey },
        nonce,
        timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
        claim: { Transfer: { amount: nativeAmountTotal.toString(16), user_data: null } },
      }
    } else if (executable.transfers.length === 1) {
      return {
        sender: senderPubKey,
        recipient: { FastSet: recipientPubKey },
        nonce,
        timestamp_nanos: BigInt(Date.now()) * 1_000_000n,
        claim: {
          TokenTransfer: {
            token_id: hexToUint8Array(executable.transfers[0].identifier),
            amount: executable.transfers[0].amount.toString(16),
            user_data: null,
          },
        },
      }
    } else {
      throw new Error('WarpFastsetExecutor: No valid transfers provided (maximum 1 transfer allowed)')
    }
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<any> {
    throw new Error('WarpFastsetExecutor: Not implemented')
  }

  async executeQuery(executable: WarpExecutable): Promise<any> {
    throw new Error('WarpFastsetExecutor: Not implemented')
  }

  async createDeployTransaction(): Promise<never> {
    throw new Error('WarpFastsetExecutor: Contract deployment not supported')
  }

  async createUpgradeTransaction(): Promise<never> {
    throw new Error('WarpFastsetExecutor: Contract upgrade not supported')
  }
}
