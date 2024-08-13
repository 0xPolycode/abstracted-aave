import { Injectable } from '@angular/core';
import { forkJoin, Observable, from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { mcUSDC, mcUSDT } from './tokens.constants';
import { BlockchainService, mcClient } from './blockchain.service';
import { Address, createPublicClient, encodeFunctionData, http, parseAbi, parseUnits, PublicClient } from 'viem';
import { Chain, mainnet, optimism, arbitrum, polygon, avalanche, base, scroll } from 'viem/chains';

interface SuppliedPosition {
  chainId: number;
  token: 'USDC' | 'USDT';
  amount: string;
  tokenAddress: Address
}

interface ATokenInfo {
  chainId: number;
  usdcAToken: Address;
  usdtAToken?: Address;  // Made optional
}

@Injectable({
  providedIn: 'root'
})
export class AavePositionsService {
  private clients: Map<number, PublicClient> = new Map();
  private aTokens: ATokenInfo[] = [
    { chainId: optimism.id, usdcAToken: '0x38d693cE1dF5AaDF7bC62595A37D667aD57922e5', usdtAToken: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620' },
    { chainId: arbitrum.id, usdcAToken: '0x724dc807b04555b71ed48a6896b6F41593b8C637', usdtAToken: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620' },
    { chainId: polygon.id, usdcAToken: '0xA4D94019934D8333Ef880ABFFbF2FDd611C762BD', usdtAToken: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620' },
    { chainId: avalanche.id, usdcAToken: '0x625E7708f30cA75bfd92586e17077590C60eb4cD', usdtAToken: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620' },
    { chainId: base.id, usdcAToken: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB' },  // No USDT aToken for Base,
    { chainId: scroll.id, usdcAToken: '0x1D738a3436A8C49CefFbaB7fbF04B660fb528CbD'}
  ];

  constructor() {
    this.initializeClients();
  }

  private initializeClients() {
    const chains: Chain[] = [mainnet, optimism, arbitrum, polygon, avalanche, base, scroll];
    chains.forEach(chain => {
      const rpcForChain = mcClient.chainsRpcInfo.find(info => info.chainId === chain.id)?.rpcUrl;
      if (rpcForChain) {
        this.clients.set(chain.id, createPublicClient({
          chain,
          transport: http(rpcForChain)
        }));
      }
    });
  }

  getSuppliedPositions(userAddress: string): Observable<SuppliedPosition[]> {
    const requests: Observable<SuppliedPosition[]>[] = [];

    // Fetch USDC positions
    mcUSDC.forEach(mapping => {
      requests.push(this.fetchPosition(userAddress, mapping, 'USDC'));
    });

    // Fetch USDT positions (excluding Base and Scroll)
    mcUSDT.forEach(mapping => {
      if ((mapping.chainId !== base.id) && (mapping.chainId !== scroll.id)) {
        requests.push(this.fetchPosition(userAddress, mapping, 'USDT'));
      }
    });

    return forkJoin(requests).pipe(
      map(results => results.flat()),
      catchError(error => {
        console.error('Error fetching AAVE positions:', error);
        return of([]);
      })
    );
  }

  private fetchPosition(userAddress: string, mapping: { chainId: number; address: Address }, token: 'USDC' | 'USDT'): Observable<SuppliedPosition[]> {
    const client = this.clients.get(mapping.chainId);
    if (!client) {
      console.error(`No client found for chain ${mapping.chainId}`);
      return of([]);
    }

    const aTokenInfo = this.aTokens.find(info => info.chainId === mapping.chainId);
    if (!aTokenInfo) {
      console.error(`No aToken info found for chain ${mapping.chainId}`);
      return of([]);
    }

    const aTokenAddress = token === 'USDC' ? aTokenInfo.usdcAToken : aTokenInfo.usdtAToken;
    
    if (!aTokenAddress) {
      console.error(`No aToken address found for ${token} on chain ${mapping.chainId}`);
      return of([]);
    }

    return from(client.readContract({
      address: aTokenAddress,
      abi: [
        {
          name: 'balanceOf',
          type: 'function',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
          stateMutability: 'view'
        }
      ],
      functionName: 'balanceOf',
      args: [userAddress as Address]
    })).pipe(
      map(result => {
        const balance = result as bigint;
        const amount = balance.toString();
        return amount !== '0' ? [{
          chainId: mapping.chainId,
          token: token,
          amount: amount,
          tokenAddress: aTokenAddress
        }] : [];
      }),
      catchError(error => {
        console.error(`Error fetching position for ${token} on chain ${mapping.chainId}:`, error);
        return of([]);
      })
    );
  }

  getAavePoolAddress(chainId: number): Address {
    switch(chainId) {
      case optimism.id: return '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
      case base.id: return '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5';
      case polygon.id: return '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
      case avalanche.id: return '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
      case arbitrum.id: return '0x794a61358D6845594F94dc1DB02A252b5b4814aD';
      case scroll.id: return '0x11fCfe756c05AD438e312a7fd934381537D3cFfe';
    }
    throw Error(`No aave pool found for ${chainId}`)
  }

  encodeAaveWithdrawalData(
    chainId: number,
    assetAddress: Address,
    amount: bigint,
    userAddress: Address
  ): string {
    // Get the Aave Pool address for the specified chain
    const aavePoolAddress = this.getAavePoolAddress(chainId);
  
    // Parse the amount to the correct number of decimals
  
    const aavePoolABI = parseAbi([
      'function withdraw(address asset, uint256 amount, address to) returns (uint256)'
    ]);
    // Encode the function data
    const data = encodeFunctionData({
      abi: aavePoolABI,
      functionName: 'withdraw',
      args: [assetAddress, amount, userAddress],
    });
  
    return data;
  }
  
}