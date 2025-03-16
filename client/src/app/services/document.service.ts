import { Injectable } from '@angular/core';
import axios from 'axios';
import { uploadDocument } from '../models/document.model';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: 'root'
})
export class DocumentService {
  private apiUrl = 'http://localhost:5000/api/documents';
  token = localStorage.getItem("authToken");

  constructor(private toastr: ToastrService) {}

  async publicUploadDocument(data:uploadDocument): Promise<any>{
    const formData = new FormData();
    formData.append('documentType', data.documentType);
    formData.append('file', data.file);

    try {
      const response = await axios.post(`${this.apiUrl}/public-upload`, formData, {
        headers: { 
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
        }
      });
      console.log(response.data);
      const textResponse = await response.data.text();
      try {
        const jsonData = JSON.parse(textResponse);

        if (jsonData?.message?.includes("No PII data found")) {
          return { message: jsonData.message, isNoPII: true };
        }

        return jsonData;
      } catch (error) {
        return {
          directBlob: response.data,
          fileType: response.headers['content-type'],
          fileName: data.file.name
        };
      }
    } catch (error: any) {
      console.error("Error in uploadDocument service:", error);
      if (error.response?.status === 413) {
        throw new Error('File size too large. Please upload a smaller file.');
      } else if (error.response?.status === 415) {
        throw new Error('Invalid file type. Please upload a supported file format.');
      } else {
        throw new Error('Failed to upload document. Please try again.');
      }
    }
  }

  async uploadDocument(data: uploadDocument): Promise<any> {
    const formData = new FormData();
    formData.append('documentType', data.documentType);
    formData.append('file', data.file);
    formData.append('isSave', data.isSave.toString());

    try {
      const response = await axios.post(`${this.apiUrl}/upload`, formData, {
        headers: { 
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'multipart/form-data'
        },
        responseType: 'blob',
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 100));
          // You can emit this progress if needed
        }
      });

      const textResponse = await response.data.text();
      try {
        const jsonData = JSON.parse(textResponse);

        if (jsonData?.message?.includes("No PII data found")) {
          return { message: jsonData.message, isNoPII: true };
        }

        return jsonData;
      } catch (error) {
        return {
          directBlob: response.data,
          fileType: response.headers['content-type'],
          fileName: data.file.name
        };
      }
    } catch (error: any) {
      console.error("Error in uploadDocument service:", error);
      if (error.response?.status === 413) {
        throw new Error('File size too large. Please upload a smaller file.');
      } else if (error.response?.status === 415) {
        throw new Error('Invalid file type. Please upload a supported file format.');
      } else if (error.response?.status === 401) {
        throw new Error('Session expired. Please login again.');
      } else {
        throw new Error('Failed to upload document. Please try again.');
      }
    }
  }

  async getUserDocuments(): Promise<any> {
    try {
      const response = await axios.get(`${this.apiUrl}/user-docs`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        this.toastr.error('Session expired. Please login again.', '', { positionClass: 'toast-top-center' });
      }
      throw error;
    }
  }

  async downloadDocument(fileKey: string): Promise<Blob> {
    try {
      const response = await axios.get(`${this.apiUrl}/download/${fileKey}`, {
        responseType: 'blob',
        headers: { Authorization: `Bearer ${this.token}` }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('File not found or has been deleted.');
      } else if (error.response?.status === 401) {
        throw new Error('Session expired. Please login again.');
      }
      throw new Error('Failed to download document. Please try again.');
    }
  }

  async deleteDocument(fileKey: string): Promise<any> {
    try {
      const response = await axios.delete(`${this.apiUrl}/delete/${fileKey}`, {
        headers: { Authorization: `Bearer ${this.token}` }
      });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('File not found or already deleted.');
      } else if (error.response?.status === 401) {
        throw new Error('Session expired. Please login again.');
      }
      throw new Error('Failed to delete document. Please try again.');
    }
  }
}