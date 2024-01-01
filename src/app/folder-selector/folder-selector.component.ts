import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'ie-folder-selector',
  standalone: true,
  imports: [MatButtonModule],
  template: `
    <button mat-raised-button color="primary" (click)="selectFolder()">Open Folder</button>
    <span class="folder-name">{{ selectedFolder?.name }}</span>
  `,
  styleUrl: 'folder-selector.component.scss',
})
export class FolderSelectorComponent {
  @Input() selectedFolder: FileSystemDirectoryHandle | undefined;

  @Output() folderSelected = new EventEmitter<FileSystemDirectoryHandle | undefined>();

  async selectFolder() {
    try {
      const selectedFolder = await window.showDirectoryPicker();
      console.log('opened folder', selectedFolder);
      this.folderSelected.emit(selectedFolder);
    } catch (e) {
      console.error('Error opening folder', e);
      this.folderSelected.emit(undefined);
    }
  }
}
