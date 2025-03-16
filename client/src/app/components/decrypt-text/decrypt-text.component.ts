import { Component, OnInit } from '@angular/core';
import { EncryptTextService } from '../../services/encrypt-text.service';
import { ToastrService } from 'ngx-toastr';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-decrypt-text',
  templateUrl: './decrypt-text.component.html',
  styleUrls: ['./decrypt-text.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class DecryptTextComponent implements OnInit {
  sharedWithMe: any[] = [];
  selectedMessage: any = null;
  decryptedMessage: string = '';
  error: string = '';
  loading: boolean = false;
  isLoading: boolean = false;
  copySuccess: boolean = false;
  // Pagination properties
  sharedWithMePage: number = 1;
  itemsPerPage: number = 5;

  constructor(private encryptService: EncryptTextService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    this.encryptService.getSharedWithMe().subscribe({
      next: response => {
        if (response?.success) {
          this.sharedWithMe = (response.sharedFiles || []).sort((a: { createdAt: string }, b: { createdAt: string }) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          if (this.sharedWithMe.length > 0) {
            this.selectMessage(this.sharedWithMe[0]);
          }
        }
      },
      error: err => console.error('Error fetching shared files:', err)
    });
  }

  selectMessage(message: any) {
    this.selectedMessage = message;
    this.decryptedMessage = ''; // Reset previous decryption result
    this.error = '';
  }

  decrypt() {
    if (!this.selectedMessage) return;
    this.loading = true;
    this.encryptService.decryptText(this.selectedMessage._id).subscribe({
      next: response => {
        this.decryptedMessage = response.text;
        this.loading = false;
        this.toastr.success('Message decrypted successfully');
      },
      error: err => {
        this.error = 'Decryption failed: ' + (err.error?.message || err.message);
        this.loading = false;
        this.toastr.error(this.error);
      }
    });
  }

  // Pagination methods
  getPaginatedSharedWithMe() {
    const startIndex = (this.sharedWithMePage - 1) * this.itemsPerPage;
    return this.sharedWithMe.slice(startIndex, startIndex + this.itemsPerPage);
  }

  nextPage() {
    if (this.sharedWithMePage * this.itemsPerPage < this.sharedWithMe.length) {
      this.sharedWithMePage++;
      this.selectMessage(this.getPaginatedSharedWithMe()[0]);
    }
  }

  prevPage() {
    if (this.sharedWithMePage > 1) {
      this.sharedWithMePage--;
      this.selectMessage(this.getPaginatedSharedWithMe()[0]);
    }
  }

  copyToClipboard() {
    if (!this.decryptedMessage) return;
    
    navigator.clipboard.writeText(this.decryptedMessage).then(() => {
      this.copySuccess = true;
      this.toastr.success('Text copied to clipboard');
      setTimeout(() => {
        this.copySuccess = false;
      }, 3000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
      this.error = 'Failed to copy to clipboard';
    });
  }
}
