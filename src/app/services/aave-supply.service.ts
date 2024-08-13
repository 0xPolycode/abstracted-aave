import { Injectable } from '@angular/core';
import { Address, parseUnits, encodeFunctionData } from 'viem';
import { scroll } from 'viem/chains';
import { aaveV3PoolAddresses } from './aave-yield-finder.service';

@Injectable({
  providedIn: 'root',
})
export class AaveSupplyEncodeService {
  // Aave V3 Pool ABI (only the supply function)
  private aavePoolAbi = [
    {
      inputs: [
        { name: 'asset', type: 'address' },
        { name: 'amount', type: 'uint256' },
        { name: 'onBehalfOf', type: 'address' },
        { name: 'referralCode', type: 'uint16' },
      ],
      name: 'supply',
      outputs: [],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;

  // ERC20 ABI (only the approve function)
  private erc20Abi = [
    {
      inputs: [
        { name: 'spender', type: 'address' },
        { name: 'amount', type: 'uint256' },
      ],
      name: 'approve',
      outputs: [{ name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
      type: 'function',
    },
  ] as const;
 

  encodeApproveCalldata(
    chainId: number,
    amount: bigint,
  ): `0x${string}` {
    if (!aaveV3PoolAddresses[chainId]) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }


    return encodeFunctionData({
      abi: this.erc20Abi,
      functionName: 'approve',
      args: [aaveV3PoolAddresses[chainId], amount],
    });
  }

  encodeSupplyCalldata(
    tokenAddress: Address,
    chainId: number,
    amount: bigint,
    userAddress: Address,
  ): `0x${string}` {
    if (!aaveV3PoolAddresses[chainId]) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }


    return encodeFunctionData({
      abi: this.aavePoolAbi,
      functionName: 'supply',
      args: [tokenAddress, amount, userAddress, 0],
    });
  }

  getPoolAddress(chainId: number): Address {
    const poolAddress = aaveV3PoolAddresses[chainId];
    if (!poolAddress) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return poolAddress;
  }
}
