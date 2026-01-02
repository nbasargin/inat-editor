import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  Output,
  QueryList,
  ViewChildren,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule, MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';
import { FsItem } from '../utils/fs-item';
import { FsResolver } from '../utils/fs-resolver';

interface FileListItem {
  fsItem: FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>;
  icon: string;
  disabled: boolean;
  hasCrop: boolean;
  thumbnail?: string;
}

@Component({
  selector: 'ie-file-list',
  imports: [MatIconModule, MatTooltipModule],
  providers: [{ provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: { disableTooltipInteractivity: true } }],
  template: `
    @if (parentFolder) {
      <div class="folder-entry" (click)="clickListItem(parentFolder)">
        <mat-icon [fontIcon]="'drive_file_move_rtl'" class="entry-icon"></mat-icon>
        <span class="entry-name">..</span>
      </div>
    }
    @for (listItem of fileListItems; track trackListItem(listItem)) {
      <div
        class="folder-entry"
        [class.selected]="selectedFile && listItem.fsItem.handle === selectedFile.handle"
        [class.disabled]="listItem.disabled"
        (click)="clickListItem(listItem.fsItem)"
        #listItemDiv
      >
        <mat-icon [fontIcon]="listItem.icon" class="entry-icon"></mat-icon>
        <span class="entry-has-crop">
          {{ listItem.hasCrop ? '*' : '' }}
        </span>
        <span class="entry-name" [matTooltip]="listItem.fsItem.handle.name" [matTooltipShowDelay]="200">
          {{ listItem.fsItem.handle.name }}
        </span>
      </div>
    }
    @if (fileListItems.length === 0) {
      <div class="folder-entry empty-list-message">
        <mat-icon [fontIcon]="'block'" class="entry-icon"></mat-icon>
        <span class="entry-name">No files</span>
      </div>
    }
  `,
  styleUrl: 'file-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileListComponent {
  // list of items
  @ViewChildren('listItemDiv') listItemDivs!: QueryList<ElementRef>;
  fileListItems: Array<FileListItem> = [];
  @Input() set fileList(list: Array<FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>>) {
    this.fileListItems = list.map((file) => this.fsItemToListItem(file));
    this.scrollToTop();
    // set crop flags
    const folder = list.length > 0 ? list[0].parent : null;
    if (folder) {
      this.setHasCropForListItems(this.fileListItems, folder);
    }
  }

  // selected item
  private _selectedFile: FsItem<FileSystemFileHandle> | null = null;
  @Input() set selectedFile(fsItem: FsItem<FileSystemFileHandle> | null) {
    this._selectedFile = fsItem;
    if (fsItem) {
      this.scrollSelectedItemIntoView(fsItem);
    }
  }
  get selectedFile(): FsItem<FileSystemFileHandle> | null {
    return this._selectedFile;
  }

  @Input() parentFolder: FsItem<FileSystemDirectoryHandle> | null = null;

  @Output() folderSelected = new EventEmitter<FsItem<FileSystemDirectoryHandle>>();
  @Output() fileSelected = new EventEmitter<FsItem<FileSystemFileHandle>>();

  constructor(
    private hostRef: ElementRef,
    private change: ChangeDetectorRef,
  ) {}

  private fsItemToListItem(fsItem: FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>): FileListItem {
    const icon = fsItem.handle.kind === 'directory' ? 'folder' : 'insert_drive_file';
    const name = fsItem.handle.name.toLocaleLowerCase();
    const disabled = fsItem.handle.kind !== 'directory' && !name.endsWith('.jpg') && !name.endsWith('.jpeg');
    return {
      fsItem: fsItem,
      icon: icon,
      disabled: disabled,
      hasCrop: false,
    };
  }

  clickListItem(fsItem: FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>) {
    if (fsItem.handle instanceof FileSystemFileHandle) {
      this.fileSelected.emit(fsItem as FsItem<FileSystemFileHandle>);
    } else if (fsItem.handle instanceof FileSystemDirectoryHandle) {
      this.folderSelected.emit(fsItem as FsItem<FileSystemDirectoryHandle>);
    }
  }

  trackListItem(listItem: FileListItem) {
    return listItem.fsItem.handle.name + listItem.hasCrop + !!listItem.thumbnail;
  }

  async setHasCropForListItems(fileListItems: Array<FileListItem>, folder: FsItem<FileSystemDirectoryHandle>) {
    if (fileListItems.length === 0) {
      return;
    }
    const { iNatFolder, iNatNewFolder } = await FsResolver.findINatFoldersInFolder(folder);
    const iNatFileNames = new Set<string>();
    const folders: FsItem<FileSystemDirectoryHandle>[] = [iNatFolder, iNatNewFolder].filter((f) => !!f);
    // collect file names
    for (let f of folders) {
      for await (let handle of f.handle.values()) {
        if (handle.kind === 'file') {
          const fileName = handle.name;
          const fileNameClean = FsResolver.removeINatSuffix(fileName);
          iNatFileNames.add(fileNameClean);
        }
      }
    }
    // set flags
    for (let listItem of fileListItems) {
      if (listItem.fsItem.handle.kind === 'file') {
        const fileName = listItem.fsItem.handle.name;
        const fileNameNoExt = FsResolver.removeFileExtension(fileName);
        const fileNameClean = FsResolver.removeBackupSuffix(fileNameNoExt);
        listItem.hasCrop = iNatFileNames.has(fileNameClean);
      }
    }
    this.change.markForCheck();
  }

  private scrollSelectedItemIntoView(fsItem: FsItem<FileSystemFileHandle>) {
    if (!this.listItemDivs) {
      return;
    }
    for (let i = 0; i < this.fileListItems.length; i++) {
      const listItem = this.fileListItems[i];
      if (listItem.fsItem.handle === fsItem.handle) {
        const selectedItem = this.listItemDivs.get(i);
        if (selectedItem) {
          selectedItem.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        return;
      }
    }
  }

  private scrollToTop() {
    if (this.hostRef.nativeElement) {
      this.hostRef.nativeElement.scrollTop = 0;
    }
  }
}
