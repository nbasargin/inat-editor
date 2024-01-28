import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileListComponent } from './file-list/file-list.component';
import { FileAccessNotSupportedComponent } from './file-access-not-supported/file-access-not-supported.component';
import { FolderSelectorComponent } from './folder-selector/folder-selector.component';
import { ImageEditorComponent } from './image-editor/image-editor.component';

import { FsItem } from './fs-item';
import { ImageXY } from './canvas-coordinates';
import { ExportImage } from './export-image';

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
        <ie-image-editor
          [selectedFile]="selectedFile"
          (cropImageRegion)="cropImageRegion($event.img, $event.dataUrl, $event.minXY, $event.maxXY)"
        ></ie-image-editor>
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

  cropImageRegion(img: HTMLImageElement, dataUrl: string, minXY: ImageXY, maxXY: ImageXY) {
    if (!this.selectedFile) {
      return;
    }
    const exporter = new ExportImage();
    exporter
      .exportImage(this.selectedFile, img, dataUrl, minXY, maxXY)
      .then((file) => {
        const filePath = file
          .getFullPath()
          .map((fsItem) => fsItem.handle.name)
          .join('/');
        console.log(`Exported image to "${filePath}"`);
      })
      .catch((e) => {
        console.error('Could not export selected image region!', e);
      });
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (
      !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key) ||
      !this.selectedFolder ||
      !this.selectedFile
    ) {
      return;
    }
    event.preventDefault();
    const availableFiles = this.filterImageFiles(this.folderContents);
    const selectedIndex = availableFiles.indexOf(this.selectedFile);
    if (selectedIndex === -1) {
      return;
    }
    if ((event.key === 'ArrowLeft' || event.key == 'ArrowUp') && selectedIndex > 0) {
      this.setSelectedFile(availableFiles[selectedIndex - 1]);
    }
    if ((event.key === 'ArrowRight' || event.key == 'ArrowDown') && selectedIndex < availableFiles.length - 1) {
      this.setSelectedFile(availableFiles[selectedIndex + 1]);
    }
  }

  private filterImageFiles(
    items: Array<FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>>,
  ): Array<FsItem<FileSystemFileHandle>> {
    const filterFn = (item: FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>) => {
      const isFile = item.handle instanceof FileSystemFileHandle;
      const name = item.handle.name.toLowerCase();
      const isImage = name.endsWith('.jpg') || name.endsWith('.jpeg') || name.endsWith('.png');
      return isFile && isImage;
    };
    return items.filter(filterFn) as Array<FsItem<FileSystemFileHandle>>;
  }
}
