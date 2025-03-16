import { Component, Inject, ViewEncapsulation } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatInputModule } from '@angular/material/input';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-delete',
  templateUrl: './confirm-delete.component.html',
  standalone: true,
  imports: [FormsModule, MatDialogModule, MatInputModule, CommonModule],
  styleUrls: ['./confirm-delete.component.css']
})
export class ConfirmDeleteComponent {
  userInput: string = '';
  isValidInput: boolean = false;

  constructor(
    public dialogRef: MatDialogRef<ConfirmDeleteComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { fileName: string }
  ) {}

  checkInput(): void {
    this.isValidInput = this.userInput.trim().toUpperCase() === 'DELETE';
  }  

  confirmDelete(): void {
    if (this.isValidInput) {
      this.dialogRef.close(true);
    }
  }

  closeDialog(): void {
    this.dialogRef.close(false);
  }
}