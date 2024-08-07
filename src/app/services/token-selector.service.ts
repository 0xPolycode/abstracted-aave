import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TokenDeployment, TokenMapping } from '../utils/token-mappings.util';

@Injectable({
  providedIn: 'root'
})
export class TokenSelectorService {
  selectTokens(tokenMapping: TokenMapping): Observable<TokenDeployment[]> {
    return of(tokenMapping.deployments);
  }

  selectTokenForChain(tokenMapping: TokenMapping, chainId: number): Observable<TokenDeployment | null> {
    const token = tokenMapping.deployments.find(deployment => deployment.chainId === chainId) || null;
    return of(token);
  }
}