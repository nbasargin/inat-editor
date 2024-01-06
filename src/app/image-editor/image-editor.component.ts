import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FsItem } from '../fs-item';
import { ImageLoader } from '../image-loader';

@Component({
  selector: 'ie-image-editor',
  standalone: true,
  imports: [CommonModule],
  template: ` <img *ngIf="imageLoader" class="main-image" [src]="imageLoader.asyncObjectURL | async" /> `,
  styleUrl: 'image-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorComponent {
  imageLoader: ImageLoader | null = null;

  @Input() set selectedFile(fsItem: FsItem<FileSystemFileHandle> | null) {
    if (this.imageLoader) {
      this.imageLoader.destroy();
      this.imageLoader = null;
    }
    if (!fsItem) {
      return;
    }
    this.imageLoader = new ImageLoader(fsItem.handle);
  }
}
