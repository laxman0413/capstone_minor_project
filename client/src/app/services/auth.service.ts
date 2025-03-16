import { Injectable } from '@angular/core';
import axios from 'axios';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth'; // Replace with your backend URL

  private isLoggedInSubject = new BehaviorSubject<boolean>(this.checkLoginStatus());
  isLoggedIn$ = this.isLoggedInSubject.asObservable();
  
  constructor() {}

  // Signup Method
  async signUp(userData: { email: string; password: string; name: string; phone: string; profileImage?: File }) {
    try {
      const formData = new FormData();
      formData.append('email', userData.email);
      formData.append('password', userData.password);
      formData.append('name', userData.name);
      formData.append('phone', userData.phone);
      if (userData.profileImage) {
        formData.append('file', userData.profileImage);
      }

      const response = await axios.post(`${this.apiUrl}/signup`, formData);
      this.storeToken(response.data.token);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || 'Signup failed!';
    }
  }

  // Signin Method
  async signIn(credentials: { email: string; password: string }) {
    try {
      const response = await axios.post(`${this.apiUrl}/signin`, credentials);
      this.storeToken(response.data.token);
      return response.data;
    } catch (error: any) {
      throw error.response?.data || 'Login failed!';
    }
  }

  // Store Token
  storeToken(token: string) {
    localStorage.setItem('authToken', token);
    this.isLoggedInSubject.next(true);
  }

  // Get Token
  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  // Logout
  logout() {
    localStorage.removeItem('authToken');
    this.isLoggedInSubject.next(false);
  }

  checkLoginStatus(): boolean {
    return !!localStorage.getItem('authToken'); // Example check based on token
  }
}
