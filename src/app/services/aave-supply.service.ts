import { Injectable } from '@angular/core';
import { Address, parseUnits, encodeFunctionData } from 'viem';

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

  // Aave V3 Pool addresses for different networks
  private poolAddresses: { [chainId: number]: Address } = {
    10: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',  // Optimism
    137: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Polygon
    42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Arbitrum
    43114: '0x794a61358D6845594F94dc1DB02A252b5b4814aD', // Avalanche
    8453: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5', // Base
    56: '0x6807dc923806fE8Fd134338EABCA509979a7e0cB'   // BNB Chain (formerly BSC)
  };

  encodeApproveCalldata(
    chainId: number,
    amount: bigint,
  ): `0x${string}` {
    if (!this.poolAddresses[chainId]) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }


    return encodeFunctionData({
      abi: this.erc20Abi,
      functionName: 'approve',
      args: [this.poolAddresses[chainId], amount],
    });
  }

  encodeSupplyCalldata(
    tokenAddress: Address,
    chainId: number,
    amount: bigint,
    userAddress: Address,
  ): `0x${string}` {
    if (!this.poolAddresses[chainId]) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }


    return encodeFunctionData({
      abi: this.aavePoolAbi,
      functionName: 'supply',
      args: [tokenAddress, amount, userAddress, 0],
    });
  }

  getPoolAddress(chainId: number): Address {
    const poolAddress = this.poolAddresses[chainId];
    if (!poolAddress) {
      throw new Error(`Unsupported chain ID: ${chainId}`);
    }
    return poolAddress;
  }
}
