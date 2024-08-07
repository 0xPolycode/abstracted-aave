import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';

interface ChainInfo {
  name: string;
  icon: string;
}

@Component({
  selector: 'app-chain-info',
  templateUrl: './chain-info.component.html',
  styleUrls: ['./chain-info.component.css']
})
export class ChainInfoComponent implements OnChanges {
  @Input() chainId!: string;
  chainInfo!: ChainInfo;

  private chainIdToInfo: { [key: string]: ChainInfo } = {
    '1': { name: 'Ethereum', icon: 'assets/ethereum-icon.svg' },
    '137': { name: 'Polygon', icon: 'assets/polygon-icon.svg' },
    '42161': { name: 'Arbitrum', icon: 'assets/arbitrum-icon.svg' },
    '10': { name: 'Optimism', icon: 'assets/optimism-icon.svg' },
    '43114': { name: 'Avalanche', icon: 'assets/avalanche-icon.svg' },
    // Add more chains as needed
  };

  ngOnChanges(changes: SimpleChanges) {
    if (changes['chainId']) {
      this.updateChainInfo();
    }
  }

  private updateChainInfo() {
    this.chainInfo = this.chainIdToInfo[this.chainId] || { name: 'Unknown Chain', icon: 'assets/unknown-chain-icon.svg' };
  }
}