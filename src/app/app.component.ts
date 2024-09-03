import { Component, OnInit } from '@angular/core';
import { catchError, from, map, Observable, of, repeat, switchMap } from 'rxjs';
import { BlockchainService, mcClient } from './services/blockchain.service';
import { Address, formatUnits, parseUnits } from 'viem';
import { mcUSDC, mcUSDT } from './services/tokens.constants';
import { AavePositionsService } from './services/aave-get-supplies.service';
import { buildItx } from 'klaster-sdk';
import { base } from 'viem/chains';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import {
  AaveV3YieldService,
  YieldInfo,
} from './services/aave-yield-finder.service';
import { ModalService } from './services/modal.service';
import { fadeInAnimation } from './utils/fadein.animation';

type YieldAggr = {
  bestSupplyYield: YieldInfo;
  bestBorrowYield: YieldInfo;
};

@Component({
  selector: 'app-root',
  styleUrl: './app.component.css',
  templateUrl: './app.component.html',
  animations: [fadeInAnimation]
})
export class AppComponent {
  usdcYields$: Observable<YieldAggr>;
  usdtYields$: Observable<YieldAggr>;

  isPullFundsVisible = false

  isModalVisible = false;
  modalActionType: 'Supply' | 'Borrow' = 'Supply';
  modalTokenSymbol = '';
  modalTokenAddress = '';
  modalApy = 0;
  modalChainName = '';
  modalChainId = 0;
  modalMarketAddress = '';
  usdcBalance: string | null = null;
  usdtBalance: string | null = null;
  mcSca: string | null = null;

  withdrawPositionOpened: {
    amount: string;
    chainId: number;
    token: 'USDC' | 'USDT';
    tokenAddress: Address;
  } | null = null;

  eoa = this.blockchainService.address;

  depositChains = mcClient.chainsRpcInfo.map((x) => x.chainId);

  finishedLoading = false

  v3Positions$ = this.blockchainService.multichainAddress$.pipe(
    switchMap((address) => {
      if (address === null) {
        return of();
      }
      return this.aavePositionsService.getSuppliedPositions(address);
    }),
    map((positions) => {
      return positions.map((position) => {
        return { ...position, amount: formatUnits(BigInt(position.amount), 6) };
      });
    }),
  );

  totalsSupplied$ = this.v3Positions$.pipe(
    map((positions) => {
      const totalUSC = positions
        .filter((x) => x.token === 'USDC')
        .map((x) => parseUnits(x.amount, 6))
        .reduce((curr, acc) => {
          return curr + acc;
        }, BigInt(0));
      const totalUSDT = positions
        .filter((x) => x.token === 'USDT')
        .map((x) => parseUnits(x.amount, 6))
        .reduce((curr, acc) => {
          return curr + acc;
        }, BigInt(0));
      return {
        usdc: formatUnits(totalUSC, 6),
        usdt: formatUnits(totalUSDT, 6),
      };
    }),
  );

  showPullFunds() {
    this.isPullFundsVisible = true
  }

  demoConditionsVisible = true

  suppliesExpanded = false;

  viewBreakdownToggled: 'USDC' | 'USDT' | null = null;

  constructor(
    private aaveYieldService: AaveV3YieldService,
    private blockchainService: BlockchainService,
    private aavePositionsService: AavePositionsService,
    private modalService: ModalService,
  ) {
    this.usdcYields$ = this.aaveYieldService.getBestYieldsForSymbol('USDC');

    this.usdtYields$ = this.aaveYieldService.getBestYieldsForSymbol('USDT');
  }

  async acceptDemoConditions() {
    this.init();
    this.demoConditionsVisible = false
  }

  toggleExpand() {
    this.suppliesExpanded = !this.suppliesExpanded;
  }

  setViewBreakdown(value: 'USDC' | 'USDT' | null) {
    if (this.viewBreakdownToggled === value) {
      this.viewBreakdownToggled = null;
    }
    this.viewBreakdownToggled = value;
  }

  async withdrawAll() {
    this.modalService.openModal({
      title: 'Processing',
      message: 'Waiting for approval for Withdraw All',
      type: 'loading'
    })
    this.v3Positions$.subscribe(async (positions) => {
      
      const fees = await this.blockchainService.getSuggestedGasInfo();
      if (!fees) {
        this.modalService.dismissModal()
        this.modalService.openError(
          'Funds too low',
          'Not enough funds to pay for gas fees',
        );
        return;
      }

      const withdrawItxs = await Promise.all(
        positions.map(async (position) => {
          try {

            return await this.blockchainService.encodeWithdrawAAVE(
              parseUnits(position.amount, 6),
              position.chainId,
              position.token,
            );
          } catch (e: any) {
            this.modalService.dismissModal()
            this.modalService.openError('Error', JSON.stringify(e));
            throw e;
          }
        }),
      );



      const steps = withdrawItxs
        .map((x) => x.steps)
        .reduce((curr, acc) => acc.concat(curr));

      const iTx = buildItx({
        steps: steps,
        feeTx: this.blockchainService.klasterSDK!.buildFeeTx(
          fees.paymentToken,
          fees.chainId,
        ),
      });
      const result = await this.blockchainService.executeItx(iTx);
      this.modalService.dismissModal()
      this.modalService.openModal({
        message: ``,
        title: 'Transaction received',
        type: 'success',
        link: {
          text: 'Klaster Explorer',
          link: `https://explorer.klaster.io/details/${result.itxHash}`,
        },
      });
    });
  }

  async requestWallets() {
    const res = await this.blockchainService.viemClient.requestAddresses();
    this.finishedLoading = true
    this.eoa = res.at(0);
  }

  formatBalance(balance: string) {
    return parseFloat(balance).toFixed(2);
  }

  openWithdraw(position: any) {
    this.withdrawPositionOpened = position;
  }

  usdcBreakdown: {
    chainId: number;
    amount: string;
  }[] = [];

  usdtBreakdown: {
    chainId: number;
    amount: string;
  }[] = [];

  async init() {
    const [address] =
      await this.blockchainService.viemClient.requestAddresses();
    this.eoa = address;
    const mcAddress = this.blockchainService.klasterSDK?.account.address;
    if (!mcAddress) {
      throw new Error('Address not available');
    }
    const usdcBalance = await this.blockchainService.getUnifiedBalance(
      mcUSDC,
      mcAddress,
    );
    const usdtBalance = await this.blockchainService.getUnifiedBalance(
      mcUSDT,
      mcAddress,
    );
    this.usdcBreakdown = usdcBalance.breakdown.map((x) => {
      return {
        amount: parseFloat(formatUnits(x.amount, 6)).toFixed(2),
        chainId: x.chainId,
      };
    });
    this.usdtBreakdown = usdtBalance.breakdown.map((x) => {
      return {
        amount: parseFloat(formatUnits(x.amount, 6)).toFixed(2),
        chainId: x.chainId,
      };
    });
    this.usdcBalance = formatUnits(usdcBalance.balance, usdcBalance.decimals);
    this.usdtBalance = formatUnits(usdtBalance.balance, usdtBalance.decimals);
    this.mcSca = mcAddress;
  }

  openModal(
    actionType: 'Supply' | 'Borrow',
    tokenSymbol: string,
    tokenAddress: string,
    apy: number,
    chainName: string,
    chainId: number,
    marketAddress: string,
  ) {
    this.modalActionType = actionType;
    this.modalTokenSymbol = tokenSymbol;
    this.modalTokenAddress = tokenAddress;
    this.modalApy = apy;
    this.modalChainName = chainName;
    this.modalChainId = chainId;
    this.modalMarketAddress = marketAddress;
    this.isModalVisible = true;
  }

  closeModal() {
    this.isModalVisible = false;
  }

  parseNumber(num: string) {
    return parseFloat(num).toFixed(2);
  }

  handleTransactionData(callData: `0x${string}`) {
    console.log('Transaction call data:', callData);
    // Here you would typically send this data to your wallet or transaction handling service
  }
}
