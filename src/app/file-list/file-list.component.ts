import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'ie-file-list',
  standalone: true,
  imports: [CommonModule],
  template: ` <div *ngFor="let file of fileList">{{ file.name }} ({{ file.kind }})</div> `,
  styleUrl: 'file-list.component.scss',
})
export class FileListComponent {
  @Input() fileList: Array<FileSystemDirectoryHandle | FileSystemFileHandle> = [];
}
