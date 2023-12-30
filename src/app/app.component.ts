import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FileListComponent } from './file-list/file-list.component';

@Component({
    selector: 'ie-root',
    standalone: true,
    imports: [CommonModule, FileListComponent],
    template: `
        <h1>Welcome to {{ title }}!</h1>
        <ie-file-list></ie-file-list>
    `,
    styles: [],
})
export class AppComponent {
    title = 'inat-editor';
}
