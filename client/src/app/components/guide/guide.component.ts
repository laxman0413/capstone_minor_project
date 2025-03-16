import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-guide',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './guide.component.html',
  styleUrls: ['./guide.component.css']
})
export class GuideComponent implements OnInit {
  @Input() show = false;
  @Output() close = new EventEmitter<void>();

  // Flag to determine if component is used as a standalone page
  isStandalonePage = false;

  currentStep = 1;
  totalSteps = 5;

  steps = [
    {
      title: 'Document Selection',
      content: 'Choose the correct document type from the dropdown menu. This helps us accurately detect and mask sensitive information.',
      image: 'assets/doc-type.png'
    },
    {
      title: 'File Requirements',
      content: 'Upload JPG, PNG, or PDF files under 10MB. Ensure documents are clear, well-lit, and properly oriented.',
      image: 'assets/file-requirements.png'
    },
    {
      title: 'Document Quality',
      content: 'Make sure your document is complete, readable, and free from glare or shadows. All corners should be visible.',
      image: 'assets/doc-quality.png'
    },
    {
      title: 'Storage Options',
      content: 'Choose whether to save your masked document securely in our encrypted storage or download it directly.',
      image: 'assets/storage-options.png'
    },
    {
      title: 'Ready to Upload',
      content: 'Click "Upload" or drag and drop your file. We\'ll process and mask the sensitive information automatically.',
      image: 'assets/doc-upload.png'
    }
  ];

  constructor(
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    // Check if component is being used as a standalone page
    this.isStandalonePage = this.route.snapshot.url.length > 0;
    
    // If it's a standalone page, always show the content
    if (this.isStandalonePage) {
      this.show = true;
    }
    
    console.log('Guide component initialized. Standalone mode:', this.isStandalonePage);
  }

  nextStep() {
    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
    }
  }

  prevStep() {
    if (this.currentStep > 1) {
      this.currentStep--;
    }
  }

  closeDialog() {
    // Only emit close event if not in standalone mode
    if (!this.isStandalonePage) {
      this.close.emit();
      this.currentStep = 1;
    }
  }

  navigateToHome() {
    this.router.navigate(['/']);
  }

  completeGuide() {
    if (this.isStandalonePage) {
      // In standalone page mode, navigate to home
      this.navigateToHome();
    } else {
      // In dialog mode, close the dialog
      this.closeDialog();
    }
  }
}