import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TextService } from './text.service';
import { SocketService } from './socket.service';
import { environment } from '../../environments/environment';

describe('TextService', () => {
  let service: TextService;
  let httpMock: HttpTestingController;
  let socketServiceSpy: jasmine.SpyObj<SocketService>;

  beforeEach(() => {
    const socketSpy = jasmine.createSpyObj('SocketService', ['on']);
    
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        TextService,
        { provide: SocketService, useValue: socketSpy }
      ]
    });
    
    service = TestBed.inject(TextService);
    httpMock = TestBed.inject(HttpTestingController);
    socketServiceSpy = TestBed.inject(SocketService) as jasmine.SpyObj<SocketService>;
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should get shared with me messages', () => {
    const mockData = [{ _id: '1', text: 'Test message' }];
    
    service.getSharedWithMe().subscribe(data => {
      expect(data).toEqual(mockData);
    });
    
    const req = httpMock.expectOne(`${environment.apiUrl}/api/encrypted-texts/shared-with-me`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('should get shared by me messages', () => {
    const mockData = [{ _id: '1', text: 'Test message' }];
    
    service.getSharedByMe().subscribe(data => {
      expect(data).toEqual(mockData);
    });
    
    const req = httpMock.expectOne(`${environment.apiUrl}/api/encrypted-texts/shared-by-me`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('should create encrypted text', () => {
    const mockData = { text: 'Secret message', receivers: ['user1@example.com'] };
    const mockResponse = { _id: '1', ...mockData };
    
    service.createEncryptedText(mockData).subscribe(data => {
      expect(data).toEqual(mockResponse);
    });
    
    const req = httpMock.expectOne(`${environment.apiUrl}/api/encrypted-texts`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(mockData);
    req.flush(mockResponse);
  });

  it('should delete text', () => {
    const mockId = '123';
    const mockResponse = { success: true, message: 'Deleted successfully' };
    
    service.deleteText(mockId).subscribe(data => {
      expect(data).toEqual(mockResponse);
    });
    
    const req = httpMock.expectOne(`${environment.apiUrl}/api/encrypted-texts/${mockId}`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockResponse);
  });

  it('should mark text as read', () => {
    const mockId = '123';
    const mockResponse = { success: true, message: 'Marked as read' };
    
    service.markAsRead(mockId).subscribe(data => {
      expect(data).toEqual(mockResponse);
    });
    
    const req = httpMock.expectOne(`${environment.apiUrl}/api/encrypted-texts/mark-read/${mockId}`);
    expect(req.request.method).toBe('PATCH');
    req.flush(mockResponse);
  });
}); 