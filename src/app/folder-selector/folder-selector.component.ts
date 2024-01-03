import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'ie-folder-selector',
  standalone: true,
  imports: [MatButtonModule, CommonModule],
  template: `
    <button mat-raised-button color="primary" (click)="selectFolder()" class="open-folder-button">Open Folder</button>
    <span class="folder-name">{{ selectedFolder?.name }}</span>
    <ng-container *ngIf="selectedFile">
      <span class="separator">&gt;</span>
      <span class="folder-name">{{ selectedFile.name }}</span>
    </ng-container>
  `,
  styleUrl: 'folder-selector.component.scss',
})
export class FolderSelectorComponent {
  @Input() selectedFolder: FileSystemDirectoryHandle | undefined = undefined;
  @Input() selectedFile: FileSystemFileHandle | undefined = undefined;

  @Output() folderSelected = new EventEmitter<FileSystemDirectoryHandle | undefined>();

  async selectFolder() {
    try {
      const selectedFolder = await window.showDirectoryPicker();
      this.folderSelected.emit(selectedFolder);
    } catch (e) {
      console.error('Error opening folder', e);
      this.folderSelected.emit(undefined);
    }
  }
}
