import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DropfileinputComponent } from './dropfileinput.component';

describe('DropfileinputComponent', () => {
  let component: DropfileinputComponent;
  let fixture: ComponentFixture<DropfileinputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DropfileinputComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DropfileinputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
