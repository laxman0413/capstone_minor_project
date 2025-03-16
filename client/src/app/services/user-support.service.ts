import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserTicketService {
  private apiUrl = 'http://localhost:5000/api/tickets';

  constructor(private http: HttpClient) {}

  private getAuthToken(): string {
    const token = localStorage.getItem('authToken');
    if (!token) {
      console.error('Auth token not found');
    }
    return token || '';
  }

  async getUserTickets() {
    try {
      return await firstValueFrom(
        this.http.get(`${this.apiUrl}/user`, {
          headers: { Authorization: `Bearer ${this.getAuthToken()}` }
        })
      );
    } catch (error) {
      this.handleError(error, 'Error fetching user tickets');
      throw error;
    }
  }

  async createTicket(ticketData: { issue: string; priority: string }) {
    try {
      return await firstValueFrom(
        this.http.post(`${this.apiUrl}`, ticketData, {
          headers: { Authorization: `Bearer ${this.getAuthToken()}` }
        })
      );
    } catch (error) {
      this.handleError(error, 'Error creating ticket');
      throw error;
    }
  }

  async getTicketMessages(ticketId: string) {
    try {
      return await firstValueFrom(
        this.http.get(`${this.apiUrl}/${ticketId}/messages`, {
          headers: { Authorization: `Bearer ${this.getAuthToken()}` }
        })
      );
    } catch (error) {
      this.handleError(error, 'Error fetching ticket messages');
      throw error;
    }
  }

  private handleError(error: any, defaultMessage: string): void {
    console.error(defaultMessage, error);
    
    if (error instanceof HttpErrorResponse) {
      if (error.status === 401) {
        console.error('Authentication error. Token may be invalid or expired.');
        // You could implement token refresh logic here or redirect to login
      }
    }
  }
}