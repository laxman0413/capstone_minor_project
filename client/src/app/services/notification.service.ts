import { Injectable } from '@angular/core';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private toastPosition = 'toast-bottom-right';
  private toastTimeout = 3000;
  
  constructor(private toastr: ToastrService) { }
  
  /**
   * Display a success notification
   * @param message The message to display
   * @param title Optional title for the notification
   * @param options Additional configuration options
   */
  success(message: string, title?: string, options?: any): void {
    this.toastr.success(
      message, 
      title || 'Success', 
      { 
        positionClass: this.toastPosition, 
        timeOut: this.toastTimeout,
        ...options 
      }
    );
  }
  
  /**
   * Display an error notification
   * @param message The message to display
   * @param title Optional title for the notification
   * @param options Additional configuration options
   */
  error(message: string, title?: string, options?: any): void {
    this.toastr.error(
      message, 
      title || 'Error', 
      { 
        positionClass: this.toastPosition, 
        timeOut: this.toastTimeout,
        ...options 
      }
    );
  }
  
  /**
   * Display a warning notification
   * @param message The message to display
   * @param title Optional title for the notification
   * @param options Additional configuration options
   */
  warning(message: string, title?: string, options?: any): void {
    this.toastr.warning(
      message, 
      title || 'Warning', 
      { 
        positionClass: this.toastPosition, 
        timeOut: this.toastTimeout,
        ...options 
      }
    );
  }
  
  /**
   * Display an info notification
   * @param message The message to display
   * @param title Optional title for the notification
   * @param options Additional configuration options
   */
  info(message: string, title?: string, options?: any): void {
    this.toastr.info(
      message, 
      title || 'Information', 
      { 
        positionClass: this.toastPosition, 
        timeOut: this.toastTimeout,
        ...options 
      }
    );
  }
  
  /**
   * Clear all currently visible notifications
   */
  clearAll(): void {
    this.toastr.clear();
  }
} 