import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';

interface ErrorDetails {
  code: number;
  message: string;
  description?: string;
  steps: string[];
}

@Component({
  selector: 'app-error',
  templateUrl: './error.component.html',
  styleUrl: './error.component.css',
  standalone:true,
  imports:[CommonModule,RouterModule]
})
export class ErrorComponent {
  error: ErrorDetails = { code: 500, message: '', description: '', steps: [] };

  private errorData: Record<string, ErrorDetails> = {
    '404': {
      code: 404,
      message: "Oops! This Page Isn't Here.",
      description: "The page you're looking for might have been moved or renamed.",
      steps: [
        "Double-check the web address for typos.",
        "Navigate back to our homepage to explore more.",
        "Use our site search to find what you're looking for.",
      ],
    },
    '408': {
      code: 408,
      message: "Our Server is taking a bit longer to respond.",
      description: "Your request has taken too long to process, but we're still here to help.",
      steps: [
        "Refresh the page to see if your request goes through this time.",
        "Check your internet connection to ensure it's stable.",
        "Try again later, as the issue might be temporary.",
      ],
    },
    '415': {
      code: 415,
      message: "Oops! The media type of your request isn't supported by our server.",
      steps: ["Double-check the format of your request and ensure it is compatible."],
    },
    '429': {
      code: 429,
      message: "You've hit your request limit.",
      description: "To ensure a smooth experience, we need to slow things down a bit.",
      steps: [
        "Wait for a little while and then try your request again.",
        "Explore other parts of our website in the meantime.",
      ],
    },
    '500': {
      code: 500,
      message: "Oops! Something Went Wrong.",
      description: "It's not you... It's us.",
      steps: [
        "Refresh the page in a few moments to see if it's resolved.",
        "Try again later, when things are back on track.",
        "Visit our homepage to see if other parts of the site are accessible.",
      ],
    },
    '503': {
      code: 503,
      message: "Hold on! Our servers are taking a breather.",
      description: "We're currently experiencing high traffic or undergoing maintenance, but we'll be back in action shortly.",
      steps: [
        "Give us a few moments and hit that refresh button.",
        "Check out our homepage while you wait.",
      ],
    },
  };

  constructor(private route: ActivatedRoute) {
    this.route.params.subscribe(params => {
      const errorId = this.route.snapshot.paramMap.get('id');

      if (errorId && this.errorData[errorId]) {
        this.error = this.errorData[errorId];
      } else {
        this.error = {
          code: 500,
          message: 'Unknown Error',
          description: 'An unexpected error occurred.',
          steps: ['Try again later', 'Return to the homepage'],
        };
      }
    });
  }
}
