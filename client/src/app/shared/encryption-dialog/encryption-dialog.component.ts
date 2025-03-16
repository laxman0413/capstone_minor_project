import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TextService } from '../../services/text.service';
import { UserService, UserProfile } from '../../services/user.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-encryption-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="encryption-dialog">
      <h2 mat-dialog-title>Encrypt New Message</h2>
      <div mat-dialog-content>
        <form [formGroup]="encryptionForm">
          <div class="form-group">
            <label for="message">Message to Encrypt</label>
            <textarea 
              id="message" 
              formControlName="message" 
              rows="6" 
              placeholder="Enter the message you want to encrypt"
            ></textarea>
            <div class="error-message" *ngIf="encryptionForm.get('message')?.invalid && encryptionForm.get('message')?.touched">
              <span *ngIf="encryptionForm.get('message')?.errors?.['required']">Message is required</span>
            </div>
          </div>
          
          <div class="form-group">
            <label for="recipients">Recipients</label>
            <select id="recipients" formControlName="recipients" multiple>
              <option *ngFor="let user of availableUsers" [value]="user._id">
                {{ user.name }} ({{ user.email }})
              </option>
            </select>
            <div class="error-message" *ngIf="encryptionForm.get('recipients')?.invalid && encryptionForm.get('recipients')?.touched">
              <span *ngIf="encryptionForm.get('recipients')?.errors?.['required']">Select at least one recipient</span>
            </div>
          </div>
          
          <div class="form-group">
            <label for="password">Encryption Password</label>
            <input 
              type="password" 
              id="password" 
              formControlName="password" 
              placeholder="Enter a strong password"
            />
            <div class="error-message" *ngIf="encryptionForm.get('password')?.invalid && encryptionForm.get('password')?.touched">
              <span *ngIf="encryptionForm.get('password')?.errors?.['required']">Password is required</span>
              <span *ngIf="encryptionForm.get('password')?.errors?.['minlength']">Password must be at least 8 characters</span>
            </div>
          </div>
        </form>
        
        <div class="status-info" *ngIf="loading">
          <div class="spinner"></div>
          <p>Encrypting message...</p>
        </div>
      </div>
      <div mat-dialog-actions>
        <button type="button" class="btn btn-secondary" (click)="closeDialog()">Cancel</button>
        <button type="submit" class="btn btn-primary" [disabled]="encryptionForm.invalid || loading" (click)="encryptMessage()">
          <i class="fas fa-lock"></i> Encrypt & Send
        </button>
      </div>
    </div>
  `,
  styles: [`
    .encryption-dialog {
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
    
    textarea, input, select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }
    
    select[multiple] {
      height: 150px;
    }
    
    .error-message {
      color: #dc3545;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    
    .status-info {
      display: flex;
      align-items: center;
      margin-top: 1rem;
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
  `]
})
export class EncryptionDialogComponent implements OnInit {
  encryptionForm: FormGroup;
  availableUsers: UserProfile[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<EncryptionDialogComponent>,
    private textService: TextService,
    private userService: UserService,
    private notificationService: NotificationService,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.encryptionForm = this.fb.group({
      message: ['', [Validators.required]],
      recipients: [[], [Validators.required]],
      password: ['', [Validators.required, Validators.minLength(8)]]
    });
  }

  ngOnInit(): void {
    this.loadAvailableUsers();
  }

  loadAvailableUsers(): void {
    this.userService.getAllUsers().subscribe({
      next: (users: UserProfile[]) => {
        this.availableUsers = users;
      },
      error: (error: any) => {
        console.error('Error loading users:', error);
        this.notificationService.error('Could not load available recipients.');
      }
    });
  }

  encryptMessage(): void {
    if (this.encryptionForm.invalid) {
      return;
    }

    const { message, recipients, password } = this.encryptionForm.value;
    
    this.loading = true;
    this.textService.encryptAndSendText(message, recipients, password).subscribe({
      next: () => {
        this.loading = false;
        this.notificationService.success('Message encrypted and sent successfully.');
        this.dialogRef.close(true);
      },
      error: (error: any) => {
        this.loading = false;
        console.error('Error encrypting message:', error);
        this.notificationService.error('Failed to encrypt and send message.');
      }
    });
  }

  closeDialog(): void {
    this.dialogRef.close(false);
  }
} 