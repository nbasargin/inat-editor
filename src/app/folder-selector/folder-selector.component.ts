import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'ie-folder-selector',
  standalone: true,
  imports: [],
  template: `
    <div>
      <button (click)="selectFolder()">Open folder</button>
      <span>{{ selectedFolder?.name }}</span>
    </div>
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
