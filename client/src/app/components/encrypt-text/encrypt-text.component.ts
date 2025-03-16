import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EncryptTextService } from '../../services/encrypt-text.service';
import { User } from '../../models/user.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-encrypt-text',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './encrypt-text.component.html',
  styleUrls: ['./encrypt-text.component.css']
})
export class EncryptTextComponent implements OnInit {
  text = '';
  searchTerm = '';
  users: User[] = [];
  selectedUser: User={_id:'',name:'',email:''};
  filteredUsers: User[] = [];
  selectedUsers: User[] = [];
  encryptedMessage = '';
  decryptedMessage = '';
  loading = false;
  error = '';
  maxRecipients = 3;
  encryptedMessageId='';
  constructor(
    private encryptTextService: EncryptTextService,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.fetchUsers();
  }

  fetchUsers() {
    this.loading = true;
    this.encryptTextService.getUsers().subscribe({
      next: (users) => {
        this.users = users;
        this.filterUsers();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to fetch users: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  filterUsers() {
    this.filteredUsers = this.searchTerm.trim()
      ? this.users.filter(user =>
          user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      : this.users;
  }

  selectUser(user: User) {
    if (this.selectedUsers.length >= this.maxRecipients) {
      this.toastr.warning(`Maximum ${this.maxRecipients} recipients allowed`);
      return;
    }
    
    if (!this.selectedUsers.find(u => u._id === user._id)) {
      this.selectedUsers.push(user);
    }
    this.searchTerm = '';
    this.filterUsers();
  }

  removeUser(user: User) {
    this.selectedUsers = this.selectedUsers.filter(u => u._id !== user._id);
  }

  handleEncrypt() {
    if (!this.text) {
      this.toastr.error('Please enter text to encrypt');
      return;
    }

    if (this.selectedUsers.length === 0) {
      this.toastr.error('Please select at least one recipient');
      return;
    }

    this.loading = true;
    this.error = '';
    const userId = localStorage.getItem('userId') || '';
    const receiverIds = this.selectedUsers.map(user => user._id);

    this.encryptTextService.encryptText(userId, receiverIds, this.text).subscribe({
      next: response => {
        this.encryptedMessage = response.encryptedText;
        this.encryptedMessageId=response.encryptedMessageId;
        this.loading = false;
        this.text = '';
        this.toastr.success('Message encrypted successfully');
      },
      error: err => {
        this.error = 'Encryption failed: ' + (err.error?.message || err.message);
        this.loading = false;
        this.toastr.error(this.error);
      }
    });
  }

  decrypt() {
    this.loading = true;

    this.encryptTextService.decryptText(this.encryptedMessageId).subscribe({
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
}