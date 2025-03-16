import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import { SocketService } from './socket.service';

@Injectable({
  providedIn: 'root'
})
export class TextService {
  private apiUrl = `${environment.apiUrl}/sharedData`;
  private textUpdateSubject = new Subject<void>();
  token = localStorage.getItem('authToken');
  constructor(
    private http: HttpClient,
    private socketService: SocketService
  ) {
    // Subscribe to socket events for real-time updates
    this.socketService.on('encrypted-text-update', () => {
      this.textUpdateSubject.next();
    });
  }
  
  /**
   * Get messages shared with the current user
   */
  getSharedWithMe(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/to-me`,{
      headers:{ Authorization: `Bearer ${this.token}` }
    });
  }
  
  /**
   * Get messages shared by the current user
   */
  getSharedByMe(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/by-me`,{
      headers:{ Authorization: `Bearer ${this.token}` }
    });
  }
  
  /**
   * Create a new encrypted message
   * @param data The message data containing text and recipients
   */
  createEncryptedText(data: {
    text: string;
    receivers: string[];
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}`, data);
  }
  
  /**
   * Get a specific encrypted message by ID
   * @param id The message ID
   */
  getEncryptedText(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
  
  /**
   * Get message by ID
   * @param id The message ID
   */
  getMessageById(id: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${id}`);
  }
  
  /**
   * Encrypt and send a text message
   * @param message The plaintext message
   * @param recipients Array of recipient user IDs
   * @param password The encryption password
   */
  encryptAndSendText(message: string, recipients: string[], password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/encrypt-and-send`, {
      message,
      recipients,
      password
    });
  }
  
  /**
   * Decrypt a message
   * @param id The message ID
   * @param password The decryption password
   */
  decryptText(id: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/decrypt/${id}`, { password });
  }
  
  /**
   * Delete a message
   * @param id The message ID
   */
  deleteText(id: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${id}`);
  }
  
  /**
   * Mark a message as read
   * @param id The message ID
   */
  markAsRead(id: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/mark-read/${id}`, {});
  }
  
  /**
   * Get an observable for text updates (used for real-time updates)
   */
  getTextUpdates(): Observable<void> {
    return this.textUpdateSubject.asObservable();
  }
  
  /**
   * Get unread message count
   */
  getUnreadCount(): Observable<{count: number}> {
    return this.http.get<{count: number}>(`${this.apiUrl}/unread-count`);
  }
} 