import { CommonModule } from '@angular/common';
import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';

interface FileEvent {
  files: File[];
}

@Component({
  selector: 'app-dropfileinput',
  imports: [CommonModule],
  templateUrl: './dropfileinput.component.html',
  styleUrl: './dropfileinput.component.css'
})
export class DropfileinputComponent {
  @Output() fileChange = new EventEmitter<FileEvent>();
  @ViewChild('fileDropRef') fileDropRef!: ElementRef;

  file: File | null = null;

  showModal = false;

  

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.fileDropRef.nativeElement.classList.add('dragover');
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.fileDropRef.nativeElement.classList.remove('dragover');
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.fileDropRef.nativeElement.classList.remove('dragover');
    
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.handleFile(files[0]);
    }
  }

  onFileSelect(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.handleFile(file);
    }
  }

  handleFile(file: File) {
    this.file = file;
    this.fileChange.emit({ files: [file] });
  }

  removeFile() {
    this.file = null;
    this.fileChange.emit({files:[]});
  }
}
