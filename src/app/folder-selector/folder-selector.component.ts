import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { FsItem } from '../fs-item';

@Component({
  selector: 'ie-folder-selector',
  standalone: true,
  imports: [MatButtonModule, CommonModule],
  template: `
    <button mat-raised-button color="primary" (click)="selectFolder()" class="open-folder-button">Open Folder</button>
    <span class="folder-name" *ngIf="selectedFolder">{{ selectedFolder.handle.name }}</span>
    <ng-container *ngIf="selectedFile">
      <span class="separator">&gt;</span>
      <span class="folder-name">{{ selectedFile.handle.name }}</span>
    </ng-container>
  `,
  styleUrl: 'folder-selector.component.scss',
})
export class FolderSelectorComponent {
  @Input() selectedFolder: FsItem<FileSystemDirectoryHandle> | null = null;
  @Input() selectedFile: FsItem<FileSystemFileHandle> | null = null;

  @Output() folderSelected = new EventEmitter<FsItem<FileSystemDirectoryHandle>>();

  async selectFolder() {
    try {
      const selectedFolder = await window.showDirectoryPicker();
      this.folderSelected.emit(new FsItem<FileSystemDirectoryHandle>(selectedFolder, null));
    } catch (e) {
      console.error('Error opening folder', e);
    }
  }
}
