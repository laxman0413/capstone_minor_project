import { Component, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DocumentsComponent } from './documents/documents.component';
import { TextComponent } from './text/text.component';
import { AnalyticsComponent } from './analytics/analytics.component';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, DocumentsComponent, TextComponent, AnalyticsComponent],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css']
})
export class DashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  refreshTrigger = false;
  userName: string | null = null;
  animationObserver: IntersectionObserver | null = null;
  activeTab: string = 'main';

  constructor(
    private titleService: Title,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.refreshTrigger = !this.refreshTrigger; // Toggle to force update
    this.titleService.setTitle('Dashboard - Secure Document Management');
    
    // Get user name from local storage if available
    this.userName = localStorage.getItem('userName');
    
    // Check for query params to set the active tab
    this.route.queryParams.subscribe(params => {
      if (params['tab'] && ['main', 'analytics','text'].includes(params['tab'])) {
        this.activeTab = params['tab'];
      }
    });
  }

  ngAfterViewInit() {
    this.setupScrollAnimations();
  }

  ngOnDestroy() {
    // Clean up the observer when component is destroyed
    if (this.animationObserver) {
      this.animationObserver.disconnect();
    }
  }
  
  setActiveTab(tabName: string) {
    this.activeTab = tabName;
    
    // Update URL with the active tab
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { tab: tabName },
      queryParamsHandling: 'merge'
    });
    
    // Update page title based on active tab
    if (tabName === 'analytics') {
      this.titleService.setTitle('Analytics - Secure Document Management');
    } else {
      this.titleService.setTitle('Dashboard - Secure Document Management');
    }
  }

  private setupScrollAnimations() {
    // Set up intersection observer for scroll animations
    this.animationObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            // Once the animation has played, no need to observe this element anymore
            this.animationObserver?.unobserve(entry.target);
          }
        });
      },
      {
        root: null, // Use viewport as root
        threshold: 0.1, // Trigger when 10% of the element is visible
        rootMargin: '0px 0px -50px 0px' // Adjust the trigger point
      }
    );

    // Observe all elements with the animate-on-scroll class
    document.querySelectorAll('.animate-on-scroll').forEach(element => {
      this.animationObserver?.observe(element);
    });
  }
}
