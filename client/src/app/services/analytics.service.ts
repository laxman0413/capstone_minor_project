import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';


export interface UsageMetrics {
  totalDocuments: number;
  documentsThisMonth: number;
  documentDate:number[];
  documentsProcessed: {
    adhaar: number;
    pan: number;
    driving_license: number;
    other: number;
  };
  savedVsDirectDownloads: {
    saved: number;
    directDownloads: number;
  };
  totalStorageUsed: number; // in bytes
}

@Injectable({
  providedIn: 'root'
})
export class AnalyticsService {
  private apiUrl = `${environment.apiUrl}/api/analytics`;

  private token= localStorage.getItem('authToken');

  constructor(private http:HttpClient){}
  /**
   * Get user usage metrics
   */
  getUserMetrics(): Observable<UsageMetrics> {
    return this.http.get<UsageMetrics>(`${this.apiUrl}/user-metrics`,{
      headers:{Authorization: `Bearer ${this.token}`}
    }).pipe(
      catchError(error => {
        console.error('Error fetching user metrics:', error);
        // Return default empty metrics in case of error
        return of({
          totalDocuments: 0,
          documentsThisMonth: 0,
          documentDate: Array(12).fill(0),
          documentsProcessed: {
            adhaar: 0,
            pan: 0,
            driving_license: 0,
            other: 0
          },
          savedVsDirectDownloads: {
            saved: 0,
            directDownloads: 0
          },
          totalStorageUsed: 0
        });
      })
    );
  }
} 