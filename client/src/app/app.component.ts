import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from './components/navbar/navbar.component';
import { FooterComponent } from './components/footer/footer.component';
import { CommonModule } from '@angular/common';
import { SocketService } from './services/socket.service';
import { ToastrService } from 'ngx-toastr';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet,NavbarComponent,FooterComponent,CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'DMS';

  isErrorPage: boolean = false;
  isAdmin:boolean=false;
  private subscriptions: Subscription[] = [];

  constructor(
    private router: Router,
    private socketService: SocketService,
    private toastr: ToastrService
  ) {
    this.router.events.subscribe(() => {
      this.isErrorPage = this.router.url.startsWith('/error');
      this.isAdmin=this.router.url.startsWith('/admin');
    });
  }

  ngOnInit() {
    // Listen for encrypted message notifications
    this.subscriptions.push(
      this.socketService.listenToEncryptedMessages().subscribe(notification => {
        // Display a notification when an encrypted message is received
        this.toastr.info(
          `From: ${notification.senderName} (${notification.senderEmail})`,
          'New encrypted message received!',
          {
            timeOut: 5000,
            positionClass: 'toast-bottom-right',
            closeButton: true,
            progressBar: true
          }
        );
      })
    );
  }

  ngOnDestroy() {
    // Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
