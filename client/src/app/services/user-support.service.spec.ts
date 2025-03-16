import { TestBed } from '@angular/core/testing';

import { UserSupportService } from './user-support.service';

describe('UserSupportService', () => {
  let service: UserSupportService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UserSupportService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
