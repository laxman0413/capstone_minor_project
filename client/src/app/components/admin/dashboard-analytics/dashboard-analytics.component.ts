import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js/auto';
import { AdminService, FullAnalyticsResponse } from '../../../services/admin.service';

Chart.register(...registerables);

@Component({
  selector: 'app-dashboard-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard-analytics.component.html',
  styleUrls: ['./dashboard-analytics.component.css']
})
export class DashboardAnalyticsComponent implements OnInit, AfterViewInit {
  @ViewChild('userGrowthChart') userGrowthChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('documentUploadsChart') documentUploadsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('documentTypesChart') documentTypesChartRef!: ElementRef<HTMLCanvasElement>;

  loading = true;
  error = '';
  analytics: FullAnalyticsResponse | null = null;
  
  charts: Chart[] = [];
  
  // Stats summary
  totalUsers = 0;
  totalDocuments = 0;
  maskedDocuments = 0;
  sharedTexts = 0;
  
  // Month names for chart labels
  monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  constructor(private adminService: AdminService) {}

  ngOnInit() {
    this.loadAnalytics();
  }
  
  ngAfterViewInit() {
    // Charts will be initialized after data is loaded
  }

  async loadAnalytics() {
    try {
      this.analytics = await this.adminService.getFullAnalytics();
      
      // Set summary stats
      if (this.analytics) {
        this.totalUsers = this.analytics.totalUsers;
        this.totalDocuments = this.analytics.totalDocuments;
        this.maskedDocuments = this.analytics.maskedDocuments;
        this.sharedTexts = this.analytics.sharedTexts;
      }
      
      this.loading = false;
      
      // Initialize charts after data is loaded
      setTimeout(() => {
        this.initializeCharts();
      }, 0);
    } catch (err) {
      console.error('Analytics Error:', err);
      this.error = 'Failed to load analytics';
      this.loading = false;
    }
  }

  initializeCharts() {
    if (!this.analytics) return;
    
    // Destroy any existing charts
    this.charts.forEach(chart => chart.destroy());
    this.charts = [];
    
    // Create all charts
    this.createUserGrowthChart();
    this.createDocumentUploadsChart();
    this.createDocumentTypesChart();
  }

  createUserGrowthChart() {
    if (!this.analytics || !this.userGrowthChartRef) return;
    
    const ctx = this.userGrowthChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Check if userGrowth exists and has data
    if (!this.analytics.userGrowth || this.analytics.userGrowth.length === 0) return;
    
    // Prepare data
    const labels = this.analytics.userGrowth.map(item => 
      `${this.monthNames[item._id.month - 1]} ${item._id.year}`
    );
    
    const data = this.analytics.userGrowth.map(item => item.count);
    
    // Create chart
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'New Users',
          data: data,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'User Growth (Last 6 Months)'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
    
    this.charts.push(chart);
  }

  createDocumentUploadsChart() {
    if (!this.analytics || !this.documentUploadsChartRef) return;
    
    const ctx = this.documentUploadsChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Check if documentUploads exists and has data
    if (!this.analytics.documentUploads || this.analytics.documentUploads.length === 0) return;
    
    // Prepare data
    const labels = this.analytics.documentUploads.map(item => 
      `${this.monthNames[item._id.month - 1]} ${item._id.year}`
    );
    
    const data = this.analytics.documentUploads.map(item => item.count);
    
    // Create chart
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Document Uploads',
          data: data,
          backgroundColor: 'rgba(54, 162, 235, 0.5)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Document Uploads (Last 6 Months)'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0
            }
          }
        }
      }
    });
    
    this.charts.push(chart);
  }

  createDocumentTypesChart() {
    if (!this.analytics || !this.documentTypesChartRef) return;
    
    const ctx = this.documentTypesChartRef.nativeElement.getContext('2d');
    if (!ctx) return;
    
    // Check if documentTypes exists and has data
    if (!this.analytics.documentTypes || this.analytics.documentTypes.length === 0) return;
    
    // Prepare data
    const labels = this.analytics.documentTypes.map(item => item._id);
    const data = this.analytics.documentTypes.map(item => item.count);
    
    // Create chart
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            'rgba(255, 99, 132, 0.5)',
            'rgba(54, 162, 235, 0.5)',
            'rgba(255, 206, 86, 0.5)',
            'rgba(75, 192, 192, 0.5)',
            'rgba(153, 102, 255, 0.5)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          title: {
            display: true,
            text: 'Document Types Distribution'
          },
          legend: {
            position: 'right'
          }
        }
      }
    });
    
    this.charts.push(chart);
  }
} 