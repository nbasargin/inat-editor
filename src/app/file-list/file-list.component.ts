import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule, MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';
import { FsItem } from '../utils/fs-item';

interface FileListItem {
  fsItem: FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>;
  icon: string;
}

@Component({
  selector: 'ie-file-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  providers: [{ provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: { disableTooltipInteractivity: true } }],
  template: `
    <div *ngIf="parentFolder" class="folder-entry" (click)="clickListItem(parentFolder)">
      <mat-icon [fontIcon]="'drive_file_move_rtl'" class="entry-icon"></mat-icon>
      <span class="entry-name">..</span>
    </div>
    <div
      *ngFor="let listItem of fileListItems"
      class="folder-entry"
      [class.selected]="selectedFile && listItem.fsItem.handle === selectedFile.handle"
      (click)="clickListItem(listItem.fsItem)"
    >
      <mat-icon [fontIcon]="listItem.icon" class="entry-icon"></mat-icon>
      <span class="entry-name" [matTooltip]="listItem.fsItem.handle.name" [matTooltipShowDelay]="200">{{
        listItem.fsItem.handle.name
      }}</span>
    </div>
    <div *ngIf="fileListItems.length === 0" class="folder-entry empty-list-message">
      <mat-icon [fontIcon]="'block'" class="entry-icon"></mat-icon>
      <span class="entry-name">No files</span>
    </div>
  `,
  styleUrl: 'file-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FileListComponent {
  fileListItems: Array<FileListItem> = [];

  @Input() set fileList(list: Array<FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>>) {
    this.fileListItems = list.map((file) => this.fsItemToListItem(file));
  }
  @Input() selectedFile: FsItem<FileSystemFileHandle> | null = null;
  @Input() parentFolder: FsItem<FileSystemDirectoryHandle> | null = null;

  @Output() folderSelected = new EventEmitter<FsItem<FileSystemDirectoryHandle>>();
  @Output() fileSelected = new EventEmitter<FsItem<FileSystemFileHandle>>();

  private fsItemToListItem(fsItem: FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>): FileListItem {
    const icon = fsItem.handle.kind === 'directory' ? 'folder' : 'insert_drive_file';
    return {
      fsItem: fsItem,
      icon: icon,
    };
  }

  clickListItem(fsItem: FsItem<FileSystemDirectoryHandle | FileSystemFileHandle>) {
    if (fsItem.handle instanceof FileSystemFileHandle) {
      this.fileSelected.emit(fsItem as FsItem<FileSystemFileHandle>);
    } else if (fsItem.handle instanceof FileSystemDirectoryHandle) {
      this.folderSelected.emit(fsItem as FsItem<FileSystemDirectoryHandle>);
    }
  }
}
