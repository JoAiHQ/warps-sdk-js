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
import { ethers } from 'ethers'
import { WarpEvmConstants } from './constants'
import { WarpEvmOutput } from './WarpEvmOutput'
import { WarpEvmSerializer } from './WarpEvmSerializer'

export class WarpEvmExecutor implements AdapterWarpExecutor {
  private readonly serializer: WarpEvmSerializer
  private readonly provider: ethers.JsonRpcProvider
  private readonly output: WarpEvmOutput

  constructor(
    private readonly config: WarpClientConfig,
    private readonly chain: WarpChainInfo
  ) {
    this.serializer = new WarpEvmSerializer()
    const providerConfig = getProviderConfig(this.config, chain.name, this.config.env, this.chain.defaultApiUrl)
    const network = new ethers.Network(this.chain.name, parseInt(this.chain.chainId))
    this.provider = new ethers.JsonRpcProvider(providerConfig.url, network)
    this.output = new WarpEvmOutput(config, this.chain)
  }

  async createTransaction(executable: WarpExecutable): Promise<ethers.TransactionRequest> {
    const action = getWarpActionByIndex(executable.warp, executable.action)

    let tx: ethers.TransactionRequest | null = null
    if (action.type === 'transfer') {
      tx = await this.createTransferTransaction(executable)
    } else if (action.type === 'contract') {
      tx = await this.createContractCallTransaction(executable)
    } else if (action.type === 'query') {
      throw new Error('WarpEvmExecutor: Invalid action type for createTransaction; Use executeQuery instead')
    } else if (action.type === 'collect') {
      throw new Error('WarpEvmExecutor: Invalid action type for createTransaction; Use executeCollect instead')
    }

    if (!tx) throw new Error(`WarpEvmExecutor: Invalid action type (${action.type})`)

    return tx
  }

  async createTransferTransaction(executable: WarpExecutable): Promise<ethers.TransactionRequest> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpEvmExecutor: createTransfer - user address not set')

    if (!ethers.isAddress(executable.destination)) {
      throw new Error(`WarpEvmExecutor: Invalid destination address: ${executable.destination}`)
    }

    if (executable.transfers && executable.transfers.length > 0) {
      return this.createTokenTransferTransaction(executable, userWallet)
    }

    const tx: ethers.TransactionRequest = {
      to: executable.destination,
      value: executable.value,
      data: executable.data ? this.serializer.stringToTyped(executable.data) : '0x',
    }

    return this.estimateGasAndSetDefaults(tx, userWallet)
  }

  async createContractCallTransaction(executable: WarpExecutable): Promise<ethers.TransactionRequest> {
    const userWallet = getWarpWalletAddressFromConfig(this.config, executable.chain.name)
    if (!userWallet) throw new Error('WarpEvmExecutor: createContractCall - user address not set')

    const action = getWarpActionByIndex(executable.warp, executable.action)
    if (!action || !('func' in action) || !action.func) throw new Error('WarpEvmExecutor: Contract action must have a function name')
    if (!ethers.isAddress(executable.destination)) throw new Error(`WarpEvmExecutor: Invalid contract address: ${executable.destination}`)

    try {
      let iface: ethers.Interface
      try {
        iface = new ethers.Interface(JSON.parse(action.abi as string))
      } catch {
        iface = new ethers.Interface([action.abi as string])
      }

      const funcFragment = iface.getFunction(action.func)
      if (!funcFragment) throw new Error(`WarpEvmExecutor: Function ${action.func} not found in ABI`)
      const nativeArgs = this.prepareNativeArgs(executable.args, funcFragment)
      console.log('Native args:', nativeArgs)
      const encodedData = iface.encodeFunctionData(action.func, nativeArgs)
      const value = this.getPayableValue(executable, funcFragment)

      console.log('Encoded data:', encodedData)
      console.log('Value:', value)

      const tx: ethers.TransactionRequest = {
        to: executable.destination,
        value,
        data: encodedData,
      }

      return this.estimateGasAndSetDefaults(tx, userWallet)
    } catch (error) {
      throw new Error(`WarpEvmExecutor: Failed to encode function data for ${action.func}: ${error}`)
    }
  }

  private async createTokenTransferTransaction(executable: WarpExecutable, userWallet: string): Promise<ethers.TransactionRequest> {
    if (executable.transfers.length === 0) throw new Error('WarpEvmExecutor: No transfers provided')
    if (!this.chain.nativeToken?.identifier) throw new Error('WarpEvmExecutor: No native token defined for this chain')

    const nativeTokenTransfers = executable.transfers.filter((transfer) => transfer.identifier === this.chain.nativeToken!.identifier)
    const erc20Transfers = executable.transfers.filter((transfer) => transfer.identifier !== this.chain.nativeToken!.identifier)

    if (nativeTokenTransfers.length === 1 && erc20Transfers.length === 0) {
      const transfer = nativeTokenTransfers[0]

      if (transfer.amount <= 0n) throw new Error('WarpEvmExecutor: Native token transfer amount must be positive')

      const tx: ethers.TransactionRequest = {
        to: executable.destination,
        value: transfer.amount,
        data: '0x',
      }

      return this.estimateGasAndSetDefaults(tx, userWallet)
    }

    if (nativeTokenTransfers.length === 0 && erc20Transfers.length === 1) {
      return this.createSingleTokenTransfer(executable, erc20Transfers[0], userWallet)
    }

    if (executable.transfers.length > 1) throw new Error('WarpEvmExecutor: Multiple token transfers not yet supported')

    throw new Error('WarpEvmExecutor: Invalid transfer configuration')
  }

  private async createSingleTokenTransfer(
    executable: WarpExecutable,
    transfer: WarpChainAssetValue,
    userWallet: string
  ): Promise<ethers.TransactionRequest> {
    if (!ethers.isAddress(transfer.identifier)) {
      throw new Error(`WarpEvmExecutor: Invalid token address: ${transfer.identifier}`)
    }

    const transferInterface = new ethers.Interface(['function transfer(address to, uint256 amount) returns (bool)'])

    const encodedData = transferInterface.encodeFunctionData('transfer', [executable.destination, transfer.amount])

    const tx: ethers.TransactionRequest = {
      to: transfer.identifier,
      value: 0n,
      data: encodedData,
    }

    return this.estimateGasAndSetDefaults(tx, userWallet)
  }

  async executeQuery(executable: WarpExecutable): Promise<WarpActionExecutionResult> {
    const action = getWarpActionByIndex(executable.warp, executable.action) as WarpQueryAction
    if (action.type !== 'query') throw new Error(`WarpEvmExecutor: Invalid action type for executeQuery: ${action.type}`)
    if (!action.func) throw new Error('WarpEvmExecutor: Query action must have a function name')
    if (!ethers.isAddress(executable.destination)) throw new Error(`WarpEvmExecutor: Invalid address for query: ${executable.destination}`)

    try {
      let iface: ethers.Interface
      try {
        iface = new ethers.Interface(JSON.parse(action.abi as string))
      } catch {
        iface = new ethers.Interface([action.abi as string])
      }

      const funcFragment = iface.getFunction(action.func)
      if (!funcFragment) throw new Error(`WarpEvmExecutor: Function ${action.func} not found in ABI`)
      const nativeArgs = this.prepareNativeArgs(executable.args, funcFragment)
      const encodedData = iface.encodeFunctionData(action.func, nativeArgs)

      const result = await this.provider.call({
        to: executable.destination,
        data: encodedData,
      })

      const decodedResult = iface.decodeFunctionResult(action.func, result)
      const isSuccess = true

      const { values, output } = await this.output.extractQueryOutput(
        executable.warp,
        decodedResult,
        executable.action,
        executable.resolvedInputs
      )

      const next = getNextInfo(this.config, [], executable.warp, executable.action, output)

      const destinationInput = executable.resolvedInputs.find((i) => i.input.position === 'receiver' || i.input.position === 'destination')
      const destination = destinationInput?.value || executable.destination

      const resolvedInputs = extractResolvedInputValues(executable.resolvedInputs)
      return {
        status: isSuccess ? 'success' : 'error',
        warp: executable.warp,
        action: executable.action,
        user: getWarpWalletAddressFromConfig(this.config, executable.chain.name),
        txHash: null,
        tx: null,
        next,
        values,
        output: { ...output, _DATA: decodedResult },
        messages: applyOutputToMessages(executable.warp, output, this.config),
        destination,
        resolvedInputs,
      }
    } catch (error) {
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
        output: { _DATA: error },
        messages: {},
        destination,
        resolvedInputs,
      }
    }
  }

  private async estimateGasAndSetDefaults(tx: ethers.TransactionRequest, from: string): Promise<ethers.TransactionRequest> {
    try {
      const gasEstimate = await this.provider.estimateGas({
        ...tx,
        from,
      })

      if (gasEstimate < BigInt(WarpEvmConstants.Validation.MinGasLimit)) throw new Error(`Gas estimate too low: ${gasEstimate}`)
      if (gasEstimate > BigInt(WarpEvmConstants.Validation.MaxGasLimit)) throw new Error(`Gas estimate too high: ${gasEstimate}`)

      const feeData = await this.provider.getFeeData()

      // Handle both EIP-1559 and legacy gas pricing
      if (feeData.maxFeePerGas && feeData.maxPriorityFeePerGas) {
        // EIP-1559 pricing
        return {
          ...tx,
          chainId: parseInt(this.chain.chainId),
          gasLimit: gasEstimate,
          maxFeePerGas: feeData.maxFeePerGas,
          maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
        }
      } else if (feeData.gasPrice) {
        // Legacy pricing
        return {
          ...tx,
          chainId: parseInt(this.chain.chainId),
          gasLimit: gasEstimate,
          gasPrice: feeData.gasPrice,
        }
      } else {
        // Fallback to default values
        return {
          ...tx,
          chainId: parseInt(this.chain.chainId),
          gasLimit: gasEstimate,
          gasPrice: ethers.parseUnits(WarpEvmConstants.GasPrice.Default, 'wei'),
        }
      }
    } catch (error) {
      // If gas estimation fails, use default values based on transaction type
      let defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.Default)

      // Determine gas limit based on transaction type
      if (tx.data && tx.data !== '0x') {
        // Check if this is a token transfer by looking for ERC-20 transfer function signature
        if (tx.data.startsWith('0xa9059cbb')) {
          // transfer(address,uint256) function signature
          defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.TokenTransfer)
        } else {
          defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.ContractCall)
        }
      } else {
        defaultGasLimit = BigInt(WarpEvmConstants.GasLimit.Transfer)
      }

      return {
        ...tx,
        chainId: parseInt(this.chain.chainId),
        gasLimit: defaultGasLimit,
        gasPrice: ethers.parseUnits(WarpEvmConstants.GasPrice.Default, 'wei'),
      }
    }
  }

  async verifyMessage(message: string, signature: string): Promise<string> {
    try {
      const recoveredAddress = ethers.verifyMessage(message, signature)
      return recoveredAddress
    } catch (error) {
      throw new Error(`Failed to verify message: ${error}`)
    }
  }

  private getPayableValue(executable: WarpExecutable, funcFragment: ethers.FunctionFragment): bigint {
    if (funcFragment.stateMutability !== 'payable') {
      return executable.value
    }

    const nativeTokenId = this.chain.nativeToken?.identifier
    const zeroAddress = '0x0000000000000000000000000000000000000000'

    const nativeTokenTransfer = nativeTokenId
      ? executable.transfers.find((transfer) => transfer.identifier === nativeTokenId || transfer.identifier === zeroAddress)
      : undefined
    if (nativeTokenTransfer) {
      return nativeTokenTransfer.amount
    }

    const nativeTokenAsset = this.findNativeTokenAsset(executable.resolvedInputs, nativeTokenId, zeroAddress)
    if (nativeTokenAsset) {
      return nativeTokenAsset.amount
    }

    return executable.value
  }

  private findNativeTokenAsset(resolvedInputs: any[], nativeTokenId: string | undefined, zeroAddress: string): WarpChainAssetValue | null {
    for (const input of resolvedInputs) {
      if (input.input.type === 'asset' && input.value) {
        const [, assetValue] = this.serializer.coreSerializer.stringToNative(input.value)
        const asset = assetValue as WarpChainAssetValue
        if (asset && 'amount' in asset) {
          if (asset.identifier === nativeTokenId || asset.identifier === zeroAddress) {
            return asset
          }
        }
      }
    }
    return null
  }

  private prepareNativeArgs(args: string[], funcFragment: ethers.FunctionFragment): any[] {
    return args.map((arg, index) => {
      const nativeValue = this.serializer.coreSerializer.stringToNative(arg)[1]
      const paramType = funcFragment.inputs[index]?.type
      if (paramType === 'bytes32' && typeof nativeValue === 'string') {
        let hexValue = nativeValue
        if (!hexValue.startsWith('0x')) {
          hexValue = '0x' + hexValue
        }
        if (hexValue.length !== 66) {
          hexValue = ethers.zeroPadValue(hexValue, 32)
        }
        return hexValue
      }
      return nativeValue
    })
  }

  async createDeployTransaction(): Promise<never> {
    throw new Error('WarpEvmExecutor: Contract deployment not supported')
  }

  async createUpgradeTransaction(): Promise<never> {
    throw new Error('WarpEvmExecutor: Contract upgrade not supported')
  }
}
