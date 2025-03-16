import { Component, OnInit, OnDestroy, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
  navigate: string = '/dashboard';
  animationObserver: IntersectionObserver | null = null;

  constructor(private authService: AuthService) {}

  ngOnInit(): void {
    // Check if user is logged in
    const token = localStorage.getItem('authToken');
    if (!token) {
      this.navigate = '/sign-in';
    }

    // Setup scroll animations
    this.setupScrollAnimations();
  }

  ngAfterViewInit(): void {
    // Trigger initial animations check
    this.checkScrollAnimations();
  }

  ngOnDestroy(): void {
    // Clean up observer
    if (this.animationObserver) {
      this.animationObserver.disconnect();
    }
  }

  @HostListener('window:scroll', ['$event'])
  onWindowScroll(): void {
    this.checkScrollAnimations();
  }

  private setupScrollAnimations(): void {
    const options = {
      root: null,
      rootMargin: '0px',
      threshold: 0.1
    };

    this.animationObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          // Once the animation has played, no need to observe this element anymore
          observer.unobserve(entry.target);
        }
      });
    }, options);

    // Get all elements that should animate on scroll
    setTimeout(() => {
      const animatedElements = document.querySelectorAll('.animate-on-scroll');
      animatedElements.forEach(el => {
        this.animationObserver?.observe(el);
      });
    }, 100);
  }

  private checkScrollAnimations(): void {
    const animatedElements = document.querySelectorAll('.animate-on-scroll:not(.visible)');
    
    animatedElements.forEach(element => {
      const rect = element.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      
      // If element is in viewport
      if (rect.top <= windowHeight * 0.8) {
        element.classList.add('visible');
      }
    });
  }
}
