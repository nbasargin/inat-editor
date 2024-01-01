import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule, MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';

interface FolderEntry {
  file: FileSystemDirectoryHandle | FileSystemFileHandle;
  icon: string;
}
@Component({
  selector: 'ie-file-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  providers: [{ provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: { disableTooltipInteractivity: true } }],
  template: `
    <div *ngFor="let entry of folderEntries" class="folder-entry">
      <mat-icon [fontIcon]="entry.icon" class="entry-icon"></mat-icon>
      <span class="entry-name" [matTooltip]="entry.file.name" [matTooltipShowDelay]="200">{{ entry.file.name }}</span>
    </div>
    <div *ngIf="folderEntries.length === 0" class="folder-entry empty-list-message">
      <mat-icon [fontIcon]="'block'" class="entry-icon"></mat-icon>
      <span class="entry-name">No files</span>
    </div>
  `,
  styleUrl: 'file-list.component.scss',
})
export class FileListComponent {
  folderEntries: Array<FolderEntry> = [];

  @Input() set fileList(list: Array<FileSystemDirectoryHandle | FileSystemFileHandle>) {
    this.folderEntries = list.map((file) => this.fileToEntry(file));
  }

  private fileToEntry(file: FileSystemDirectoryHandle | FileSystemFileHandle): FolderEntry {
    const icon = file.kind === 'directory' ? 'folder' : 'insert_drive_file';
    return {
      file: file,
      icon: icon,
    };
  }
}
