import { Component, Input } from '@angular/core';
import { BlockchainService, mcClient } from '../../services/blockchain.service';
import { mcUSDC, mcUSDT } from '../../services/tokens.constants';
import { firstValueFrom, from } from 'rxjs';
import {
  Address,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  parseUnits,
} from 'viem';
import {
  batchTx,
  buildItx,
  calculateMultibridgeData,
  MultichainTokenMapping,
  rawTx,
  UnifiedBalanceResult,
} from 'klaster-sdk';
import { AcrossBridgeService } from '../../services/across.service';
import { TokenMapping } from '../../utils/token-mappings.util';
import { FormControl, Validators } from '@angular/forms';
import { ModalService } from '../../services/modal.service';

@Component({
  selector: 'app-pull-funds',
  templateUrl: './pull-funds.component.html',
  styleUrl: './pull-funds.component.css',
})
export class PullFundsComponent {
  @Input() isModalVisible!: boolean;

  accountAddress = this.blockchainService.klasterSDK!.account.address;
  usdtBalance$ = from(
    this.blockchainService.getUnifiedBalance(mcUSDT, this.accountAddress),
  );
  usdcBalance$ = from(
    this.blockchainService.getUnifiedBalance(mcUSDC, this.accountAddress),
  );

  usdcAmountForm = new FormControl('0', [Validators.required]);
  usdtAmountForm = new FormControl('0', [Validators.required]);


  isChainDropdownOpen = false;
  isTokenDropdownOpen = false;
  selectedChainId: number | null = null;
  selectedToken: string | null = null;

  toggleChainDropdown() {
    this.isChainDropdownOpen = !this.isChainDropdownOpen;
    this.isTokenDropdownOpen = false;
  }

  toggleTokenDropdown() {
    this.isTokenDropdownOpen = !this.isTokenDropdownOpen;
    this.isChainDropdownOpen = false;
  }

  selectChain(chainId: number) {
    this.selectedChainId = chainId;
    this.isChainDropdownOpen = false;
  }

  selectToken(token: string) {
    this.selectedToken = token;
    this.isTokenDropdownOpen = false;
  }

  chains = mcClient.chainsRpcInfo.map((x) => x.chainId);

  constructor(
    private blockchainService: BlockchainService,
    private modalService: ModalService,
    private acrossBridge: AcrossBridgeService,
  ) {}

  hide() {
    this.isModalVisible = false;
  }

  async pullFunds() {
    const usdtBalance = await firstValueFrom(this.usdtBalance$);
    const usdcBalance = await firstValueFrom(this.usdcBalance$);
    const usdcAmount = this.usdcAmountForm.value?.toString()
    const usdtAmount = this.usdtAmountForm.value?.toString()

    const chainId = this.selectedChainId;
    if (!usdcAmount || !usdtAmount || !chainId) {
      this.modalService.openError(
        'Fields not selected',
        `Amount (USDC): ${usdcAmount}, amount (USDT): ${usdtAmount}, chainID: ${chainId}`,
      );
      return;
    }
    const parsedUSCCAmount = parseUnits(usdcAmount, 6);
    const parsedUSDTAmount = parseUnits(usdtAmount, 6)

    const generateBridgingOps = async (
      tokenMapping: MultichainTokenMapping,
      amount: bigint,
      unifiedBalance: UnifiedBalanceResult,
    ) => {

      return await calculateMultibridgeData({
        tokenMapping: tokenMapping,
        account: this.blockchainService.klasterSDK!.account.address,
        amount: amount,
        client: mcClient,
        destinationChainId: chainId,
        encodingFunction: (x) => this.acrossBridge.encodeBridgeTxAcross(x),
        unifiedBalance: unifiedBalance,
      });
    };

    const bridgingOpsUsdc = await generateBridgingOps(
      mcUSDC,
      parsedUSCCAmount,
      usdcBalance,
    );
    const bridgingOpsUsdt = await generateBridgingOps(
      mcUSDT,
      parsedUSDTAmount,
      usdtBalance,
    );

    const receiver = this.blockchainService.klasterSDK!.masterAddress;
    const sendErc20ToReceiverOp = (tokenAddress: Address, amount: bigint) => {
      return rawTx({
        gasLimit: 100000n,
        to: tokenAddress,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: 'transfer',
          args: [receiver, amount],
        }),
      });
    };

    const sendUSDCToReceiverOp = sendErc20ToReceiverOp(
      mcUSDC.find((x) => x.chainId === chainId)!.address,
      bridgingOpsUsdc.totalReceivedOnDestination,
    );

    const sendUSDTToReceiverOp = sendErc20ToReceiverOp(
      mcUSDC.find((x) => x.chainId === chainId)!.address,
      bridgingOpsUsdt.totalReceivedOnDestination,
    );

    const lastUSDCElem = usdcBalance.breakdown.at(usdcBalance.breakdown.length - 1)

    const iTx = buildItx({
      feeTx: this.blockchainService.klasterSDK!.buildFeeTx('USDC', lastUSDCElem!.chainId),
      steps: 
        bridgingOpsUsdc.steps.concat(bridgingOpsUsdt.steps).concat([
          batchTx(chainId, [sendUSDCToReceiverOp, sendUSDTToReceiverOp])
        ])
    })
    const quote = await this.blockchainService.klasterSDK!.getQuote(iTx)
    console.log(quote)
  }

  formatUSD(amount: bigint) {
    return formatUnits(amount, 6);
  }
}
