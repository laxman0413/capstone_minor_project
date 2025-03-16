import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule,Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-sign-in',
  imports: [FormsModule,CommonModule,RouterModule],
  templateUrl: './sign-in.component.html',
  styleUrl: './sign-in.component.css'
})
export class SignInComponent {
  enteredEmail = '';
  enteredPassword = '';
  errorMessage = '';

  constructor(private authService: AuthService, private router: Router,private toastr:ToastrService) {}

  async onSubmit() {
    try {
      const credentials = {
        email: this.enteredEmail,
        password: this.enteredPassword,
      };

      const response = await this.authService.signIn(credentials);
      this.toastr.success("SignIn SuccessFul","",{positionClass:"toast-top-center"})
      window.location.href= '/dashboard'
    } catch (error:any) {
      this.errorMessage = error.message || 'Invalid credentials!';
      this.toastr.error(error.message,"",{positionClass:"toast-top-center"})
    }
  }
}
