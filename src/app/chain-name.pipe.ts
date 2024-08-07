import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'chainName'
})
export class ChainNamePipe implements PipeTransform {
  transform(chainId: number): string {
    const chainNames: { [key: number]: string } = {
      1: 'Ethereum',
      137: 'Polygon',
      10: 'Optimism',
      42161: 'Arbitrum',
      43114: 'Avalanche',
      56: 'BNB Chain',
      8453: 'Base',
      534352: 'Scroll'
    };

    return chainNames[chainId] || `Unknown Chain (${chainId})`;
  }
}