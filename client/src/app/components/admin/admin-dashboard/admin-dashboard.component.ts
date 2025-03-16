import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { AdminService } from '../../../services/admin.service';
import { Router } from '@angular/router';
import { SupportTicketComponent } from "../support-ticket/support-ticket.component";
import { DashboardAnalyticsComponent } from "../dashboard-analytics/dashboard-analytics.component";
import { ActivityLogsComponent } from "../activity-logs/activity-logs.component";


@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    SupportTicketComponent,
    DashboardAnalyticsComponent,
    ActivityLogsComponent
],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css']
})
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private ticketSubscription?: Subscription;

  constructor(
    private adminService: AdminService,
    private router: Router
  ) {}

  ngOnInit() {
    // Future implementation for real-time updates if needed
  }

  ngOnDestroy() {
    if (this.ticketSubscription) {
      this.ticketSubscription.unsubscribe();
    }
  }

  signOut() {
    this.adminService.logout();
    this.router.navigate(['/admin/login']);
  }
}