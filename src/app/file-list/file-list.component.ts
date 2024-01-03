import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule, MAT_TOOLTIP_DEFAULT_OPTIONS } from '@angular/material/tooltip';

interface FileListItem {
  fsHandle: FileSystemDirectoryHandle | FileSystemFileHandle;
  icon: string;
}
@Component({
  selector: 'ie-file-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  providers: [{ provide: MAT_TOOLTIP_DEFAULT_OPTIONS, useValue: { disableTooltipInteractivity: true } }],
  template: `
    <div
      *ngFor="let listItem of fileListItems"
      class="folder-entry"
      [class.selected]="listItem.fsHandle === selectedFile"
      (click)="clickListItem(listItem.fsHandle)"
    >
      <mat-icon [fontIcon]="listItem.icon" class="entry-icon"></mat-icon>
      <span class="entry-name" [matTooltip]="listItem.fsHandle.name" [matTooltipShowDelay]="200">{{
        listItem.fsHandle.name
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

  @Input() set fileList(list: Array<FileSystemDirectoryHandle | FileSystemFileHandle>) {
    this.fileListItems = list.map((file) => this.fsHandleToListItem(file));
  }
  @Input() selectedFile: FileSystemFileHandle | undefined = undefined;

  @Output() folderSelected = new EventEmitter<FileSystemDirectoryHandle | undefined>();
  @Output() fileSelected = new EventEmitter<FileSystemFileHandle | undefined>();

  private fsHandleToListItem(fsHandle: FileSystemDirectoryHandle | FileSystemFileHandle): FileListItem {
    const icon = fsHandle.kind === 'directory' ? 'folder' : 'insert_drive_file';
    return {
      fsHandle: fsHandle,
      icon: icon,
    };
  }

  clickListItem(file: FileSystemDirectoryHandle | FileSystemFileHandle) {
    if (file instanceof FileSystemFileHandle) {
      this.fileSelected.emit(file);
    } else {
      console.log('Folder click');
    }
  }
}
