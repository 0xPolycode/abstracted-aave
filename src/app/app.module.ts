import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { HttpClientModule } from '@angular/common/http';
import { ChainNamePipe } from './chain-name.pipe';
import { SupplyBorrowModalComponent } from './supply-borrow-modal/supply-borrow-modal.component';
import { ReactiveFormsModule } from '@angular/forms';
import { ChainInfoComponent } from './components/chain-info/chain-info.component';
import { WithdrawComponent } from './withdraw/withdraw.component';
import { SafePipe } from './sanitize.pipe';
import { ModalInfoComponent } from './components/modal-info/modal-info.component';
import { PullFundsComponent } from './components/pull-funds/pull-funds.component';
@NgModule({
  declarations: [
    AppComponent,
    ChainNamePipe,
    SafePipe,
    SupplyBorrowModalComponent,
    ChainInfoComponent,
    WithdrawComponent,
    ModalInfoComponent,
    PullFundsComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    ReactiveFormsModule,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
