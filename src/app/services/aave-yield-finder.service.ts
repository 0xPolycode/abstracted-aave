import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of } from 'rxjs';
import { map, catchError, switchMap } from 'rxjs/operators';
import { TokenMapping, TokenDeployment, USDC, USDT, WRAPPED_NATIVE, NATIVE } from '../utils/token-mappings.util';
import { TokenSelectorService } from './token-selector.service';
import { Address, formatUnits } from 'viem';
import { ChainNamePipe } from '../chain-name.pipe';

export interface YieldInfo {
  symbol: string;
  chainId: number;
  supplyYield: number;
  borrowYield: number;
  tokenAddress: Address
  chainName: string
  marketAddress: string
}

@Injectable({
  providedIn: 'root'
})
export class AaveV3YieldService {
  private readonly aaveApiUrl = 'https://aave-api-v2.aave.com/data/markets-data';
  private readonly tokenMappings: { [symbol: string]: TokenMapping } = {
    USDC: USDC,
    USDT: USDT,
    WNATIVE: WRAPPED_NATIVE,
    NATIVE: NATIVE
  };

  constructor(
    private http: HttpClient,
    private tokenSelector: TokenSelectorService,
  ) {}

  getBestYields(tokenMapping: TokenMapping): Observable<YieldInfo[]> {
    return this.tokenSelector.selectTokens(tokenMapping).pipe(
      switchMap(tokens => forkJoin(
        tokens.map(token => this.getYieldForToken(tokenMapping, token))
      )),
      map(yieldInfos => yieldInfos.filter((yieldInfo): yieldInfo is YieldInfo => yieldInfo !== null))
    );
  }

  private getYieldForToken(tokenMapping: TokenMapping, token: TokenDeployment): Observable<YieldInfo | null> {
    const url = `${this.aaveApiUrl}/${token.chainId}`;
    return this.http.get<any>(url).pipe(
      map(response => {
        const reserveData = response.reserves.find((reserve: any) => 
          reserve.underlyingAsset.toLowerCase() === token.address.toLowerCase()
        );

        if (!reserveData) {
          console.warn(`Token ${tokenMapping.symbol} not found in AAVE v3 market for chain ${token.chainId}`);
          return null;
        }
        const chainName = new ChainNamePipe()
        return {
          symbol: tokenMapping.symbol,
          chainId: token.chainId,
          supplyYield: this.calculateAPY(reserveData.liquidityRate),
          borrowYield: this.calculateAPY(reserveData.variableBorrowRate),
          tokenAddress: token.address,
          chainName: chainName.transform(token.chainId),
          marketAddress: ''
        };
      }),
      catchError(error => {
        console.error(`Error fetching yield for ${tokenMapping.symbol} on chain ${token.chainId}:`, error);
        return of(null);
      })
    );
  }

  private calculateAPY(rate: string): number {
    try {
      const bigIntRate = BigInt(rate);
      const rateAsNumber = Number(formatUnits(bigIntRate, 27));
      const SECONDS_PER_YEAR = 31536000;
      return (1 + rateAsNumber / SECONDS_PER_YEAR) ** SECONDS_PER_YEAR - 1;
    } catch (error) {
      const rateAsNumber = parseFloat(rate);
      if (isNaN(rateAsNumber)) {
        console.error(`Unable to parse rate: ${rate}`);
        return 0;
      }
      const SECONDS_PER_YEAR = 31536000;
      return (1 + rateAsNumber / SECONDS_PER_YEAR) ** SECONDS_PER_YEAR - 1;
    }
  }

  getBestYieldsForSymbol(symbol: string): Observable<{ bestSupplyYield: YieldInfo | null, bestBorrowYield: YieldInfo | null }> {
    const tokenMapping = this.getTokenMappingForSymbol(symbol);
    if (!tokenMapping) {
      return of({ bestSupplyYield: null, bestBorrowYield: null });
    }

    return this.getBestYields(tokenMapping).pipe(
      map(yieldInfos => ({
        bestSupplyYield: yieldInfos.reduce((best, current) => 
          current.supplyYield > best.supplyYield ? current : best
        ),
        bestBorrowYield: yieldInfos.reduce((best, current) => 
          current.borrowYield < best.borrowYield ? current : best
        )
      }))
    );
  }

  private getTokenMappingForSymbol(symbol: string): TokenMapping | null {
    const upperSymbol = symbol.toUpperCase();
    return this.tokenMappings[upperSymbol] || null;
  }
}