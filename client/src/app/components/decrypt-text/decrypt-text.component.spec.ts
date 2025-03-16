import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DecryptTextComponent } from './decrypt-text.component';

describe('DecryptTextComponent', () => {
  let component: DecryptTextComponent;
  let fixture: ComponentFixture<DecryptTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DecryptTextComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DecryptTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
