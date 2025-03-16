// mask-text.component.ts
import { Component } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mask-text',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './mask-text.component.html',
  styleUrls: ['./mask-text.component.css']
})
export class MaskTextComponent {
  inputText: string = '';
  outputText: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  copySuccess: boolean = false;

  constructor(private http: HttpClient) {}

  maskText() {
    if (!this.inputText) {
      this.errorMessage = 'Please enter some text to mask';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.http.post<any>('http://localhost:5000/encrypt/replace-chars', {
      text: this.inputText
    }).subscribe({
      next: (response) => {
        this.outputText = response.encryptedText;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error masking text:', error);
        this.errorMessage = 'Failed to mask text. Please try again.';
        this.isLoading = false;
      }
    });
  }

  clearText() {
    this.inputText = '';
    this.outputText = '';
    this.errorMessage = '';
  }

  copyToClipboard() {
    if (!this.outputText) return;
    
    navigator.clipboard.writeText(this.outputText).then(() => {
      this.copySuccess = true;
      setTimeout(() => {
        this.copySuccess = false;
      }, 3000);
    }).catch(err => {
      console.error('Could not copy text: ', err);
      this.errorMessage = 'Failed to copy to clipboard';
    });
  }
}