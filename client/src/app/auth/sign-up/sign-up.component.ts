import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-sign-up',
  imports: [FormsModule,CommonModule,RouterModule],
  templateUrl: './sign-up.component.html',
  styleUrl: './sign-up.component.css'
})
export class SignUpComponent {
  enteredEmail: string = '';
  enteredName: string = '';
  enteredPhone: string = '';
  enteredPassword: string = '';
  selectedFile: File | null = null;
  imagePreview: string | ArrayBuffer | null = null;
  fileError: string = '';
  errorMessage = '';

  constructor(private authService: AuthService,private router:Router,private toastr:ToastrService) {}

  onFileSelected(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files.length > 0) {
      const file = fileInput.files[0];

      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        this.fileError = 'Only image files are allowed!';
        this.selectedFile = null;
        this.imagePreview = null;
        return;
      }

      if(file.size > 1024 * 1024 * 5){
        this.fileError = 'File size must be less than 5MB!';
        this.selectedFile = null;
        this.imagePreview = null;
        return;
      }

      this.selectedFile = file;
      this.fileError = '';

      // Read the image file and preview it
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result;
      };
      reader.readAsDataURL(file);
    }
  }

  async onSubmit() {
    try {
      if (!this.selectedFile) {
        this.errorMessage = 'Profile image is required!';
        return;
      }

      const userData = {
        email: this.enteredEmail,
        password: this.enteredPassword,
        name: this.enteredName,
        phone: this.enteredPhone,
        profileImage: this.selectedFile,
      };

      const response = await this.authService.signUp(userData);
      this.toastr.success("SignUp SuccessFul","",{positionClass:"toast-top-center"})
      window.location.href= '/dashboard'
    } catch (error:any) {
      this.errorMessage = error.message || 'Signup failed!';
      this.toastr.error(this.errorMessage, '', { positionClass: 'toast-top-center' });
    }
  }
}
