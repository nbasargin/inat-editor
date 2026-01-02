import { Component, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FileListComponent } from './file-list/file-list.component';
import { FileAccessNotSupportedComponent } from './file-access-not-supported/file-access-not-supported.component';
import { FolderSelectorComponent } from './folder-selector/folder-selector.component';
import { ImageEditorComponent } from './image-editor/image-editor.component';
import { FsItem } from './utils/fs-item';
import { ImageXY } from './utils/canvas-coordinates';
import { ExportImage } from './utils/export-image';
import { FileImageData, ImageLoader3, RelatedImagesData } from './utils/image-loader-3';
import { InfoBarComponent } from './info-bar/info-bar.component';
import { CropArea } from './utils/user-comment-data';
import { MAX_IMAGE_SIZE } from './utils/constats';

@Component({
  selector: 'ie-root',
  imports: [
    CommonModule,
    FileAccessNotSupportedComponent,
    FolderSelectorComponent,
    FileListComponent,
    ImageEditorComponent,
    InfoBarComponent,
  ],
  template: `
    <ie-file-access-not-supported *ngIf="!fileApiSupported"></ie-file-access-not-supported>
    <div class="main-layout" *ngIf="fileApiSupported">
      <ie-folder-selector
        [selectedFolder]="selectedFolder"
        [selectedFile]="selectedFile"
        (folderSelected)="setSelectedFolder($event)"
        class="folder-selector"
      ></ie-folder-selector>
      <ng-container *ngIf="selectedFolder">
        <ie-file-list
          [fileList]="folderContents"
          [selectedFile]="selectedFile"
          [parentFolder]="selectedFolder ? selectedFolder.parent : null"
          (fileSelected)="setSelectedFile($event)"
          (folderSelected)="setSelectedFolder($event)"
          class="files"
        ></ie-file-list>
        <ie-image-editor
          [imageData]="imageData | async"
          [relatedImagesData]="relatedImagesData | async"
          [allowCrop]="allowCrop"
          (cropImageRegion)="cropImageRegion($event.data, $event.minXY, $event.maxXY)"
          (selectCropArea)="selectedCropArea = $event"
          class="editor"
        ></ie-image-editor>
        <ie-info-bar
          [allowCrop]="allowCrop"
          [relatedImagesData]="relatedImagesData | async"
          [selectedCropArea]="selectedCropArea"
          class="info"
        ></ie-info-bar>
      </ng-container>
    </div>
  `,
  styleUrl: 'app.component.scss',
})
export class AppComponent {
  fileApiSupported: boolean;
  selectedFolder: FsItem<FileSystemDirectoryHandle> | null = null;
  selectedFile: FsItem<FileSystemFileHandle> | null = null;
  folderContents: Array<FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>> = [];
  imageData: Promise<FileImageData> | null = null;
  relatedImagesData: Promise<RelatedImagesData> | null = null;
  allowCrop = false;
  selectedCropArea: CropArea | null = null;

  constructor(private _snackBar: MatSnackBar) {
    this.fileApiSupported = !!window.showOpenFilePicker;
  }

  async setSelectedFolder(selectedFolder: FsItem<FileSystemDirectoryHandle>) {
    this.selectedFolder = selectedFolder;
    this.selectedFile = null;
    this.imageData = null;
    this.relatedImagesData = null;
    const folderContents: Array<FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>> = [];
    for await (const entry of selectedFolder.handle.values()) {
      folderContents.push(new FsItem(entry, selectedFolder));
    }
    // sort by name
    folderContents.sort((a, b) => (a.handle.name < b.handle.name ? -1 : 1));
    // sort to have folders first
    const folders = folderContents.filter((item) => item.handle.kind === 'directory');
    const files = folderContents.filter((item) => item.handle.kind === 'file');
    this.folderContents = [...folders, ...files];
    // allow or disallow cropping
    this.allowCrop = !['iNat', 'iNat_new'].includes(this.selectedFolder.handle.name);
  }

  setSelectedFile(selectedFile: FsItem<FileSystemFileHandle>) {
    this.selectedFile = selectedFile;
    this.imageData = ImageLoader3.createImage(selectedFile);
    this.relatedImagesData = ImageLoader3.readRelatedImagesData(selectedFile);
  }

  cropImageRegion(data: FileImageData, minXY: ImageXY, maxXY: ImageXY) {
    const exporter = new ExportImage(MAX_IMAGE_SIZE);
    exporter
      .exportImage(data.fsItem, data.image, data.dataURL, minXY, maxXY)
      .then((file) => {
        const filePath = file
          .getFullPath()
          .map((fsItem) => fsItem.handle.name)
          .join('/');
        this.showMessage(`Exported image to "${filePath}"`);
        console.log(`Exported image to "${filePath}"`);
        if (this.selectedFile) {
          // update crop boxes, not very efficient but refreshes everything
          this.relatedImagesData = ImageLoader3.readRelatedImagesData(this.selectedFile);
        }
      })
      .catch((e) => {
        this.showMessage('Could not export selected image region!');
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
      const isImage = name.endsWith('.jpg') || name.endsWith('.jpeg');
      return isFile && isImage;
    };
    return items.filter(filterFn) as Array<FsItem<FileSystemFileHandle>>;
  }

  showMessage(msg: string) {
    this._snackBar.open(msg, undefined, { duration: 4000 });
  }
}
