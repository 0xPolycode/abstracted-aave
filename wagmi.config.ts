import { defineConfig } from '@wagmi/cli'

const aaveAbi = require('./src/assets/abis/aavev3pool.json')

export default defineConfig({
  out: 'src/generated.ts',
  contracts: [
    {
      abi: aaveAbi as any,
      name: 'AaveV3Pool'
    }
  ],
  plugins: [],
})
