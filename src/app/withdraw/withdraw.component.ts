import { Component, Input } from '@angular/core';
import { parseUnits } from 'viem';
import { BlockchainService } from '../services/blockchain.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-withdraw',
  templateUrl: './withdraw.component.html',
  styleUrl: './withdraw.component.css',
})
export class WithdrawComponent {
  constructor(private blockchainService: BlockchainService) {}

  @Input() position: {
    amount: string;
    chainId: number;
    token: 'USDC' | 'USDT';
    tokenAddress: `0x${string}`;
  } | null = null;

  amountControl = new FormControl('', []);

  isProcessing = false
  iTxHash: string | null = null

  async withdrawAave() {
    this.isProcessing = true
    try {
      const amount = String(this.amountControl.value);
      if (!amount) {
        alert('Input amount not properly set. Needs to be a number.');
        return;
      }
      if (!this.position) {
        alert('Unexpected error. Aaave position in withdraw modal is null.');
        return;
      }
      const amountParsed = parseUnits(amount, 6);
      const withdrawItx = await this.blockchainService.encodeWithdrawAAVE(
        amountParsed,
        this.position.chainId,
        this.position.token
      );
      const result = await this.blockchainService.executeItx(withdrawItx);
      this.iTxHash = result.itxHash
    } catch (e) {
      alert(e);
      this.isProcessing = false
    }
  }

  close() {
    this.position = null;
    this.iTxHash = null;
    this.isProcessing = false
  }
}
