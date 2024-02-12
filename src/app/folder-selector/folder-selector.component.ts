import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { FsItem } from '../utils/fs-item';

@Component({
  selector: 'ie-folder-selector',
  standalone: true,
  imports: [MatButtonModule, CommonModule],
  template: `
    <button mat-raised-button color="primary" (click)="selectNewFolder()" class="open-folder-button">
      Open Folder
    </button>
    <ng-container *ngFor="let item of getPathElements(); let last = last">
      <span class="folder-name" (click)="clickExistingPathItem(item)">{{ item.handle.name }}</span>
      <span class="separator" *ngIf="!last">&gt;</span>
    </ng-container>
  `,
  styleUrl: 'folder-selector.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FolderSelectorComponent {
  @Input() selectedFolder: FsItem<FileSystemDirectoryHandle> | null = null;
  @Input() selectedFile: FsItem<FileSystemFileHandle> | null = null;

  @Output() folderSelected = new EventEmitter<FsItem<FileSystemDirectoryHandle>>();

  async selectNewFolder() {
    try {
      const selectedFolder = await window.showDirectoryPicker({ mode: 'readwrite' });
      this.folderSelected.emit(new FsItem<FileSystemDirectoryHandle>(selectedFolder, null));
    } catch (e) {
      console.error('Error opening folder', e);
    }
  }

  clickExistingPathItem(item: FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>) {
    if (item.handle instanceof FileSystemDirectoryHandle) {
      this.folderSelected.emit(item as FsItem<FileSystemDirectoryHandle>);
    }
  }

  getPathElements(): Array<FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>> {
    const fsItem = this.selectedFile || this.selectedFolder;
    if (!fsItem) {
      return [];
    }
    return fsItem.getFullPath();
  }
}
