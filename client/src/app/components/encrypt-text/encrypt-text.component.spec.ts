import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { UserService } from '../../services/user.service';
import { EncryptTextService } from '../../services/encrypt-text.service';

@Component({
  selector: 'app-encrypt-text',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './encrypt-text.component.html',
  styleUrls: ['./encrypt-text.component.css']
})
export class EncryptTextComponent implements OnInit {
  text = '';
  receiverId = '';
  searchTerm = '';
  users: any[] = [];
  filteredUsers: any[]= [];
  selectedUser: any | null = null;
  encryptedMessage = '';
  decryptedMessage = '';
  loading = false;
  error = '';

  constructor(
    private http: HttpClient, 
    private userService: UserService,
    private encryptService: EncryptTextService
  ) {}

  ngOnInit() {}

  async fetchUsers() {
    this.loading = true;
    console.log(this.searchTerm);
    this.users = await this.userService.getUsers(this.searchTerm);
    this.filterUsers();
    this.loading = false;
  }

  filterUsers() {
    this.filteredUsers = this.searchTerm.trim()
      ? this.users.filter(user => 
          user.name.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
          user.email.toLowerCase().includes(this.searchTerm.toLowerCase())
        )
      : this.users;
  }

  selectUser(user: any) {
    this.receiverId = user.id;
    this.selectedUser = user;
    this.filteredUsers = []; // Clear the dropdown after selection
  }

  handleEncrypt() {
    if (!this.text) {
      this.error = 'Please enter text to encrypt';
      return;
    }

    if (!this.receiverId) {
      this.error = 'Please select a recipient';
      return;
    }

    this.loading = true;
    this.error = '';
    const id = localStorage.getItem('userId') || 'currentUserId';

    this.encryptService.encryptText(id, this.receiverId, this.text).subscribe({
      next: response => {
        this.encryptedMessage = response.encryptedText;
        this.loading = false;
        this.text = ''; // Clear the input after successful encryption
      },
      error: err => {
        this.error = 'Encryption failed: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }

  decrypt(encryptedText: string) {
    this.loading = true;

    this.encryptService.decryptText(encryptedText).subscribe({
      next: response => {
        this.decryptedMessage = response.decryptedText;
        this.loading = false;
      },
      error: err => {
        this.error = 'Decryption failed: ' + (err.error?.message || err.message);
        this.loading = false;
      }
    });
  }
}