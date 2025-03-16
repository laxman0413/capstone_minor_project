import { TestBed } from '@angular/core/testing';
import { ToastrService } from 'ngx-toastr';
import { NotificationService } from './notification.service';

describe('NotificationService', () => {
  let service: NotificationService;
  let toastrSpy: jasmine.SpyObj<ToastrService>;

  beforeEach(() => {
    const spy = jasmine.createSpyObj('ToastrService', ['success', 'error', 'warning', 'info', 'clear']);

    TestBed.configureTestingModule({
      providers: [
        NotificationService,
        { provide: ToastrService, useValue: spy }
      ]
    });
    
    service = TestBed.inject(NotificationService);
    toastrSpy = TestBed.inject(ToastrService) as jasmine.SpyObj<ToastrService>;
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should call toastr success method', () => {
    service.success('Test success message');
    expect(toastrSpy.success).toHaveBeenCalled();
  });

  it('should call toastr error method', () => {
    service.error('Test error message');
    expect(toastrSpy.error).toHaveBeenCalled();
  });

  it('should call toastr warning method', () => {
    service.warning('Test warning message');
    expect(toastrSpy.warning).toHaveBeenCalled();
  });

  it('should call toastr info method', () => {
    service.info('Test info message');
    expect(toastrSpy.info).toHaveBeenCalled();
  });

  it('should call toastr clear method', () => {
    service.clearAll();
    expect(toastrSpy.clear).toHaveBeenCalled();
  });
}); 