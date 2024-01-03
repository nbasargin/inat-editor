import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileListComponent } from './file-list/file-list.component';
import { FileAccessNotSupportedComponent } from './file-access-not-supported/file-access-not-supported.component';
import { FolderSelectorComponent } from './folder-selector/folder-selector.component';
import { ImageEditorComponent } from './image-editor/image-editor.component';

import { FsItem } from './fs-item';

@Component({
  selector: 'ie-root',
  standalone: true,
  imports: [
    CommonModule,
    FileAccessNotSupportedComponent,
    FolderSelectorComponent,
    FileListComponent,
    ImageEditorComponent,
  ],
  template: `
    <ie-file-access-not-supported *ngIf="!fileApiSupported"></ie-file-access-not-supported>
    <div class="main-layout" *ngIf="fileApiSupported">
      <ie-folder-selector
        [selectedFolder]="selectedFolder"
        [selectedFile]="selectedFile"
        (folderSelected)="setSelectedFolder($event)"
        class="main-header"
      ></ie-folder-selector>
      <div class="main-content">
        <ie-file-list
          [fileList]="folderContents"
          [selectedFile]="selectedFile"
          [parentFolder]="selectedFolder ? selectedFolder.parent : null"
          (fileSelected)="setSelectedFile($event)"
          (folderSelected)="setSelectedFolder($event)"
          class="side-panel"
        ></ie-file-list>
        <ie-image-editor></ie-image-editor>
      </div>
    </div>
  `,
  styleUrl: 'app.component.scss',
})
export class AppComponent {
  fileApiSupported: boolean;
  selectedFolder: FsItem<FileSystemDirectoryHandle> | null = null;
  selectedFile: FsItem<FileSystemFileHandle> | null = null;
  folderContents: Array<FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>> = [];

  constructor() {
    this.fileApiSupported = !!window.showOpenFilePicker;
  }

  async setSelectedFolder(selectedFolder: FsItem<FileSystemDirectoryHandle>) {
    this.selectedFolder = selectedFolder;
    this.selectedFile = null;
    const folderContents: Array<FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>> = [];
    for await (const entry of selectedFolder.handle.values()) {
      folderContents.push(new FsItem(entry, selectedFolder));
    }
    this.folderContents = folderContents;
  }

  setSelectedFile(selectedFile: FsItem<FileSystemFileHandle>) {
    this.selectedFile = selectedFile;
  }
}
