import { Component } from '@angular/core';

@Component({
  selector: 'ie-folder-selector',
  standalone: true,
  imports: [],
  template: `
    <div>
      <button (click)="openFolder()">Open folder</button>
    </div>
  `,
  styleUrl: 'folder-selector.component.scss',
})
export class FolderSelectorComponent {
  openFolder() {
    console.log('open folder');
  }
}
