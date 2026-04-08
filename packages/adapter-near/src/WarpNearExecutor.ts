import {
  AdapterWarpExecutor,
  applyOutputToMessages,
  extractResolvedInputValues,
  getNextInfo,
  getProviderConfig,
  getWarpActionByIndex,
  getWarpWalletAddressFromConfig,
  WarpActionExecutionResult,
  WarpChainAssetValue,
  WarpChainInfo,
  WarpClientConfig,
  WarpExecutable,
  WarpQueryAction,
} from '@joai/warps'
import { WarpNearConstants } from './constants'
import { createNearAccount } from './near'
import { WarpNearOutput } from './WarpNearOutput'
import { WarpNearSerializer } from './WarpNearSerializer'

export class WarpNearExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpNearSerializer
  private readonly nearConfig: any
  private readonly output: WarpNearOutput

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpNearSerializer()
    const providerConfig = getProviderConfig(this.config, chain.name, this.config.env, this.chain.defaultApiUrl)

    this.nearConfig = {
      networkId: this.config.env === 'mainnet' ? 'mainnet' : this.config.env === 'testnet' ? 'testnet' : 'testnet',
      nodeUrl: providerConfig.url,
    }
    this.output = new WarpNearOutput(config, this.chain)
  }

  async createTransaction(executable: WarpExecutable): Promise<any> {
    const action = getWarpActionByIndex(executable.warp, executable.action)

    let tx: any | null = null
    if (action.type === 'transfer') {
      tx = await this.createTransferTransaction(executable)
    } else if (action.type === 'contract') {
      tx = await this.createContractCallTransaction(executable)
    } else if (action.type === 'query') {
      throw new Error('WarpNearExecutor: Invalid action type for createTransaction; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpNearExecutor: Invalid action type for createTransaction; Use executeCollect instead')
    }

    if (!tx) throw new Error(`WarpNearExecutor: Invalid action type (${action.type})`)

    return tx
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<any> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpNearExecutor: createTransfer - user address not set')
    if (!executable.destination) throw new Error('WarpNearExecutor: Destination address is required')

    if (executable.transfers && executable.transfers.length > 0) {
      return this.createTokenTransferTransaction(executable, userWallet)
    }

    const amount = executable.value > 0n ? executable.value : 0n
    const amountInYoctoNear = amount.toString()

    return {
      receiverId: executable.destination,
      actions: [
        {
          type: 'Transfer',
          params: {
            deposit: amountInYoctoNear,
          },
        },
      ],
    }
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<any> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpNearExecutor: createContractCall - user address not set')

    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (!action || !('func' in action) || !action.func) throw new Error('WarpNearExecutor: Contract action must have a function name')
    if (!executable.destination) throw new Error('WarpNearExecutor: Contract address is required')

    try {
      const nativeArgs = executable.args.map((arg) => this.serializer.coreSerializer.stringToNative(arg)[1])
      const args = nativeArgs.length > 0 ? nativeArgs : {}

      const gas = WarpNearConstants.Gas.FunctionCall
      const deposit = executable.value > 0n ? executable.value.toString() : '0'

      return {
        receiverId: executable.destination,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: action.func,
              args,
              gas,
              deposit,
            },
          },
        ],
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      throw new Error(`WarpNearExecutor: Failed to create contract call: ${errorMessage}`)
    }
  }

  private async createTokenTransferTransaction(executable: WarpExecutable, userWallet: string): Promise<any> {
    if (executable.transfers.length === 0) throw new Error('WarpNearExecutor: No transfers provided')
    if (!this.chain.nativeToken?.identifier) throw new Error('WarpNearExecutor: No native token defined for this chain')

    const nativeTokenTransfers = executable.transfers.filter(
      (transfer) =>
        transfer.identifier === this.chain.nativeToken!.identifier || transfer.identifier === WarpNearConstants.NativeToken.Identifier
    )
    const ftTokenTransfers = executable.transfers.filter(
      (transfer) =>
        transfer.identifier !== this.chain.nativeToken!.identifier && transfer.identifier !== WarpNearConstants.NativeToken.Identifier
    )

    if (nativeTokenTransfers.length === 1 && ftTokenTransfers.length === 0) {
      const transfer = nativeTokenTransfers[0]
      if (transfer.amount <= 0n) throw new Error('WarpNearExecutor: Native token transfer amount must be positive')

      return {
        receiverId: executable.destination,
        actions: [
          {
            type: 'Transfer',
            params: {
              deposit: transfer.amount.toString(),
            },
          },
        ],
      }
    }

    if (nativeTokenTransfers.length === 0 && ftTokenTransfers.length === 1) {
      return this.createSingleTokenTransfer(executable, ftTokenTransfers[0])
    }

    if (executable.transfers.length > 1) throw new Error('WarpNearExecutor: Multiple token transfers not yet supported')

    throw new Error('WarpNearExecutor: Invalid transfer configuration')
  }

  private async createSingleTokenTransfer(executable: WarpExecutable, transfer: WarpChainAssetValue): Promise<any> {
    if (!executable.destination) throw new Error('WarpNearExecutor: Destination address is required')

    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpNearExecutor: User wallet not set')

    const args = {
      receiver_id: executable.destination,
      amount: transfer.amount.toString(),
    }

    return {
      receiverId: transfer.identifier,
      actions: [
        {
          type: 'FunctionCall',
          params: {
            methodName: 'ft_transfer',
            args,
            gas: WarpNearConstants.Gas.FunctionCall,
            deposit: '1',
          },
        },
      ],
    }
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpActionExecutionResult> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpNearExecutor: Invalid action type for executeQuery: ${action.type}`)
    if (!action.func) throw new Error('WarpNearExecutor: Query action must have a function name')

    let queryAddress: string
    try {
      if (!executable.destination) throw new Error('WarpNearExecutor: Query address is required')
      queryAddress = executable.destination
    } catch {
      throw new Error(`WarpNearExecutor: Invalid address for query: ${executable.destination}`)
    }

    try {
      const nativeArgs = executable.args.map((arg) => this.serializer.coreSerializer.stringToNative(arg)[1])
      const args = nativeArgs.length > 0 ? nativeArgs : {}

      const account = createNearAccount(this.nearConfig, queryAddress)
      const result = await account.callFunction({
        contractId: queryAddress,
        methodName: action.func,
        args,
      })

      const { values, output } = await this.output.extractQueryOutput(
        executable.warp,
        Array.isArray(result) ? result : [result],
        executable.action,
        executable.resolvedInputs
      )

      const next = getNextInfo(this.config, [], executable.warp, executable.action, output)

      const destinationInput = executable.resolvedInputs.find((i) => i.input.position === 'receiver' || i.input.position === 'destination')
      const destination = destinationInput?.value || executable.destination

      const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
      return {
        status: 'success',
        warp: executable.warp,
        action: executable.action,
        user: getWarpWalletAddressFromConfig(this.config, executable.chain.name),
        txHash: null,
        tx: null,
        next,
        values,
        output: { ...output, _DATA: result },
        messages: applyOutputToMessages(executable.warp, output, this.config),
        destination,
        resolvedInputs,
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      const destinationInput = executable.resolvedInputs.find((i) => i.input.position === 'receiver' || i.input.position === 'destination')
      const destination = destinationInput?.value || executable.destination

      const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
      return {
        status: 'error',
        warp: executable.warp,
        action: executable.action,
        user: getWarpWalletAddressFromConfig(this.config, executable.chain.name),
        txHash: null,
        tx: null,
        next: null,
        values: { string: [], native: [], mapped: {} },
        output: { _DATA: errorMessage, _ERROR: errorMessage },
        messages: {},
        destination,
        resolvedInputs,
      }
    }
  }

  async createDeployTransaction(): Promise<never> {
    throw new Error('WarpNearExecutor: Contract deployment not supported')
  }

  async createUpgradeTransaction(): Promise<never> {
    throw new Error('WarpNearExecutor: Contract upgrade not supported')
  }
}
