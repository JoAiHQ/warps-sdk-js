import { ChainAdapterFactory } from '@joai/warps'
import { MultiversxAdapter } from './chains/multiversx'
import { ClawsAdapter } from './chains/claws'

export const getAllMultiversxAdapters = (): ChainAdapterFactory[] => [MultiversxAdapter, ClawsAdapter]
