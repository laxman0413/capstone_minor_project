import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MaskTextComponent } from './mask-text.component';

describe('MaskTextComponent', () => {
  let component: MaskTextComponent;
  let fixture: ComponentFixture<MaskTextComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MaskTextComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MaskTextComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
