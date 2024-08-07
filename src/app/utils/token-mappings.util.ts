import { Address } from 'viem';
import { zeroAddress } from 'viem';
import { polygon, base, optimism, arbitrum } from 'viem/chains';

export interface TokenDeployment {
  chainId: number;
  address: Address;
  symbol: string;
}

export interface TokenMapping {
  name: string;
  symbol: string;
  deployments: TokenDeployment[];
}

export const USDC: TokenMapping = {
  name: 'USDC',
  symbol: 'usdc',
  deployments: [
    {
      chainId: polygon.id,
      address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
      symbol: 'USDC',
    },
    {
      chainId: base.id,
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      symbol: 'USDC',
    },
    {
      chainId: optimism.id,
      address: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
      symbol: 'USDC',
    },
    {
      chainId: arbitrum.id,
      address: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
      symbol: 'USDC',
    },
  ],
};

export const USDT: TokenMapping = {
  name: 'USDT',
  symbol: 'usdt',
  deployments: [
    {
      chainId: polygon.id,
      address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
      symbol: 'USDT',
    },
    {
      chainId: optimism.id,
      address: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
      symbol: 'USDT',
    },
    {
      chainId: arbitrum.id,
      address: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
      symbol: 'USDT',
    },
  ],
};

export const WRAPPED_NATIVE: TokenMapping = {
  name: 'Wrapped Native',
  symbol: 'native',
  deployments: [
    {
      chainId: polygon.id,
      address: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
      symbol: 'WMATIC',
    },
    {
      chainId: base.id,
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
    },
    {
      chainId: optimism.id,
      address: '0x4200000000000000000000000000000000000006',
      symbol: 'WETH',
    },
    {
      chainId: arbitrum.id,
      address: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
      symbol: 'WETH',
    },
  ],
};

export const NATIVE: TokenMapping = {
  name: 'Native',
  symbol: 'native',
  deployments: [
    { chainId: polygon.id, address: zeroAddress, symbol: 'MATIC' },
    { chainId: base.id, address: zeroAddress, symbol: 'ETH' },
    { chainId: optimism.id, address: zeroAddress, symbol: 'ETH' },
    { chainId: arbitrum.id, address: zeroAddress, symbol: 'ETH' },
  ],
};
