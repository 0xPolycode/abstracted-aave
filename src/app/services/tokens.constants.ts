import { buildTokenMapping, deployment } from "klaster-sdk";
import { arbitrum, avalanche, base, optimism, polygon } from "viem/chains";

export const mcUSDC = buildTokenMapping([
  deployment(arbitrum.id, '0xaf88d065e77c8cC2239327C5EDb3A432268e5831'),
  deployment(base.id, '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913'),
  deployment(optimism.id, '0x0b2c639c533813f4aa9d7837caf62653d097ff85'),
  deployment(polygon.id, '0x3c499c542cef5e3811e1192ce70d8cc03d5c3359')
])

export const mcUSDT = buildTokenMapping([
  deployment(optimism.id, '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58'),
  deployment(polygon.id, '0xc2132D05D31c914a87C6611C10748AEb04B58e8F'),
  deployment(arbitrum.id, '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9'),
  deployment(avalanche.id, '0x9702230A8Ea53601f5cD2dc00fDBc13d4dF4A8c7')
])