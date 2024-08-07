import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Address,
  encodeFunctionData,
  erc20Abi,
  parseAbi,
  zeroAddress,
} from 'viem';
import { firstValueFrom } from 'rxjs';
import { batchTx, BridgingDataEncoderParams, BridgingDataEncoderResult, RawTransaction, rawTx } from 'klaster-sdk';
import { optimism } from 'viem/chains';

@Injectable({
  providedIn: 'root',
})
export class AcrossBridgeService {
  private readonly API_BASE_URL = 'https://app.across.to/api';

  constructor(private http: HttpClient) {}

  depositV3ABI = parseAbi([
    'function depositV3(address depositor, address recipient, address inputToken, address outputToken, uint256 inputAmount, uint256 outputAmount, uint256 destinationChainId, address exclusiveRelayer, uint32 quoteTimestamp, uint32 fillDeadline, uint32 exclusivityDeadline, bytes calldata message) external',
  ]);

  getSuggestedFees(
    token: Address,
    originChainId: number,
    destChainId: number,
    amount: bigint
  ) {
    return firstValueFrom(
      this.http.get<RelayFeeData>(
        `${
          this.API_BASE_URL
        }/suggested-fees?token=${token}&originChainId=${originChainId}&destinationChainId=${destChainId}&amount=${amount.toString()}`
      )
    );
  }

  getSpokePoolAddress(chainId: number): Address {
    const spokePoolAddresses: { [chainId: number]: Address } = {
      10: '0x6f26Bf09B1C792e3228e5467807a900A503c0281', // Optimism
      137: '0x9295ee1d8C5b022Be115A2AD3c30C72E34e7F096', // Polygon
      42161: '0xe35e9842fceaCA96570B734083f4a58e8F7C5f2A', // Arbitrum
      8453: '0x09aea4b2242abC8bb4BB78D537A67a245A7bEC64', // Base
    };

    const address = spokePoolAddresses[chainId];
    if (!address) {
      throw new Error(`No SpokePool address found for chain ID ${chainId}`);
    }

    return address;
  }

  async encodeBridgeTxAcross(data: BridgingDataEncoderParams): Promise<BridgingDataEncoderResult> {
    const {
      account,
      amount,
      destinationChainId,
      destinationToken,
      sourceChainId,
      sourceToken,
    } = data;

    const quoteResult = await this.getSuggestedFees(
      sourceToken,
      sourceChainId,
      destinationChainId,
      amount
    );

    const outputAmount = amount - BigInt(quoteResult.totalRelayFee.total);
    const fillDeadlineBuffer = 600;
    const fillDeadline = Math.round(Date.now() / 1000) + fillDeadlineBuffer;
    const quoteTimestamp = parseInt(quoteResult.timestamp);
    const exclusivityDeadline = parseInt(quoteResult.exclusivityDeadline);
    const exclusiveRelayer = quoteResult.exclusiveRelayer;
    const message = '0x';

    const approveTx = rawTx({
      to: sourceToken,
      data: encodeFunctionData({
        abi: erc20Abi,
        functionName: 'approve',
        args: [quoteResult.spokePoolAddress, amount],
      }),
      gasLimit: BigInt(100000),
      value: BigInt(0),
    });

    const bridgeTx = rawTx({
      to: quoteResult.spokePoolAddress,
      data: encodeFunctionData({
        abi: this.depositV3ABI,
        functionName: 'depositV3',
        args: [
          account,
          account,
          sourceToken,
          destinationToken,
          amount,
          outputAmount,
          BigInt(destinationChainId),
          exclusiveRelayer,
          quoteTimestamp,
          fillDeadline,
          exclusivityDeadline,
          message,
        ],
      }),
      gasLimit: BigInt(100000),
    });
    return {
      receivedOnDestination: outputAmount,
      txBatch: batchTx(sourceChainId, [
        approveTx, bridgeTx
      ]),
    };
  }
}

export interface RelayFeeData {
  totalRelayFee: {
    pct: string;
    total: string;
  };
  relayerCapitalFee: {
    pct: string;
    total: string;
  };
  relayerGasFee: {
    pct: string;
    total: string;
  };
  lpFee: {
    pct: string;
    total: string;
  };
  timestamp: string;
  isAmountTooLow: boolean;
  quoteBlock: string;
  spokePoolAddress: Address;
  exclusiveRelayer: Address;
  exclusivityDeadline: string;
}
