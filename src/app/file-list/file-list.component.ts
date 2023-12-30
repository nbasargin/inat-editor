import { Component, Input } from '@angular/core';

@Component({
  selector: 'ie-file-list',
  standalone: true,
  imports: [],
  template: `
    <p>
      file-list works!
    </p>
  `,
  styles: ``
})
export class FileListComponent {
  @Input() fileList: Array<{fname: string, selected: boolean}> = [];

}
