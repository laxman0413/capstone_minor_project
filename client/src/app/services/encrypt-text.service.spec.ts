import { TestBed } from '@angular/core/testing';

import { EncryptTextService } from './encrypt-text.service';

describe('EncryptTextService', () => {
  let service: EncryptTextService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EncryptTextService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
