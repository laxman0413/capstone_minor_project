import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TextService } from '../../services/text.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-decryption-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="decryption-dialog">
      <h2 mat-dialog-title>Decrypt Message</h2>
      <div mat-dialog-content>
        <div *ngIf="!message && !loading && !decryptedContent">
          <form [formGroup]="decryptionForm">
            <div class="form-group">
              <label for="password">Decryption Password</label>
              <input 
                type="password" 
                id="password" 
                formControlName="password" 
                placeholder="Enter the password to decrypt this message"
              />
              <div class="error-message" *ngIf="decryptionForm.get('password')?.invalid && decryptionForm.get('password')?.touched">
                <span *ngIf="decryptionForm.get('password')?.errors?.['required']">Password is required</span>
              </div>
            </div>
          </form>
        </div>
        
        <div class="status-info" *ngIf="loading">
          <div class="spinner"></div>
          <p>Decrypting message...</p>
        </div>
        
        <div class="error-container" *ngIf="errorMessage">
          <div class="error-message">
            <i class="fas fa-exclamation-circle"></i> {{ errorMessage }}
          </div>
        </div>
        
        <div class="decrypted-content" *ngIf="decryptedContent">
          <div class="message-info">
            <div class="message-sender">
              <strong>From:</strong> {{ message?.sender?.name || 'Unknown User' }}
            </div>
            <div class="message-date">
              <strong>Date:</strong> {{ formatDate(message?.createdAt || '') }}
            </div>
          </div>
          
          <div class="content-box">
            <p>{{ decryptedContent }}</p>
          </div>
        </div>
      </div>
      <div mat-dialog-actions>
        <button type="button" class="btn btn-secondary" (click)="closeDialog()">Close</button>
        <button 
          type="submit" 
          class="btn btn-primary" 
          [disabled]="decryptionForm.invalid || loading" 
          (click)="decryptMessage()"
          *ngIf="!decryptedContent">
          <i class="fas fa-unlock"></i> Decrypt
        </button>
      </div>
    </div>
  `,
  styles: [`
    .decryption-dialog {
      padding: 1rem;
    }
    
    .form-group {
      margin-bottom: 1.5rem;
    }
    
    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
    
    input {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }
    
    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    
    .status-info {
      display: flex;
      align-items: center;
      margin: 1rem 0;
    }
    
    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 3px solid rgba(0, 0, 0, 0.1);
      border-radius: 50%;
      border-top-color: #007bff;
      animation: spin 1s ease-in-out infinite;
      margin-right: 0.75rem;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .error-container {
      margin-top: 1rem;
      padding: 0.75rem;
      background-color: #f8d7da;
      border: 1px solid #f5c6cb;
      border-radius: 4px;
    }
    
    .decrypted-content {
      margin-top: 1rem;
    }
    
    .message-info {
      margin-bottom: 1rem;
      display: flex;
      justify-content: space-between;
    }
    
    .content-box {
      padding: 1rem;
      background-color: #f8f9fa;
      border: 1px solid #e9ecef;
      border-radius: 4px;
      white-space: pre-wrap;
    }
  `]
})
export class DecryptionDialogComponent implements OnInit {
  decryptionForm: FormGroup;
  message: any = null;
  decryptedContent: string | null = null;
  loading = false;
  errorMessage = '';

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<DecryptionDialogComponent>,
    private textService: TextService,
    private notificationService: NotificationService,
    @Inject(MAT_DIALOG_DATA) public data: { messageId: string }
  ) {
    this.decryptionForm = this.fb.group({
      password: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (this.data && this.data.messageId) {
      this.loadMessageDetails();
    } else {
      this.errorMessage = 'No message ID provided.';
    }
  }

  loadMessageDetails(): void {
    this.loading = true;
    this.textService.getMessageById(this.data.messageId).subscribe({
      next: (message) => {
        this.message = message;
        this.loading = false;
      },
      error: (error) => {
        this.loading = false;
        console.error('Error loading message details:', error);
        this.errorMessage = 'Could not load message details.';
      }
    });
  }

  decryptMessage(): void {
    if (this.decryptionForm.invalid) {
      return;
    }

    const { password } = this.decryptionForm.value;
    
    this.loading = true;
    this.errorMessage = '';
    
    this.textService.decryptText(this.data.messageId, password).subscribe({
      next: (response) => {
        this.loading = false;
        this.decryptedContent = response.decryptedText;
        // Mark as read if successfully decrypted
        this.markAsRead();
      },
      error: (error) => {
        this.loading = false;
        console.error('Error decrypting message:', error);
        this.errorMessage = error.error?.message || 'Failed to decrypt message. Incorrect password?';
      }
    });
  }

  markAsRead(): void {
    if (!this.message.read) {
      this.textService.markAsRead(this.data.messageId).subscribe({
        next: () => {
          // Update local state
          this.message.read = true;
        },
        error: (error) => {
          console.error('Error marking message as read:', error);
        }
      });
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  closeDialog(): void {
    this.dialogRef.close({ 
      viewed: this.decryptedContent !== null 
    });
  }
}