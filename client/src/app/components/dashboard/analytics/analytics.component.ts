import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, registerables } from 'chart.js';
import { AnalyticsService, UsageMetrics } from '../../../services/analytics.service';
import { Subscription, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';

// Register Chart.js components
Chart.register(...registerables);

@Component({
  selector: 'app-analytics',
  templateUrl: './analytics.component.html',
  styleUrls: ['./analytics.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class AnalyticsComponent implements OnInit, OnDestroy {
  metrics: UsageMetrics | null = null;
  loading: boolean = true;
  error: string | null = null;
  
  // Charts
  documentTypeChart: Chart | null = null;
  documentTrendChart: Chart | null = null;
  
  // Auto-refresh
  private refreshSubscription: Subscription | null = null;
  private readonly REFRESH_INTERVAL = 60000; // 1 minute
  
  constructor(private analyticsService: AnalyticsService) {}

  ngOnInit(): void {
    // Initial loading of data
    this.loadMetrics();
    
    // Set up auto-refresh
    this.refreshSubscription = timer(this.REFRESH_INTERVAL, this.REFRESH_INTERVAL)
      .pipe(
        switchMap(() => {
          // Only reload if the user is viewing the page
          if (document.visibilityState === 'visible') {
            return this.analyticsService.getUserMetrics();
          }
          return [];
        })
      )
      .subscribe({
        next: (metrics) => {
          if (metrics) {
            this.metrics = metrics;
            this.updateCharts();
          }
        },
        error: (error) => {
          console.error('Error refreshing metrics:', error);
        }
      });
  }

  loadMetrics(): void {
    this.loading = true;
    this.error = null;
    
    this.analyticsService.getUserMetrics()
      .subscribe({
        next: (data) => {
          this.metrics = data;
          this.loading = false;
          setTimeout(() => this.initCharts(), 100);
        },
        error: (error) => {
          console.error('Error loading metrics:', error);
          this.error = 'Failed to load analytics data. Please try again later.';
          this.loading = false;
        }
      });
  }

  
  initCharts(): void {
    if (!this.metrics) return;
    
    this.initDocumentTypeChart();
    this.initDocumentTrendChart();
  }
  
  updateCharts(): void {
    if (!this.metrics) return;
    
    if (this.documentTypeChart) {
      this.documentTypeChart.data.datasets[0].data = [
        this.metrics.documentsProcessed.adhaar,
        this.metrics.documentsProcessed.pan,
        this.metrics.documentsProcessed.driving_license,
        this.metrics.documentsProcessed.other
      ];
      this.documentTypeChart.update();
    }
  }
  
  initDocumentTypeChart(): void {
    const ctx = document.getElementById('documentTypeChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    this.documentTypeChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Adhaar', 'PAN', 'Driving License', 'Other'],
        datasets: [{
          data: [
            this.metrics!.documentsProcessed.adhaar,
            this.metrics!.documentsProcessed.pan,
            this.metrics!.documentsProcessed.driving_license,
            this.metrics!.documentsProcessed.other
          ],
          backgroundColor: [
            'rgba(54, 162, 235, 0.7)',
            'rgba(255, 99, 132, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(75, 192, 192, 0.7)'
          ],
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
          },
          title: {
            display: true,
            text: 'Documents by Type'
          }
        }
      }
    });
  }
  
  initDocumentTrendChart(): void {
    const ctx = document.getElementById('documentTrendChart') as HTMLCanvasElement;
    if (!ctx) return;
    
    // Mock data for trend - in a real app, you'd get this from the API
    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const mockData =  this.metrics!.documentDate;
    console.log(mockData);
    this.documentTrendChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Documents Processed',
          data: mockData,
          borderColor: 'rgba(75, 192, 192, 1)',
          backgroundColor: 'rgba(75, 192, 192, 0.2)',
          tension: 0.3,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true
          }
        },
        plugins: {
          title: {
            display: true,
            text: 'Monthly Document Processing Trend'
          }
        }
      }
    });
  }

  
  refreshData(): void {
    this.loadMetrics();
  }

  ngOnDestroy(): void {
    
    // Destroy charts
    if (this.documentTypeChart) {
      this.documentTypeChart.destroy();
    }
    if (this.documentTrendChart) {
      this.documentTrendChart.destroy();
    }
  }
} 