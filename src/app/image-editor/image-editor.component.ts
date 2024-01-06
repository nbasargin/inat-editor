import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { FsItem } from '../fs-item';

@Component({
  selector: 'ie-image-editor',
  standalone: true,
  imports: [],
  template: ` <img #mainImage class="main-image" /> `,
  styleUrl: 'image-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorComponent {
  @ViewChild('mainImage') mainImage!: ElementRef<HTMLImageElement>;

  @Input() set selectedFile(fsItem: FsItem<FileSystemFileHandle> | null) {
    this.unloadImage();
    if (!fsItem) {
      return;
    }
    this.loadImage(fsItem.handle);
  }

  private currentDataURL: string | null = null;

  unloadImage() {
    if (this.currentDataURL) {
      this.mainImage.nativeElement.src = '';
      URL.revokeObjectURL(this.currentDataURL);
      this.currentDataURL = null;
    }
  }

  async loadImage(handle: FileSystemFileHandle) {
    const file = await handle.getFile();
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      return;
    }
    this.currentDataURL = URL.createObjectURL(file);
    this.mainImage.nativeElement.src = this.currentDataURL;
  }
}
