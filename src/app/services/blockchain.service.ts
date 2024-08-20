import { HttpClient } from '@angular/common/http';
import { Injectable, input } from '@angular/core';
import {
  batchTx,
  BridgingDataEncoderParams,
  buildBridgingEncoder,
  buildItx,
  buildMultichainReadonlyClient,
  buildTokenMapping,
  calculateMultibridgeData,
  getTokenAddressForChainId,
  initKlaster,
  InterchainTransaction,
  klasterNodeHost,
  KlasterSDK,
  MultichainTokenMapping,
  PaymentTokenSymbol,
  prepareStrategy,
  QuoteResponse,
  rawTx,
  singleTx,
} from 'klaster-sdk';
import {
  BehaviorSubject,
  combineLatest,
  firstValueFrom,
  from,
  Observable,
  of,
  switchMap,
} from 'rxjs';
import {
  Address,
  Chain,
  createPublicClient,
  createWalletClient,
  custom,
  encodeFunctionData,
  erc20Abi,
  getContract,
  http,
  parseAbi,
  parseUnits,
  zeroAddress,
} from 'viem';
import {
  arbitrum,
  avalanche,
  base,
  bsc,
  optimism,
  polygon,
  scroll,
} from 'viem/chains';
import { AaveSupplyEncodeService } from './aave-supply.service';
import { AcrossBridgeService } from './across.service';
import { AavePositionsService } from './aave-get-supplies.service';
import { mcUSDC, mcUSDT } from './tokens.constants';

export const mcClient = buildMultichainReadonlyClient(
  [optimism, base, arbitrum, polygon, avalanche, scroll].map((chain) => {
    return {
      chainId: chain.id,
      rpcUrl: chain.rpcUrls.default.http[0],
    };
  }),
);

@Injectable({
  providedIn: 'root',
})
export class BlockchainService {
  baseUrl = `https://app.across.to/api/suggested-fees`;

  viemClient = createWalletClient({
    transport: custom((window as any).ethereum),
  });
  klasterSDK?: KlasterSDK;

  address?: Address;

  multichainAddressSub = new BehaviorSubject<string | null>(null);
  multichainAddress$ = this.multichainAddressSub.asObservable();

  klasterInitialized?: () => void;

  constructor(
    private http: HttpClient,
    private aaveService: AaveSupplyEncodeService,
    private acrossService: AcrossBridgeService,
    private aavePositionsService: AavePositionsService,
  ) {
    this.initKlaster();
  }

  private async initKlaster() {
    await this.viemClient.requestAddresses();
    const [address] = await this.viemClient.getAddresses();
    this.address = address;
    this.klasterSDK = await initKlaster({
      masterAddress: address,
      nodeUrl: klasterNodeHost.default
    });
    this.multichainAddressSub.next(this.klasterSDK.account.address);
    this.klasterInitialized?.();
  }

  async getMultichainAccount() {
    return await this.klasterSDK?.account;
  }

  async getUnifiedBalance(
    tokenMapping: MultichainTokenMapping,
    address: Address,
  ) {
    return mcClient.getUnifiedErc20Balance({
      tokenMapping,
      address,
    });
  }

  async executeItx(iTx: InterchainTransaction) {
    if (!this.klasterSDK) {
      throw new Error(
        'Calling execute function while Klaster SDK not initialized.',
      );
    }
    if (!this.address) {
      throw new Error(
        `Can't call execute until EOA address has been fetched from viem.`,
      );
    }
    return this.klasterSDK.autoExecute(iTx, (hash) => {
      return this.viemClient.signMessage({
        message: {
          raw: hash,
        },
        account: this.address!,
      });
    });
  }

  async encodeSupplyItx({
    tokenMapping,
    destChainId,
    inputAmount,
    paymentChainId,
    paymentToken,
  }: {
    tokenMapping: MultichainTokenMapping;
    destChainId: number;
    inputAmount: bigint;
    paymentChainId: number;
    paymentToken: PaymentTokenSymbol;
  }) {
    if (!this.klasterSDK) {
      throw Error('KlasterSDK being used before full intialization');
    }
    const address = this.klasterSDK.account.address;

    const unifiedBalance = await mcClient.getUnifiedErc20Balance({
      tokenMapping: tokenMapping,
      address: address,
    });


    const bridgingData = await calculateMultibridgeData({
      tokenMapping: tokenMapping,
      account: address,
      amount: inputAmount,
      client: mcClient,
      destinationChainId: destChainId,
      unifiedBalance: unifiedBalance,
      encodingFunction: async (data) =>
        this.acrossService.encodeBridgeTxAcross(data),
    });

    const destToken = getTokenAddressForChainId(tokenMapping, destChainId);
    if (!destToken) {
      throw Error('No token in mapping');
    }

    const receivedByBridging = bridgingData.totalReceivedOnDestination;
    const remaining = inputAmount - receivedByBridging;
    const preBridgeOnDest =
      unifiedBalance.breakdown.find((x) => x.chainId === destChainId)?.amount ??
      0n;

    const destAmount =
      (preBridgeOnDest > inputAmount
        ? inputAmount
        : receivedByBridging + preBridgeOnDest);

    const approveAaveTx = rawTx({
      to: destToken,
      gasLimit: BigInt(150000),
      data: this.aaveService.encodeApproveCalldata(destChainId, destAmount),
    });

    const supplyAaveTx = rawTx({
      to: this.aaveService.getPoolAddress(destChainId),
      gasLimit: BigInt(300000),
      data: this.aaveService.encodeSupplyCalldata(
        destToken,
        destChainId,
        destAmount,
        address,
      ),
    });

    const supplyAaveSteps = batchTx(destChainId, [approveAaveTx, supplyAaveTx]);

    return buildItx({
      steps: bridgingData.steps.concat([supplyAaveSteps]),
      feeTx: this.klasterSDK.buildFeeTx(paymentToken, paymentChainId),
    });
  }

  async getSuggestedGasInfo(excludeChains: number[] = []) {
    const usdcBalance = await mcClient.getUnifiedErc20Balance({
      tokenMapping: mcUSDC,
      address: this.klasterSDK!.account.address,
    });
    const usdtBalance = await mcClient.getUnifiedErc20Balance({
      tokenMapping: mcUSDT,
      address: this.klasterSDK!.account.address,
    });
    const neededAmount = parseUnits('0.5', 6);
    const usdcEnough = usdcBalance.breakdown.filter(item => !excludeChains.includes(item.chainId))
    .filter((x) => x.amount > neededAmount)
    .at(0);
    
    const usdtEnough = usdtBalance.breakdown.filter(item => !excludeChains.includes(item.chainId))
      .filter((x) => x.amount > neededAmount)
      .at(0);

      if (usdcEnough) {
      return {
        chainId: usdcEnough.chainId,
        paymentToken: 'USDC' as PaymentTokenSymbol,
      };
    }
    if (usdtEnough) {
      return {
        chainId: usdtEnough.chainId,
        paymentToken: 'USDT' as PaymentTokenSymbol,
      };
    }
    return null;
  }

  async encodeWithdrawAAVE(
    amount: bigint,
    chainId: number,
    token: 'USDC' | 'USDT',
  ) {
    if (!this.klasterSDK) {
      throw Error(`Klaster SDK not initialized`);
    }
    const userAddress = this.klasterSDK.account.address;

    const tokenAddress =
      token === 'USDC'
        ? getTokenAddressForChainId(mcUSDC, chainId)
        : getTokenAddressForChainId(mcUSDT, chainId);

    if (!tokenAddress) {
      throw Error(
        `Can't fetch the underlying token ${token} on chain ${chainId}`,
      );
    }

    const data = this.aavePositionsService.encodeAaveWithdrawalData(
      chainId,
      tokenAddress,
      amount,
      userAddress,
    );

    const fees = await this.getSuggestedGasInfo();

    if (!fees) {
      throw(`Not enough funds to pay for transaction fee.`)
    }

    return buildItx({
      steps: [
        singleTx(
          chainId,
          rawTx({
            to: this.aavePositionsService.getAavePoolAddress(chainId),
            gasLimit: BigInt(300000),
            data: data,
            value: BigInt(0),
          }),
        ),
      ],
      feeTx: this.klasterSDK.buildFeeTx(fees.paymentToken, fees.chainId),
    });
  }
}
