import { Injectable } from '@angular/core';
import axios from 'axios';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:5000/api/users';

  // Get updated token for each request
  private getToken(): string | null {
    return localStorage.getItem("authToken");
  }

  // Get user profile
  async getUserProfile() {
    try {
      const response = await axios.get(`${this.apiUrl}/profile`, {
        headers: { Authorization: `Bearer ${this.getToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error("Error fetching user profile:", error);
      throw error;
    }
  }

  // Update user profile
  async updateUserProfile(userData: any) {
    try {
      const response = await axios.put(`${this.apiUrl}/profile`, userData, {
        headers: { Authorization: `Bearer ${this.getToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error("Error updating profile:", error);
      throw error;
    }
  }

  // Update only the profile image
  async updateProfileImage(file: File) {
    try {
      const formData = new FormData();
      if (file) {
        formData.append('file', file);
      }
      const response = await axios.post(`${this.apiUrl}/update-profile-image`, formData, {
        headers: {
          Authorization: `Bearer ${this.getToken()}`
        }
      });
      return response.data;
    } catch (error) {
      console.error("Error updating profile image:", error);
      throw error;
    }
  }


  // Change password
  async changePassword(newPassword: string) {
    try {
      const response = await axios.post(`${this.apiUrl}/change-password`, { password: newPassword }, {
        headers: { Authorization: `Bearer ${this.getToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error("Error changing password:", error);
      throw error;
    }
  }

  // Delete user account
  async deleteUser() {
    try {
      const response = await axios.delete(`${this.apiUrl}/delete`, {
        headers: { Authorization: `Bearer ${this.getToken()}` }
      });
      return response.data;
    } catch (error) {
      console.error("Error deleting user:", error);
      throw error;
    }
  }
}
