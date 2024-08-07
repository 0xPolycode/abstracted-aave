import { Component, Input, Output, EventEmitter } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { encodeFunctionData, formatUnits, parseUnits } from 'viem';
import { BlockchainService } from '../services/blockchain.service';
import { PaymentTokenSymbol, UnifiedBalanceResult } from 'klaster-sdk';
import { base, optimism, polygon } from 'viem/chains';
import { mcUSDC, mcUSDT } from '../services/tokens.constants';

@Component({
  selector: 'app-supply-borrow-modal',
  templateUrl: './supply-borrow-modal.component.html',
  styleUrl: './supply-borrow-modal.component.css'
})
export class SupplyBorrowModalComponent {
  @Input() isVisible: boolean = false;
  @Input() actionType: 'Supply' | 'Borrow' = 'Supply';
  @Input() tokenSymbol: string = '';
  @Input() tokenAddress: string = '';
  @Input() apy: number = 0;
  @Input() chainName: string = '';
  @Input() chainId: number = 0;
  @Input() marketAddress: string = '';
  @Input() balances!: {
    usdc: UnifiedBalanceResult,
    usdt: UnifiedBalanceResult
  }

  @Output() closeModal = new EventEmitter<void>();
  @Output() transactionData = new EventEmitter<`0x${string}`>();

  form: FormGroup;

  isProcessing = false
  itxHash?: string

  constructor(private fb: FormBuilder, 
    private blockchainService: BlockchainService,
  ) {
    this.form = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0)]]
    });
  }

  close() {
    this.closeModal.emit();
    this.isProcessing = false
  }

  onSubmit() {
    this.isProcessing = true
    if (this.form.valid) {
      this.supply()
    }
  }

  async supply() {

    try {
      const mapping = this.tokenSymbol === 'USDC' ? mcUSDC : mcUSDT
      const amount = String(this.form.get('amount')?.value)
      if(!amount) {
        alert('Empty amount input field')
        return
      }
      const iTx = await this.blockchainService.encodeSupplyItx({
        tokenMapping: mapping,
        destChainId: this.chainId,
        inputAmount: parseUnits(amount, 6),
        paymentChainId: this.chainId,
        paymentToken: this.tokenSymbol as PaymentTokenSymbol
      })
      const result = await this.blockchainService.executeItx(iTx)
      this.itxHash = result.itxHash
    } catch (e) {
      alert(e)
      this.close()
    }

  }

}