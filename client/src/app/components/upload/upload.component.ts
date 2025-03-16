import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { DropfileinputComponent } from './dropfileinput/dropfileinput.component';
import { DocumentService } from '../../services/document.service';
import { FormsModule } from '@angular/forms';
import { uploadDocument } from '../../models/document.model';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../services/auth.service';

interface FileEvent {
  files: File[];
}

type DocumentType = 'adhaar' | 'pan' | 'driving_license' | 'other';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.component.html',
  styleUrls: ['./upload.component.css'],
  standalone: true,
  imports: [CommonModule, DropfileinputComponent, FormsModule, RouterModule]
})
export class UploadComponent implements OnInit {
  file: File | null = null;
  isUploading = false;
  isSuccess = false;
  isDownloading = false;
  errorMessage = '';
  fileUrl: SafeUrl | null = null;
  maskedBlob: Blob | null = null; 
  selectedDocumentType: DocumentType = 'adhaar';
  saveMaskedDocument: boolean = false;
  responseFileType: string | null = null;
  showTooltip: boolean = false;
  showTooltip2: boolean = false;
  uploadProgress: number = 0;
  originalFileName: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private sanitizer: DomSanitizer,
    private documentService: DocumentService,
    private toastr: ToastrService
  ) {}


  isLogin: boolean = false;
  ngOnInit() {
    // Subscribe to AuthService changes
    this.authService.isLoggedIn$.subscribe((status) => {
      this.isLogin = status;
    });
  }

  validateFile(file: File): string | null {
    const maxSize = 10 * 1024 * 1024; // 10MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPEG, PNG and PDF files are allowed';
    }
    
    if (file.size > maxSize) {
      return 'File size must be less than 10MB';
    }
    
    return null;
  }

  onFileChange(event: FileEvent) {
    if (!event.files.length) return;

    const file = event.files[0];
    const validationError = this.validateFile(file);
    
    if (validationError) {
      this.errorMessage = validationError;
      this.toastr.error(validationError, '', { positionClass: 'toast-top-center' });
      return;
    }

    this.file = file;
    this.errorMessage = '';
    this.isSuccess = false;
    this.maskedBlob = null;
    this.fileUrl = null;
    this.uploadProgress = 0;

    const reader = new FileReader();
    reader.onload = () => {
      this.fileUrl = this.sanitizer.bypassSecurityTrustUrl(reader.result as string);
    };
    reader.readAsDataURL(this.file);
  }

  removeFile() {
    this.file = null;
    this.isSuccess = false;
    this.errorMessage = '';
    this.maskedBlob = null;
    this.fileUrl = null;
    this.responseFileType = null;
    this.uploadProgress = 0;
  }

  async uploadAndFetchMaskedFile() {
    if (!this.file) {
      this.errorMessage = 'Please select a file first.';
      this.toastr.error(this.errorMessage, '', { positionClass: 'toast-top-center' });
      return;
    }

    if (!this.selectedDocumentType) {
      this.errorMessage = 'Please select a document type.';
      this.toastr.error(this.errorMessage, '', { positionClass: 'toast-top-center' });
      return;
    }
          
    this.isUploading = true;
    this.errorMessage = '';
    const data: uploadDocument = {
      documentType: this.selectedDocumentType,
      file: this.file,
      isSave: this.saveMaskedDocument
    };
        
    try {
      let response;
      if(!this.isLogin){
        response=await this.documentService.publicUploadDocument(data);
      }else{
       response= await this.documentService.uploadDocument(data);
      }
      
      if (response.isNoPII) {
        this.errorMessage = response.message;
        this.toastr.warning(response.message, '', { positionClass: 'toast-top-center' });
        return;
      }
      
      if (data.isSave === false) {
        this.maskedBlob = new Blob([response.directBlob], { 
          type: response.fileType || this.file.type 
        });
        this.responseFileType = response.fileType || null;
        this.originalFileName = this.file.name;
      } else {
        this.maskedBlob = await this.documentService.downloadDocument(response.fileUrl);
        this.originalFileName = this.file.name;
        this.responseFileType = response.fileType || null;
      }
      
      if (!(this.maskedBlob instanceof Blob)) {
        throw new Error('Invalid file received. Expected a Blob.');
      }
      
      const objectURL = URL.createObjectURL(this.maskedBlob);
      this.fileUrl = this.sanitizer.bypassSecurityTrustUrl(objectURL);
      this.isSuccess = true;
      this.toastr.success('File processed successfully!', '', { positionClass: 'toast-top-center' });

    } catch (error: any) {
      this.errorMessage = error.message || 'An error occurred during upload.';
      this.toastr.error(this.errorMessage, '', { positionClass: 'toast-top-center' });
      console.error('Upload error:', error);
    } finally {
      this.isUploading = false;
    }
  }
  
  downloadMaskedFile() {
    if (!this.maskedBlob) {
      this.errorMessage = 'No file available for download.';
      this.toastr.error(this.errorMessage, '', { positionClass: 'toast-top-center' });
      return;
    }
    
    if (this.isDownloading) return;
    
    this.isDownloading = true;
    this.errorMessage = '';
    
    try {
      const url = window.URL.createObjectURL(this.maskedBlob);
      const link = document.createElement('a');
      
      const now = new Date();
      const dateStr = now.getFullYear() + 
                     String(now.getMonth() + 1).padStart(2, '0') + 
                     String(now.getDate()).padStart(2, '0');
      
      const originalName = this.originalFileName || this.file?.name || 'file';
      const originalBaseName = originalName.split('.')[0];
      const originalExtension = originalName.split('.').pop() || '';
      
      let outputExtension;
      
      if (this.responseFileType) {
        if (this.responseFileType.includes('jpeg') || this.responseFileType.includes('jpg')) {
          outputExtension = 'jpg';
        } else if (this.responseFileType.includes('png')) {
          outputExtension = 'png';
        } else {
          outputExtension = this.responseFileType.split('/').pop() || originalExtension;
        }
      } else {
        if (originalExtension.toLowerCase() === 'pdf') {
          outputExtension = 'jpg';
        } else {
          outputExtension = originalExtension;
        }
      }
      
      const newFileName = `${dateStr}_masked_${originalBaseName}.${outputExtension}`;
      
      link.href = url;
      link.download = newFileName;
      document.body.appendChild(link);
      link.click();
      
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
        document.body.removeChild(link);
      }, 100);

      this.toastr.success('File downloaded successfully!', '', { positionClass: 'toast-top-center' });
      
    } catch (error) {
      console.error('Download error:', error);
      this.errorMessage = 'Download failed. Please try again.';
      this.toastr.error(this.errorMessage, '', { positionClass: 'toast-top-center' });
    } finally {
      this.isDownloading = false;
    }
  }
  
}