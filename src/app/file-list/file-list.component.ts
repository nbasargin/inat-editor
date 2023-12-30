import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface FileItem {
  fname: string;
  selected: boolean;
}

@Component({
  selector: 'ie-file-list',
  standalone: true,
  imports: [CommonModule],
  template: ` <div *ngFor="let file of fileList">{{ file.fname }}</div> `,
  styleUrl: 'file-list.component.scss',
})
export class FileListComponent {
  @Input() fileList: Array<{ fname: string; selected: boolean }> = [];
}
