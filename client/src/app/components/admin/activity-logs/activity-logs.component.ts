import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService, ActivityLog, ActivityLogsResponse } from '../../../services/admin.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-activity-logs',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './activity-logs.component.html',
  styleUrls: ['./activity-logs.component.css']
})
export class ActivityLogsComponent implements OnInit {
  activityLogs: ActivityLog[] = [];
  loading = true;
  error = '';
  
  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalLogs = 0;
  limit = 20;
  
  // Filtering
  filterUserId: string = '';

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadActivityLogs();
  }

  async loadActivityLogs() {
    this.loading = true;
    try {
      const response = await this.adminService.getActivityLogs(
        this.currentPage, 
        this.limit, 
        this.filterUserId || undefined
      );
      
      this.activityLogs = response.activityLogs;
      this.totalPages = response.pagination.totalPages;
      this.totalLogs = response.pagination.totalLogs;
      this.error = '';
    } catch (err) {
      console.error('Error loading activity logs:', err);
      this.error = 'Failed to load activity logs';
    } finally {
      this.loading = false;
    }
  }

  getActivityTypeIcon(type: string): string {
    switch (type) {
      case 'upload': return 'fas fa-upload';
      case 'download': return 'fas fa-download';
      case 'mask': return 'fas fa-mask';
      case 'share': return 'fas fa-share-alt';
      case 'delete': return 'fas fa-trash';
      case 'encrypt': return 'fas fa-lock';
      case 'decrypt': return 'fas fa-unlock';
      default: return 'fas fa-info-circle';
    }
  }

  getActivityTypeClass(type: string): string {
    return type.toLowerCase();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  getUserName(userId: any): string {
    if (typeof userId === 'object' && userId !== null) {
      return userId.name || 'Unknown User';
    }
    return 'Unknown User';
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.loadActivityLogs();
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.loadActivityLogs();
    }
  }

  applyFilter() {
    this.currentPage = 1;
    this.loadActivityLogs();
  }

  clearFilter() {
    this.filterUserId = '';
    this.currentPage = 1;
    this.loadActivityLogs();
  }
} 