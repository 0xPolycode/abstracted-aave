import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ChainInfoComponent } from './chain-info.component';

describe('ChainInfoComponent', () => {
  let component: ChainInfoComponent;
  let fixture: ComponentFixture<ChainInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ChainInfoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ChainInfoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
