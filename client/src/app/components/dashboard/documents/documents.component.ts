import { Component, OnInit } from '@angular/core';
import { DocumentService } from '../../../services/document.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { MatDialog } from '@angular/material/dialog';
import { ConfirmDeleteComponent } from './confirm-delete/confirm-delete.component';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-documents',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './documents.component.html',
  styleUrls: ['./documents.component.css']
})
export class DocumentsComponent implements OnInit {
  documents: any[] = [];
  showPreview: boolean = false;
  filePreviewURL: string | null = null;
  selectedFile: string | null = null;
  isLoading: boolean = false;
  loadingMessage: string = '';
  previewTitle: string = 'Document Preview';
  
  // Pagination
  currentPage: number = 1;
  itemsPerPage: number = 9;
  
  // Loading messages for the interactive experience
  loadingMessages: string[] = [
    'Retrieving your document...',
    'Preparing for viewing...',
    'Almost there...',
    'Getting everything ready...',
    'Optimizing display...'
  ];
  
  loadingInterval: any;

  constructor(
    private documentService: DocumentService,
    private toastrService: ToastrService,
    private dialog: MatDialog
  ) {}

  async ngOnInit(): Promise<void> {
    await this.getFiles();
  }

  async getFiles(): Promise<void> {
    try {
      const response = await this.documentService.getUserDocuments();
      this.documents = response.documents ? response.documents.reverse() : [];
    } catch (error) {
      console.error('Error fetching documents:', error);
      this.toastrService.error('Failed to fetch documents');
    }
  }

  get paginatedDocuments(): any[] {
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return this.documents.slice(startIndex, startIndex + this.itemsPerPage);
  }

  get totalPages(): number {
    return Math.ceil(this.documents.length / this.itemsPerPage);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  async downloadFile(fileKey: string): Promise<void> {
    if (!fileKey) return;
    
    try {
      this.setLoading(true, 'Preparing download...');
      const blob = await this.documentService.downloadDocument(fileKey);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileKey;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading file:', error);
      this.toastrService.error('Failed to download file');
    } finally {
      this.setLoading(false);
    }
  }

  async deleteFile(fileKey: string): Promise<void> {
    try {
      const dialogRef = this.dialog.open(ConfirmDeleteComponent, {
        width: '800px',
        data: { fileName: fileKey }
      });

      const confirmed = await lastValueFrom(dialogRef.afterClosed());
      if (!confirmed) return;

      this.setLoading(true, 'Deleting document...');
      await this.documentService.deleteDocument(fileKey);
      this.toastrService.success('Deleted Successfully!', '', {
        positionClass: "toast-top-left",
        timeOut: 2000
      });
      await this.getFiles();
    } catch (error) {
      console.error('Error deleting file:', error);
      this.toastrService.error('Failed to delete file');
    } finally {
      this.setLoading(false);
    }
  }

  async openPreviewDialog(fileName: string): Promise<void> {
    try {
      this.selectedFile = fileName;
      this.setLoading(true);
      this.startLoadingAnimation();
      
      const document = this.documents.find(doc => doc.maskedFileName === fileName);
      this.previewTitle = document?.originalName || 'Document Preview';
      
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const blob = await this.documentService.downloadDocument(fileName);
      const url = window.URL.createObjectURL(blob);
      this.filePreviewURL = url;
      
      this.setLoading(false);
      this.showPreview = true;
    } catch (error) {
      console.error('Error opening preview:', error);
      this.toastrService.error('Failed to preview file');
      this.setLoading(false);
    }
  }

  closePreviewDialog(event: Event): void {
    this.showPreview = false;
    if (this.filePreviewURL) {
      window.URL.revokeObjectURL(this.filePreviewURL);
      this.filePreviewURL = null;
    }
    this.selectedFile = null;
  }
  
  setLoading(isLoading: boolean, message?: string): void {
    this.isLoading = isLoading;
    if (!isLoading && this.loadingInterval) {
      clearInterval(this.loadingInterval);
      this.loadingInterval = null;
    } else if (message) {
      this.loadingMessage = message;
    }
  }
  
  startLoadingAnimation(): void {
    let messageIndex = 0;
    this.loadingMessage = this.loadingMessages[messageIndex];
    this.loadingInterval = setInterval(() => {
      messageIndex = (messageIndex + 1) % this.loadingMessages.length;
      this.loadingMessage = this.loadingMessages[messageIndex];
    }, 1500);
  }
  
  ngOnDestroy(): void {
    if (this.loadingInterval) {
      clearInterval(this.loadingInterval);
    }
    if (this.filePreviewURL) {
      window.URL.revokeObjectURL(this.filePreviewURL);
    }
  }

  // Method to show document actions (missing in original code)
  showDocumentActions(doc: any): void {
    doc.showActions = !doc.showActions;
  }
}