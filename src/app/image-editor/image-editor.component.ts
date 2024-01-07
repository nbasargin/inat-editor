import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FsItem } from '../fs-item';
import { ImageLoader2 } from '../image-loader-2';
import * as piexifjs from 'piexifjs';

@Component({
  selector: 'ie-image-editor',
  standalone: true,
  imports: [CommonModule],
  template: ` <img *ngIf="imageLoader" class="main-image" [src]="imageLoader.asyncDataURL | async" /> `,
  styleUrl: 'image-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorComponent {
  imageLoader: ImageLoader2 | null = null;

  @Input() set selectedFile(fsItem: FsItem<FileSystemFileHandle> | null) {
    if (this.imageLoader) {
      this.imageLoader = null;
    }
    if (!fsItem) {
      return;
    }
    this.imageLoader = new ImageLoader2(fsItem.handle);
    this.testExif();
  }

  testExif() {
    if (!this.imageLoader) return;
    this.imageLoader.asyncDataURL.then((jpegData) => {
      if (!jpegData) return;
      const exifObj = piexifjs.load(jpegData);
      const exifBytes = piexifjs.dump(exifObj);
      const jpegDataClean = piexifjs.remove(jpegData);
      const newData = piexifjs.insert(exifBytes, jpegDataClean);
      console.log('exifObj', exifObj);
      console.log('jpegData', jpegData.length);
      console.log('jpegDataClean', jpegDataClean.length);
      console.log('newData', newData.length);

      for (const ifd in exifObj) {
        if (ifd == 'thumbnail') {
          const thumbnailData = exifObj[ifd] === null ? 'null' : exifObj[ifd];
          console.log(`- thumbnail: ${thumbnailData}`);
        } else {
          const ifdTyped = ifd as '0th' | 'Exif' | 'GPS' | 'Interop' | '1st';
          console.log(`- ${ifd}`);
          for (const tag in exifObj[ifdTyped]) {
            console.log(`    - ${piexifjs.TAGS[ifdTyped][tag]['name']}: ${exifObj[ifdTyped][tag]}`);
          }
        }
      }
    });
  }
}
