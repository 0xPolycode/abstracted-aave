import { Injectable } from '@angular/core';
import { Observable, from, forkJoin } from 'rxjs';
import { map, mergeMap } from 'rxjs/operators';
import { Address, createPublicClient, http, PublicClient, getContract, formatUnits, parseAbi } from 'viem';
import { mcClient } from './blockchain.service';
import { mcUSDC, mcUSDT } from './tokens.constants';
import { arbitrum, avalanche, base, polygon } from 'viem/chains';
import { aaveV3PoolAbi } from '../../generated';

export interface YieldInfo {
  symbol: string;
  chainId: number;
  supplyYield: number;
  borrowYield: number;
  tokenAddress: Address;
  chainName: string;
  marketAddress: Address;
}

type YieldAggr = {
  bestSupplyYield: YieldInfo;
  bestBorrowYield: YieldInfo;
};

type MultichainTokenMapping = { chainId: number; address: Address }[];

export type ChainRpcInfo = {
  chainId: number;
  rpcUrl: string;
};

const ABI = aaveV3PoolAbi

type AaveV3PoolAddresses = { [chainId: number]: Address };
type ChainNames = { [chainId: number]: string };

export const aaveV3PoolAddresses: AaveV3PoolAddresses = {
  10: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  137: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  43114: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  8453: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
  534352: '0x11fCfe756c05AD438e312a7fd934381537D3cFfe'
};

@Injectable({
  providedIn: 'root'
})
export class AaveV3YieldService {
  private clients: Map<number, PublicClient> = new Map();

  private readonly chainNames: ChainNames = {
    1: 'Ethereum',
    137: 'Polygon',
  };


  constructor() {
    this.initializeClients();
  }

  private initializeClients(): void {
    mcClient.chainsRpcInfo.forEach(({ chainId, rpcUrl }: ChainRpcInfo) => {
      this.clients.set(chainId, createPublicClient({
        chain: {
          id: chainId,
          name: 'NA',
          nativeCurrency: {
            decimals: 18,
            name: 'NA',
            symbol: 'NA'
          },
          rpcUrls: {
            default: {
              http: [
                rpcUrl
              ]
            }
          }
        },
        transport: http(rpcUrl)
      }));
    });
  }

  public getBestYields(tokenMapping: MultichainTokenMapping): Observable<YieldAggr> {
    const observables: Observable<YieldInfo[]>[] = tokenMapping.map(
      (token: { chainId: number; address: Address }) => this.getYieldInfo(token.chainId, token.address)
    );
    return forkJoin(observables).pipe(
      map((results: YieldInfo[][]) => this.processBestYields(results.flat()))
    );
  }

  getBestYieldsForSymbol(symbol: 'USDC' | 'USDT'): Observable<YieldAggr> {
    if(symbol === 'USDC') { 
      return this.getBestYields(mcUSDC)
    } else {
      return this.getBestYields(mcUSDT)
    }
  }

  private getYieldInfo(chainId: number, tokenAddress: Address): Observable<YieldInfo[]> {
    const client: PublicClient | undefined = this.clients.get(chainId);
    if (!client) {
      console.warn(`No Viem client found for chain ID ${chainId}`);
      return from([]);
    }

    const poolAddress: Address | undefined = aaveV3PoolAddresses[chainId];
    if (!poolAddress) {
      console.warn(`No Aave V3 Pool address found for chain ID ${chainId}`);
      return from([]);
    }

    const poolContract = getContract({
      address: poolAddress,
      abi: ABI,
      client: client,
    });

    return from(poolContract.read['getReserveData']([tokenAddress])).pipe(
      mergeMap(async (reserveData: any) => {
        const {
          configuration,
          liquidityIndex,
          currentLiquidityRate,
          variableBorrowIndex,
          currentVariableBorrowRate,
          currentStableBorrowRate,
          lastUpdateTimestamp,
          id,
          aTokenAddress,
          stableDebtTokenAddress,
          variableDebtTokenAddress,
          interestRateStrategyAddress,
          accruedToTreasury,
          unbacked,
          isolationModeTotalDebt
        } = reserveData

        const symbol: string = await this.getTokenSymbol(client, tokenAddress);

        return [{
          symbol,
          chainId,
          supplyYield: Number(formatUnits(currentLiquidityRate, 27)),
          borrowYield: Number(formatUnits(currentVariableBorrowRate, 27)),
          tokenAddress,
          chainName: this.chainNames[chainId] || `Unknown Chain ${chainId}`,
          marketAddress: aTokenAddress
        }];
      }),
      map((yieldInfo: YieldInfo[]) => yieldInfo)
    );
  }

  private async getTokenSymbol(client: PublicClient, tokenAddress: Address): Promise<string> {
    try {
      const tokenContract = getContract({
        address: tokenAddress,
        abi: [{ inputs: [], name: 'symbol', outputs: [{ type: 'string' }], stateMutability: 'view', type: 'function' }],
        client: client,
      });

      return await tokenContract.read.symbol() as string;
    } catch (error) {
      console.error(`Error fetching token symbol for ${tokenAddress}:`, error);
      return 'UNKNOWN';
    }
  }

  private processBestYields(yieldInfos: YieldInfo[]): YieldAggr {
    let bestSupplyYield: YieldInfo = yieldInfos[0];
    let bestBorrowYield: YieldInfo = yieldInfos[0];

    yieldInfos.forEach((info: YieldInfo) => {
      if (info.supplyYield > bestSupplyYield.supplyYield) {
        bestSupplyYield = info;
      }
      if (info.borrowYield < bestBorrowYield.borrowYield) {
        bestBorrowYield = info;
      }
    });

    return {
      bestSupplyYield,
      bestBorrowYield
    };
  }
}