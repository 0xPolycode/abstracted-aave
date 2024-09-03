import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PullFundsComponent } from './pull-funds.component';

describe('PullFundsComponent', () => {
  let component: PullFundsComponent;
  let fixture: ComponentFixture<PullFundsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PullFundsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PullFundsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
