import {
  ChainAdapter,
  WarpChainInfo,
  WarpChainName,
  WarpClientConfig,
  WarpContractAction,
  WarpExecutable,
  WarpTransferAction,
} from '@joai/warps'
import { ethers } from 'ethers'
import { BaseAdapter, NativeTokenBase } from './chains/base'
import { EthereumAdapter, NativeTokenEth } from './chains/ethereum'
import { WarpEvmExecutor } from './WarpEvmExecutor'
import { WarpEvmWallet } from './WarpEvmWallet'

const mockFallbackAdapter = {
  chainInfo: {} as WarpChainInfo,
  builder: () => ({}) as any,
  executor: {} as any,
  output: {} as any,
  serializer: {} as any,
  registry: {} as any,
  explorer: {} as any,
  abiBuilder: () => ({}) as any,
  brandBuilder: () => ({}) as any,
  dataLoader: {} as any,
  wallet: {} as any,
} as ChainAdapter

jest.unmock('@scure/bip39')

describe('WarpEvmIntegration', () => {
  const privateKey = '0x1234567890123456789012345678901234567890123456789012345678901234'
  const testAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
  const receiverAddress = '0x1234567890123456789012345678901234567890'
  const tokenAddress = '0xdAC17F958D2ee523a2206206994597C13D831ec7'

  let mockProvider: any
  let mockConfig: WarpClientConfig

  const createMockProvider = () => ({
    estimateGas: jest.fn().mockResolvedValue(BigInt(21000)),
    getFeeData: jest.fn().mockResolvedValue({
      maxFeePerGas: ethers.parseUnits('20', 'gwei'),
      maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
    }),
    getTransactionCount: jest.fn().mockResolvedValue(0),
    call: jest.fn().mockResolvedValue('0x0000000000000000000000000000000000000000000000000000000000000001'),
    broadcastTransaction: jest.fn().mockResolvedValue({ hash: '0xtesthash' }),
  })

  beforeEach(() => {
    mockProvider = createMockProvider()
    jest.spyOn(ethers, 'JsonRpcProvider').mockImplementation(() => mockProvider as any)
    jest.spyOn(ethers, 'isAddress').mockImplementation((addr: unknown) => {
      if (typeof addr === 'string' && addr.startsWith('0x') && addr.length === 42) {
        try {
          ethers.getAddress(addr)
          return true
        } catch {
          return false
        }
      }
      return false
    })
    jest.spyOn(ethers, 'isHexString').mockImplementation((hex: unknown) => typeof hex === 'string' && hex.startsWith('0x'))
    jest.spyOn(ethers, 'getAddress').mockImplementation((addr: unknown) => {
      if (typeof addr === 'string') {
        try {
          return ethers.getAddress(addr)
        } catch {
          return addr.toLowerCase() as any
        }
      }
      return addr as any
    })

    mockConfig = {
      env: 'testnet',
      user: {
        wallets: {
          ethereum: {
            provider: 'privateKey',
            address: testAddress,
            privateKey,
          },
          base: {
            provider: 'privateKey',
            address: testAddress,
            privateKey,
          },
        },
      },
    } as WarpClientConfig
  })

  describe('Sepolia (Ethereum Testnet)', () => {
    let chainInfo: WarpChainInfo
    let executor: WarpEvmExecutor
    let wallet: WarpEvmWallet
    let evmAdapter: ChainAdapter

    beforeEach(() => {
      evmAdapter = EthereumAdapter(mockConfig, mockFallbackAdapter)
      chainInfo = {
        name: WarpChainName.Ethereum,
        displayName: 'Ethereum Sepolia',
        chainId: '11155111',
        blockTime: 12000,
        addressHrp: '0x',
        defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
        logoUrl: {
          light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-white.svg',
          dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-black.svg',
        },
        nativeToken: NativeTokenEth,
      }
      executor = new WarpEvmExecutor(mockConfig, chainInfo)
      wallet = new WarpEvmWallet(mockConfig, chainInfo)
    })

    describe('Native ETH Transfers', () => {
      it('should create native ETH transfer transaction', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer ETH',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: ethers.parseEther('1.0'),
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)

        expect(tx.to).toBe(receiverAddress)
        expect(tx.value).toBe(ethers.parseEther('1.0'))
        expect(tx.data).toBe('0x')
        expect(tx.chainId).toBe(11155111)
        expect(tx.gasLimit).toBeDefined()
        expect(tx.maxFeePerGas).toBeDefined()
      })

      it('should sign native ETH transfer transaction', async () => {
        const tx = {
          to: receiverAddress,
          value: ethers.parseEther('0.5'),
          data: '0x',
          gasLimit: 21000n,
          maxFeePerGas: ethers.parseUnits('20', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
          nonce: 0,
          chainId: 11155111,
        }

        const signedTx = await wallet.signTransaction(tx)
        expect(signedTx).toBeDefined()
        expect(signedTx.signature).toBeDefined()
        expect(typeof signedTx.signature).toBe('string')
      })

      it('should handle small native ETH transfer amounts', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer Small Amount',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: ethers.parseEther('0.001'),
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)
        expect(tx.value).toBe(ethers.parseEther('0.001'))
      })

      it('should handle large native ETH transfer amounts', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer Large Amount',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: ethers.parseEther('1000'),
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)
        expect(tx.value).toBe(ethers.parseEther('1000'))
      })
    })

    describe('ERC-20 Token Transfers', () => {
      it('should create ERC-20 token transfer transaction', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer Token',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: 0n,
          data: null,
          args: [],
          transfers: [
            {
              identifier: tokenAddress,
              amount: ethers.parseUnits('100', 18),
            },
          ],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)

        expect(tx.to).toBe(tokenAddress)
        expect(tx.value).toBe(0n)
        expect(tx.data).toBeDefined()
        expect(tx.data).not.toBe('0x')
        expect(tx.chainId).toBe(11155111)
      })

      it('should sign ERC-20 token transfer transaction', async () => {
        const transferInterface = new ethers.Interface(['function transfer(address to, uint256 amount) returns (bool)'])
        const encodedData = transferInterface.encodeFunctionData('transfer', [receiverAddress, ethers.parseUnits('50', 18)])

        const tx = {
          to: tokenAddress,
          value: 0n,
          data: encodedData,
          gasLimit: 65000n,
          maxFeePerGas: ethers.parseUnits('20', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
          nonce: 0,
          chainId: 11155111,
        }

        wallet['provider'].resolveName = jest.fn().mockResolvedValue(null)
        const signedTx = await wallet.signTransaction(tx)
        expect(signedTx.signature).toBeDefined()
      })
    })

    describe('Smart Contract Calls', () => {
      const contractAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      const erc20Abi = [
        {
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          name: 'transfer',
          outputs: [{ type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ]

      it('should create nonpayable contract call transaction', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'contract',
                label: 'Transfer Token',
                func: 'transfer(address,uint256)',
                abi: JSON.stringify(erc20Abi),
              } as WarpContractAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: contractAddress,
          value: 0n,
          data: null,
          args: [`address:${receiverAddress}`, 'uint256:1000000000000000000'],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createContractCallTransaction(executable)

        expect(tx.to).toBe(contractAddress)
        expect(tx.value).toBe(0n)
        expect(tx.data).toBeDefined()
        expect(tx.data).not.toBe('0x')
        expect(tx.chainId).toBe(11155111)
        expect(tx.gasLimit).toBeDefined()
      })

      it('should create payable contract call transaction', async () => {
        const payableAbi = [
          {
            inputs: [],
            name: 'deposit',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
          },
        ]

        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'contract',
                label: 'Deposit ETH',
                func: 'deposit()',
                abi: JSON.stringify(payableAbi),
              } as WarpContractAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: contractAddress,
          value: ethers.parseEther('1.0'),
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createContractCallTransaction(executable)

        expect(tx.to).toBe(contractAddress)
        expect(tx.value).toBe(ethers.parseEther('1.0'))
        expect(tx.data).toBeDefined()
        expect(tx.chainId).toBe(11155111)
      })

      it('should execute view function query', async () => {
        mockProvider.call.mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000001')

        const checksummedAddress = ethers.getAddress(testAddress)
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'query',
                label: 'Get Balance',
                func: 'balanceOf(address)',
                abi: JSON.stringify(erc20Abi),
              } as any,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: contractAddress,
          value: 0n,
          data: null,
          args: [`address:${checksummedAddress}`],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const result = await executor.executeQuery(executable)

        expect(result.status).toBe('success')
        expect(result.output).toBeDefined()
        expect(result.values).toBeDefined()
      })

      it('should sign contract call transaction', async () => {
        const iface = new ethers.Interface(erc20Abi)
        const encodedData = iface.encodeFunctionData('transfer', [receiverAddress, ethers.parseUnits('100', 18)])

        const tx = {
          to: ethers.getAddress(contractAddress),
          value: 0n,
          data: encodedData,
          gasLimit: 100000n,
          maxFeePerGas: ethers.parseUnits('20', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
          nonce: 0,
          chainId: 11155111,
        }

        wallet['provider'].resolveName = jest.fn().mockResolvedValue(null)
        const signedTx = await wallet.signTransaction(tx)
        expect(signedTx.signature).toBeDefined()
      })
    })

    describe('Multiple Transactions', () => {
      it('should sign multiple transactions sequentially', async () => {
        const txs = [
          {
            to: receiverAddress,
            value: ethers.parseEther('0.1'),
            data: '0x',
            gasLimit: 21000n,
            maxFeePerGas: ethers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
            nonce: 0,
            chainId: 11155111,
          },
          {
            to: receiverAddress,
            value: ethers.parseEther('0.2'),
            data: '0x',
            gasLimit: 21000n,
            maxFeePerGas: ethers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
            nonce: 1,
            chainId: 11155111,
          },
        ]

        const signedTxs = await wallet.signTransactions(txs)

        expect(signedTxs).toHaveLength(2)
        expect(signedTxs[0].signature).toBeDefined()
        expect(signedTxs[1].signature).toBeDefined()
        expect(signedTxs[0].nonce).toBe(0)
        expect(signedTxs[1].nonce).toBe(1)
      })
    })
  })

  describe('Base Sepolia (Devnet)', () => {
    let chainInfo: WarpChainInfo
    let executor: WarpEvmExecutor
    let wallet: WarpEvmWallet
    let evmAdapter: ChainAdapter

    beforeEach(() => {
      evmAdapter = BaseAdapter(mockConfig, mockFallbackAdapter)
      chainInfo = {
        name: WarpChainName.Base,
        displayName: 'Base Sepolia',
        chainId: '84532',
        blockTime: 2000,
        addressHrp: '0x',
        defaultApiUrl: 'https://sepolia.base.org',
        logoUrl: {
          light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/base-white.svg',
          dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/base-black.svg',
        },
        nativeToken: NativeTokenBase,
      }
      executor = new WarpEvmExecutor({ ...mockConfig, env: 'devnet' }, chainInfo)
      wallet = new WarpEvmWallet({ ...mockConfig, env: 'devnet' }, chainInfo)
    })

    describe('Native ETH Transfers', () => {
      it('should create native ETH transfer transaction on Base', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer ETH on Base',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: ethers.parseEther('2.0'),
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)

        expect(tx.to).toBe(receiverAddress)
        expect(tx.value).toBe(ethers.parseEther('2.0'))
        expect(tx.chainId).toBe(84532)
        expect(tx.data).toBe('0x')
        expect(tx.gasLimit).toBeDefined()
        expect(tx.maxFeePerGas).toBeDefined()
      })

      it('should sign native ETH transfer transaction on Base', async () => {
        const tx = {
          to: receiverAddress,
          value: ethers.parseEther('1.5'),
          data: '0x',
          gasLimit: 21000n,
          maxFeePerGas: ethers.parseUnits('20', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
          nonce: 0,
          chainId: 84532,
        }

        const signedTx = await wallet.signTransaction(tx)
        expect(signedTx).toBeDefined()
        expect(signedTx.signature).toBeDefined()
        expect(signedTx.chainId).toBe(84532)
      })

      it('should handle small native ETH transfer amounts on Base', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer Small Amount on Base',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: ethers.parseEther('0.001'),
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)
        expect(tx.value).toBe(ethers.parseEther('0.001'))
        expect(tx.chainId).toBe(84532)
      })

      it('should handle large native ETH transfer amounts on Base', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer Large Amount on Base',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: ethers.parseEther('1000'),
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)
        expect(tx.value).toBe(ethers.parseEther('1000'))
        expect(tx.chainId).toBe(84532)
      })

      it('should handle zero value transfers on Base', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Zero Transfer on Base',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: 0n,
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)
        expect(tx.value).toBe(0n)
        expect(tx.chainId).toBe(84532)
      })
    })

    describe('ERC-20 Token Transfers', () => {
      it('should create ERC-20 token transfer transaction on Base', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer Token on Base',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: 0n,
          data: null,
          args: [],
          transfers: [
            {
              identifier: tokenAddress,
              amount: ethers.parseUnits('200', 18),
            },
          ],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)

        expect(tx.to).toBe(tokenAddress)
        expect(tx.chainId).toBe(84532)
        expect(tx.data).toBeDefined()
        expect(tx.data).not.toBe('0x')
        expect(tx.value).toBe(0n)
      })

      it('should sign ERC-20 token transfer transaction on Base', async () => {
        const transferInterface = new ethers.Interface(['function transfer(address to, uint256 amount) returns (bool)'])
        const encodedData = transferInterface.encodeFunctionData('transfer', [receiverAddress, ethers.parseUnits('50', 18)])

        const tx = {
          to: tokenAddress,
          value: 0n,
          data: encodedData,
          gasLimit: 65000n,
          maxFeePerGas: ethers.parseUnits('20', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
          nonce: 0,
          chainId: 84532,
        }

        wallet['provider'].resolveName = jest.fn().mockResolvedValue(null)
        const signedTx = await wallet.signTransaction(tx)
        expect(signedTx.signature).toBeDefined()
        expect(signedTx.chainId).toBe(84532)
      })

      it('should handle small ERC-20 token transfer amounts on Base', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer Small Token Amount on Base',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: 0n,
          data: null,
          args: [],
          transfers: [
            {
              identifier: tokenAddress,
              amount: ethers.parseUnits('0.001', 18),
            },
          ],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)
        expect(tx.to).toBe(tokenAddress)
        expect(tx.chainId).toBe(84532)
        expect(tx.data).toBeDefined()
      })

      it('should handle large ERC-20 token transfer amounts on Base', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer Large Token Amount on Base',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: 0n,
          data: null,
          args: [],
          transfers: [
            {
              identifier: tokenAddress,
              amount: ethers.parseUnits('1000000', 18),
            },
          ],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)
        expect(tx.to).toBe(tokenAddress)
        expect(tx.chainId).toBe(84532)
        expect(tx.data).toBeDefined()
      })
    })

    describe('Smart Contract Calls', () => {
      const contractAddress = '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6'
      const erc20Abi = [
        {
          inputs: [
            { name: 'to', type: 'address' },
            { name: 'amount', type: 'uint256' },
          ],
          name: 'transfer',
          outputs: [{ type: 'bool' }],
          stateMutability: 'nonpayable',
          type: 'function',
        },
        {
          inputs: [{ name: 'account', type: 'address' }],
          name: 'balanceOf',
          outputs: [{ type: 'uint256' }],
          stateMutability: 'view',
          type: 'function',
        },
      ]

      it('should create nonpayable contract call transaction on Base', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'contract',
                label: 'Contract Call on Base',
                func: 'transfer(address,uint256)',
                abi: JSON.stringify(erc20Abi),
              } as WarpContractAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: contractAddress,
          value: 0n,
          data: null,
          args: [`address:${receiverAddress}`, 'uint256:5000000000000000000'],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createContractCallTransaction(executable)

        expect(tx.to).toBe(contractAddress)
        expect(tx.chainId).toBe(84532)
        expect(tx.data).toBeDefined()
        expect(tx.data).not.toBe('0x')
        expect(tx.value).toBe(0n)
        expect(tx.gasLimit).toBeDefined()
      })

      it('should create payable contract call transaction on Base', async () => {
        const payableAbi = [
          {
            inputs: [],
            name: 'deposit',
            outputs: [],
            stateMutability: 'payable',
            type: 'function',
          },
        ]

        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'contract',
                label: 'Deposit ETH on Base',
                func: 'deposit()',
                abi: JSON.stringify(payableAbi),
              } as WarpContractAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: contractAddress,
          value: ethers.parseEther('1.0'),
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createContractCallTransaction(executable)

        expect(tx.to).toBe(contractAddress)
        expect(tx.value).toBe(ethers.parseEther('1.0'))
        expect(tx.data).toBeDefined()
        expect(tx.chainId).toBe(84532)
      })

      it('should sign contract call transaction on Base', async () => {
        const iface = new ethers.Interface(erc20Abi)
        const encodedData = iface.encodeFunctionData('transfer', [receiverAddress, ethers.parseUnits('100', 18)])

        const tx = {
          to: ethers.getAddress(contractAddress),
          value: 0n,
          data: encodedData,
          gasLimit: 100000n,
          maxFeePerGas: ethers.parseUnits('20', 'gwei'),
          maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
          nonce: 0,
          chainId: 84532,
        }

        wallet['provider'].resolveName = jest.fn().mockResolvedValue(null)
        const signedTx = await wallet.signTransaction(tx)
        expect(signedTx.signature).toBeDefined()
        expect(signedTx.chainId).toBe(84532)
      })

      it('should execute view function query on Base', async () => {
        mockProvider.call.mockResolvedValueOnce('0x0000000000000000000000000000000000000000000000000000000000000001')

        const checksummedAddress = ethers.getAddress(testAddress)
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'query',
                label: 'Get Balance on Base',
                func: 'balanceOf(address)',
                abi: JSON.stringify(erc20Abi),
              } as any,
            ],
            output: {},
          } as any,
          action: 1,
          chain: chainInfo,
          destination: contractAddress,
          value: 0n,
          data: null,
          args: [`address:${checksummedAddress}`],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const result = await executor.executeQuery(executable)

        expect(result.status).toBe('success')
        expect(result.output).toBeDefined()
        expect(result.values).toBeDefined()
      })

      it('should handle contract call with multiple arguments on Base', async () => {
        const multiArgAbi = [
          {
            inputs: [
              { name: 'to', type: 'address' },
              { name: 'amount', type: 'uint256' },
              { name: 'data', type: 'bytes' },
            ],
            name: 'transferAndCall',
            outputs: [{ type: 'bool' }],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ]

        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'contract',
                label: 'Transfer and Call on Base',
                func: 'transferAndCall(address,uint256,bytes)',
                abi: JSON.stringify(multiArgAbi),
              } as WarpContractAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: contractAddress,
          value: 0n,
          data: null,
          args: [`address:${receiverAddress}`, 'uint256:1000000000000000000', 'hex:0x1234'],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createContractCallTransaction(executable)

        expect(tx.to).toBe(contractAddress)
        expect(tx.chainId).toBe(84532)
        expect(tx.data).toBeDefined()
      })

      it('should handle contract call with bytes argument on Base', async () => {
        const bytesAbi = [
          {
            inputs: [{ name: 'data', type: 'bytes' }],
            name: 'processData',
            outputs: [],
            stateMutability: 'nonpayable',
            type: 'function',
          },
        ]

        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'contract',
                label: 'Process Data on Base',
                func: 'processData(bytes)',
                abi: JSON.stringify(bytesAbi),
              } as WarpContractAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: contractAddress,
          value: 0n,
          data: null,
          args: ['hex:0x1234567890abcdef'],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createContractCallTransaction(executable)

        expect(tx.to).toBe(contractAddress)
        expect(tx.chainId).toBe(84532)
        expect(tx.data).toBeDefined()
      })
    })

    describe('Multiple Transactions', () => {
      it('should sign multiple transactions sequentially on Base', async () => {
        const txs = [
          {
            to: receiverAddress,
            value: ethers.parseEther('0.1'),
            data: '0x',
            gasLimit: 21000n,
            maxFeePerGas: ethers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
            nonce: 0,
            chainId: 84532,
          },
          {
            to: receiverAddress,
            value: ethers.parseEther('0.2'),
            data: '0x',
            gasLimit: 21000n,
            maxFeePerGas: ethers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
            nonce: 1,
            chainId: 84532,
          },
          {
            to: receiverAddress,
            value: ethers.parseEther('0.3'),
            data: '0x',
            gasLimit: 21000n,
            maxFeePerGas: ethers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
            nonce: 2,
            chainId: 84532,
          },
        ]

        const signedTxs = await wallet.signTransactions(txs)

        expect(signedTxs).toHaveLength(3)
        expect(signedTxs[0].signature).toBeDefined()
        expect(signedTxs[1].signature).toBeDefined()
        expect(signedTxs[2].signature).toBeDefined()
        expect(signedTxs[0].nonce).toBe(0)
        expect(signedTxs[1].nonce).toBe(1)
        expect(signedTxs[2].nonce).toBe(2)
        expect(signedTxs[0].chainId).toBe(84532)
        expect(signedTxs[1].chainId).toBe(84532)
        expect(signedTxs[2].chainId).toBe(84532)
      })

      it('should handle mixed transaction types on Base', async () => {
        const transferInterface = new ethers.Interface(['function transfer(address to, uint256 amount) returns (bool)'])
        const encodedTokenTransfer = transferInterface.encodeFunctionData('transfer', [receiverAddress, ethers.parseUnits('50', 18)])

        const txs = [
          {
            to: receiverAddress,
            value: ethers.parseEther('0.1'),
            data: '0x',
            gasLimit: 21000n,
            maxFeePerGas: ethers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
            nonce: 0,
            chainId: 84532,
          },
          {
            to: tokenAddress,
            value: 0n,
            data: encodedTokenTransfer,
            gasLimit: 65000n,
            maxFeePerGas: ethers.parseUnits('20', 'gwei'),
            maxPriorityFeePerGas: ethers.parseUnits('1.5', 'gwei'),
            nonce: 1,
            chainId: 84532,
          },
        ]

        wallet['provider'].resolveName = jest.fn().mockResolvedValue(null)
        const signedTxs = await wallet.signTransactions(txs)

        expect(signedTxs).toHaveLength(2)
        expect(signedTxs[0].signature).toBeDefined()
        expect(signedTxs[1].signature).toBeDefined()
        expect(signedTxs[0].chainId).toBe(84532)
        expect(signedTxs[1].chainId).toBe(84532)
      })
    })

    describe('Edge Cases and Error Handling on Devnet', () => {
      it('should handle gas estimation failures gracefully on Base', async () => {
        mockProvider.estimateGas.mockRejectedValueOnce(new Error('Gas estimation failed'))

        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Transfer with Gas Failure on Base',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: receiverAddress,
          value: ethers.parseEther('1.0'),
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        const tx = await executor.createTransferTransaction(executable)
        expect(tx.gasLimit).toBeDefined()
        expect(tx.chainId).toBe(84532)
      })

      it('should handle invalid address gracefully on Base', async () => {
        const executable: WarpExecutable = {
          warp: {
            actions: [
              {
                type: 'transfer',
                label: 'Invalid Address Transfer on Base',
              } as WarpTransferAction,
            ],
          } as any,
          action: 1,
          chain: chainInfo,
          destination: '0xinvalid',
          value: ethers.parseEther('1.0'),
          data: null,
          args: [],
          transfers: [],
          resolvedInputs: [],
          adapter: evmAdapter,
        }

        await expect(executor.createTransferTransaction(executable)).rejects.toThrow()
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    let chainInfo: WarpChainInfo
    let executor: WarpEvmExecutor
    let evmAdapter: ChainAdapter

    beforeEach(() => {
      evmAdapter = EthereumAdapter(mockConfig, mockFallbackAdapter)
      chainInfo = {
        name: WarpChainName.Ethereum,
        displayName: 'Ethereum Sepolia',
        chainId: '11155111',
        blockTime: 12000,
        addressHrp: '0x',
        defaultApiUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
        logoUrl: {
          light: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-white.svg',
          dark: 'https://raw.githubusercontent.com/JoAiHQ/assets/refs/heads/main/chains/logos/ethereum-black.svg',
        },
        nativeToken: NativeTokenEth,
      }
      executor = new WarpEvmExecutor(mockConfig, chainInfo)
    })

    it('should handle zero value transfers', async () => {
      const executable: WarpExecutable = {
        warp: {
          actions: [
            {
              type: 'transfer',
              label: 'Zero Transfer',
            } as WarpTransferAction,
          ],
        } as any,
        action: 1,
        chain: chainInfo,
        destination: receiverAddress,
        value: 0n,
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
        adapter: evmAdapter,
      }

      const tx = await executor.createTransferTransaction(executable)
      expect(tx.value).toBe(0n)
    })

    it('should handle contract call with complex arguments', async () => {
      const complexAbi = [
        {
          inputs: [
            { name: 'recipients', type: 'address[]' },
            { name: 'amounts', type: 'uint256[]' },
          ],
          name: 'batchTransfer',
          outputs: [],
          stateMutability: 'nonpayable',
          type: 'function',
        },
      ]

      const executable: WarpExecutable = {
        warp: {
          actions: [
            {
              type: 'contract',
              label: 'Complex Contract Call',
              func: 'batchTransfer(address[],uint256[])',
              abi: JSON.stringify(complexAbi),
            } as WarpContractAction,
          ],
        } as any,
        action: 1,
        chain: chainInfo,
        destination: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4d8b6',
        value: 0n,
        data: null,
        args: [
          'address[]:["0x1234567890123456789012345678901234567890","0x0987654321098765432109876543210987654321"]',
          'uint256[]:[1000000000000000000,2000000000000000000]',
        ],
        transfers: [],
        resolvedInputs: [],
        adapter: evmAdapter,
      }

      await expect(executor.createContractCallTransaction(executable)).rejects.toThrow()
    })

    it('should handle gas estimation failures gracefully', async () => {
      mockProvider.estimateGas.mockRejectedValueOnce(new Error('Gas estimation failed'))

      const executable: WarpExecutable = {
        warp: {
          actions: [
            {
              type: 'transfer',
              label: 'Transfer with Gas Failure',
            } as WarpTransferAction,
          ],
        } as any,
        action: 1,
        chain: chainInfo,
        destination: receiverAddress,
        value: ethers.parseEther('1.0'),
        data: null,
        args: [],
        transfers: [],
        resolvedInputs: [],
        adapter: evmAdapter,
      }

      const tx = await executor.createTransferTransaction(executable)
      expect(tx.gasLimit).toBeDefined()
      expect(tx.chainId).toBe(11155111)
    })
  })
})
