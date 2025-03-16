import { Component, OnInit, OnDestroy, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { TextService } from '../../../services/text.service';
import { NotificationService } from '../../../services/notification.service';
import { MatDialog } from '@angular/material/dialog';

import { ConfirmDialogComponent } from '../../../shared/confirm-dialog/confirm-dialog.component';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { EncryptTextService } from '../../../services/encrypt-text.service';

@Component({
  selector: 'app-text',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
  ],
  templateUrl: './text.component.html',
  styleUrls: ['./text.component.css']
})
export class TextComponent implements OnInit, OnDestroy {
  Math = Math;
  
  loadingSharedWithMe = true;
  loadingSharedByMe = true;
  sharedWithMe: any[] = [];
  sharedByMe: any[] = [];
  sharedWithMeCurrentPage = 1;
  sharedByMeCurrentPage = 1;
  itemsPerPage = 2;
  decryptedMessages: { [id: string]: string } = {}; // Store decrypted text per item
  errorMessages: { [id: string]: string } = {};
  error = '';
  loading = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private textService: TextService,
    private notificationService: NotificationService,
    private dialog: MatDialog,
    private encryptService: EncryptTextService,
    private toastr:ToastrService
  ) { }

  ngOnInit(): void {
    this.loadSharedWithMe();
    this.loadSharedByMe();
    
    const textUpdateSub = this.textService.getTextUpdates().subscribe(() => {
      this.refreshMessages();
    });
    this.subscriptions.push(textUpdateSub);
  }
  
  
  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
  
  loadSharedWithMe(): void {
    this.loadingSharedWithMe = true;

    const sub = this.textService.getSharedWithMe().subscribe({
      next: (data) => {
        this.sharedWithMe = (data.sharedFiles || []).sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        this.loadingSharedWithMe = false;
        console.log(this.sharedWithMe);
      },
      error: (error) => {
        console.error('Error loading shared messages:', error);
        this.notificationService.error('Could not load messages shared with you.');
        this.loadingSharedWithMe = false;
      }
    });

    this.subscriptions.push(sub);
  }

  loadSharedByMe(): void {
    this.loadingSharedByMe = true;

    const sub = this.textService.getSharedByMe().subscribe({
      next: (data) => {
        this.sharedByMe = (data.data || []).sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());;
        this.loadingSharedByMe = false;
      },
      error: (error) => {
        console.error('Error loading your shared messages:', error);
        this.notificationService.error('Could not load messages you have shared.');
        this.loadingSharedByMe = false;
      }
    });

    this.subscriptions.push(sub);
  }
  
  refreshMessages(): void {
    this.loadSharedWithMe();
    this.loadSharedByMe();
  }
  
  deleteText(id: string, messageType: 'received' | 'sent'): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      data: {
        title: 'Delete Encrypted Message',
        message: 'Are you sure you want to delete this encrypted message? This action cannot be undone.',
        confirmText: 'Delete',
        cancelText: 'Cancel'
      }
    });

    const sub = dialogRef.afterClosed().subscribe(result => {
      if (result) {
        const deleteSub = this.textService.deleteText(id).subscribe({
          next: () => {
            this.notificationService.success('Message deleted successfully.');
            
            if (messageType === 'received') {
              this.sharedWithMe = this.sharedWithMe.filter(item => item._id !== id);
            } else {
              this.sharedByMe = this.sharedByMe.filter(item => item._id !== id);
            }
          },
          error: (error) => {
            console.error('Error deleting message:', error);
            this.notificationService.error('Could not delete message. Please try again.');
          }
        });

        this.subscriptions.push(deleteSub);
      }
    });

    this.subscriptions.push(sub);
  }
  
  openEncryption(): void {
    window.location.href = '/encrypt-text';
  }
  
  decrypt(encryptedTextId: string) {
    this.decryptedMessages={};
    this.loading = true;
    this.encryptService.decryptText(encryptedTextId).subscribe({
      next: response => {
        this.decryptedMessages[encryptedTextId] = response.text; 
        this.loading = false;
        this.toastr.success('Message decrypted successfully');
      },
      error: err => {
        this.errorMessages[encryptedTextId] = 'Decryption failed: ' + (err.error?.message || err.message);
        this.loading = false;
        this.toastr.error(this.error);
      }
    });
  }
  
  updateSharedWithMePage(offset: number): void {
    const newPage = this.sharedWithMeCurrentPage + offset;
    const maxPage = Math.ceil(this.sharedWithMe.length / this.itemsPerPage);

    if (newPage >= 1 && newPage <= maxPage) {
      this.sharedWithMeCurrentPage = newPage;
    }
  }
  
  updateSharedByMePage(offset: number): void {
    const newPage = this.sharedByMeCurrentPage + offset;
    const maxPage = Math.ceil(this.sharedByMe.length / this.itemsPerPage);

    if (newPage >= 1 && newPage <= maxPage) {
      this.sharedByMeCurrentPage = newPage;
    }
  }
  
  getPaginatedSharedWithMe(): any[] {
    const startIndex = (this.sharedWithMeCurrentPage - 1) * this.itemsPerPage;
    return this.sharedWithMe.slice(startIndex, startIndex + this.itemsPerPage);
  }
  
  getPaginatedSharedByMe(): any[] {
    const startIndex = (this.sharedByMeCurrentPage - 1) * this.itemsPerPage;
    return this.sharedByMe.slice(startIndex, startIndex + this.itemsPerPage);
  }
  
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
  
  getUserInitials(name: string): string {
    if (!name) return '?';

    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }

    return name.substring(0, 2).toUpperCase();
  }
}
