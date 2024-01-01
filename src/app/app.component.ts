import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileListComponent } from './file-list/file-list.component';
import { FileAccessNotSupportedComponent } from './file-access-not-supported/file-access-not-supported.component';
import { FolderSelectorComponent } from './folder-selector/folder-selector.component';
import { ImageEditorComponent } from './image-editor/image-editor.component';

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
        (folderSelected)="setSelectedFolder($event)"
        class="header"
      ></ie-folder-selector>
      <ie-file-list [fileList]="folderContents" class="side-panel"></ie-file-list>
      <ie-image-editor class="content-panel"></ie-image-editor>
    </div>
  `,
  styleUrl: 'app.component.scss',
})
export class AppComponent {
  fileApiSupported: boolean;
  selectedFolder: FileSystemDirectoryHandle | undefined = undefined;
  folderContents: Array<FileSystemDirectoryHandle | FileSystemFileHandle> = [];

  constructor() {
    this.fileApiSupported = !!window.showOpenFilePicker;
  }

  async setSelectedFolder(selectedFolder: FileSystemDirectoryHandle | undefined) {
    this.selectedFolder = selectedFolder;
    if (!selectedFolder) {
      this.folderContents = []; // no files
      return;
    }

    const folderContents: Array<FileSystemDirectoryHandle | FileSystemFileHandle> = [];
    for await (const entry of selectedFolder.values()) {
      folderContents.push(entry);
    }
    this.folderContents = folderContents;
  }
}
