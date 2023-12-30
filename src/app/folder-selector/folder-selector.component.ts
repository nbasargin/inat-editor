import { Component } from '@angular/core';

@Component({
  selector: 'ie-folder-selector',
  standalone: true,
  imports: [],
  template: `
    <div>
      <button (click)="openFolder()">Open folder</button>
      <span>{{ currentFolder?.name }}</span>
    </div>
  `,
  styleUrl: 'folder-selector.component.scss',
})
export class FolderSelectorComponent {
  currentFolder: FileSystemDirectoryHandle | undefined;

  async openFolder() {
    console.log('open folder');
    this.currentFolder = await window.showDirectoryPicker();
    console.log(this.currentFolder);
  }
}
