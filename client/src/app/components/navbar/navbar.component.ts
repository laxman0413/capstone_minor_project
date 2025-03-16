import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { Subscription } from 'rxjs';
import { SocketService } from '../../services/socket.service';
import { ToastrService } from 'ngx-toastr';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
  description: string;
  isDisplay:boolean;
}

interface Notification {
  id: string;
  message: string;
  time: Date;
  read: boolean;
  icon: string;
  type: string;
}

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.css']
})
export class NavbarComponent implements OnInit, OnDestroy {
  isLogin: boolean = false;
  showMobileMenu: boolean = false;
  showNotifications: boolean = false;
  notificationCount: number = 0;
  notifications: Notification[] = [];
  private subscriptions: Subscription[] = [];


  constructor(
    private router: Router,
    private socketService: SocketService,
    private toastr: ToastrService
  ) {}

  navigation: NavigationItem[] = []

  ngOnInit(): void {
    // Check if user is logged in
    this.isLogin = !!localStorage.getItem('authToken');
    
    // Listen for new encrypted messages
    this.subscriptions.push(
      this.socketService.listenToEncryptedMessages().subscribe(notification => {
        this.addNotification({
          id: notification.messageId,
          message: `New encrypted message from ${notification.senderName}`,
          time: notification.timestamp,
          read: false,
          icon: 'fas fa-lock',
          type: 'encrypted-message'
        });
      })
    );

    this.navigation = [
      {
        name: 'Home',
        href: '/',
        icon: 'fas fa-home',
        description: 'Go to home page',
        isDisplay:true
      },
      {
        name: 'Dashboard',
        href: '/dashboard',
        icon: 'fas fa-tachometer-alt',
        description: 'View your dashboard',
        isDisplay:this.isLogin
      },
      {
        name: 'Upload',
        href: '/upload',
        icon: 'fas fa-upload',
        description: 'Upload and Secure',
        isDisplay:true
      },
      {
        name: 'Mask Text',
        href: '/mask-text',
        icon: 'fas fa-book',
        description: 'Mask you Pii',
        isDisplay:true
      },
      {
        name: 'Encrypt',
        href: '/encrypt-text',
        icon: 'fas fa-lock',
        description: 'Encrypt your data',
        isDisplay:this.isLogin
      },
      {
        name: 'Decrypt',
        href: '/decrypt-text',
        icon: 'fas fa-unlock',
        description: 'Decrypt your data',
        isDisplay:this.isLogin
      }
    ];
    // Check for click outside of notifications
    document.addEventListener('click', this.handleOutsideClick.bind(this));
  }

  

  

  ngOnDestroy(): void {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Remove event listener
    document.removeEventListener('click', this.handleOutsideClick.bind(this));
  }

  toggleMobileMenu(): void {
    this.showMobileMenu = !this.showMobileMenu;
    // Close notifications if open
    if (this.showMobileMenu && this.showNotifications) {
      this.showNotifications = false;
    }
  }

  toggleNotifications(event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.showNotifications = !this.showNotifications;
  }

  handleOutsideClick(event: Event): void {
    const target = event.target as HTMLElement;
    const notificationBell = document.querySelector('.notification-bell');
    const notificationsDropdown = document.querySelector('.notifications-dropdown');
    
    // Close notifications if clicking outside
    if (
      this.showNotifications && 
      notificationBell && 
      notificationsDropdown &&
      !notificationBell.contains(target) &&
      !notificationsDropdown.contains(target)
    ) {
      this.showNotifications = false;
    }
  }

  addNotification(notification: Notification): void {
    this.notifications.unshift(notification);
    this.updateNotificationCount();
    
    // Show toast for new notification
    this.toastr.info(notification.message, 'New Notification', {
      timeOut: 4000,
      positionClass: 'toast-bottom-right'
    });
  }

  markAllAsRead(): void {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.updateNotificationCount();
  }

  markAsRead(notification: Notification): void {
    notification.read = true;
    this.updateNotificationCount();
  }

  updateNotificationCount(): void {
    this.notificationCount = this.notifications.filter(n => !n.read).length;
  }

  isCurrentRoute(route: string): boolean {
    if (route === '/' && this.router.url === '/') {
      return true;
    }
    return this.router.url.startsWith(route) && route !== '/';
  }

  signOut(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userId');
    localStorage.removeItem('userName');
    this.isLogin = false;
    window.location.href= '/sign-in'
  }
}
