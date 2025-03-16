import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { ToastrService, provideToastr } from 'ngx-toastr';


@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.component.html',
  styleUrl: './profile.component.css',
})
export class ProfileComponent implements OnInit {
  user: any = {};
  editMode: boolean = false;
  peditMode:boolean=false;
  selectedFile: File | null = null;
  imagePreview: string | null = null;
  enteredPassword:String='';
  reEnteredPassword:String='';

  constructor(private userService: UserService,private toastr:ToastrService) {}

  async ngOnInit(): Promise<void> {
    await this.getUserProfile();
  }

  async getUserProfile(): Promise<void> {
    try {
      this.user = await this.userService.getUserProfile();
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  }

  onFileSelected(event: any): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(this.selectedFile);
    }
  }

  async uploadProfileImage(): Promise<void> {
    if (!this.selectedFile) return;

    try {
      await this.userService.updateProfileImage(this.selectedFile);
      this.toastr.success('Updated Successfully!', '', { positionClass: 'toast-top-center' });
      await this.getUserProfile(); // Refresh profile data
      this.resetImageState();
    } catch (error) {
      console.error('Error updating profile image:', error);
      this.toastr.error("Error while updating please try again","",{ positionClass: 'toast-top-center' })
    }
  }

  cancelImageUpload(): void {
    this.resetImageState();
  }

  resetImageState(): void {
    this.imagePreview = null;
    this.selectedFile = null;
  }

  async updateProfile(): Promise<void> {
    try {
      const res=await this.userService.updateUserProfile({
        name: this.user.name,
        phone: this.user.phone,
      });
      this.editMode = false;
      this.toastr.success('Updated Successfully!', '', { positionClass: 'toast-top-center' });
      await this.getUserProfile();
    } catch (error) {
      console.error('Error updating profile:', error);
      this.toastr.error("Error while updating please try again","",{ positionClass: 'toast-top-center' })
    }
  }

  async changePassword(): Promise<void> {

    try {
      if(this.enteredPassword===this.reEnteredPassword){
        await this.userService.changePassword(this.enteredPassword.toString());
        this.peditMode=false
        this.toastr.success('Updated Successfully!', '', { positionClass: 'toast-top-center' });
        this.enteredPassword='';
        this.reEnteredPassword='';
      }else{
        this.toastr.error('Password Mismatched!', '', { positionClass: 'toast-top-center' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      this.toastr.error("Error while updating please try again","",{ positionClass: 'toast-top-center' })
    }
  }
}