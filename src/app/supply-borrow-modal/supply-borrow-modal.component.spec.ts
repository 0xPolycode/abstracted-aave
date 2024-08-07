import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SupplyBorrowModalComponent } from './supply-borrow-modal.component';

describe('SupplyBorrowModalComponent', () => {
  let component: SupplyBorrowModalComponent;
  let fixture: ComponentFixture<SupplyBorrowModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [SupplyBorrowModalComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(SupplyBorrowModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
