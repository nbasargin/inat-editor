import { ChangeDetectionStrategy, Component, ElementRef, Input, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FsItem } from '../fs-item';
import { ImageLoader2 } from '../image-loader-2';
import * as piexifjs from 'piexifjs';

@Component({
  selector: 'ie-image-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <canvas #imageCanvas class="image-canvas"></canvas>
    <canvas #overlayCanvas class="overlay-canvas"></canvas>
  `,
  styleUrl: 'image-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorComponent {
  imageLoader: ImageLoader2 | null = null;
  imgElement: Promise<HTMLImageElement> | null = null;

  @ViewChild('imageCanvas', { static: true }) imageCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayCanvas', { static: true }) overlayCanvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() set selectedFile(fsItem: FsItem<FileSystemFileHandle> | null) {
    if (this.imageLoader) {
      this.imageLoader = null;
    }
    this.clearCanvas();
    if (!fsItem) {
      return;
    }
    this.imageLoader = new ImageLoader2(fsItem.handle);

    const imgElement = this.asyncDataUrlToImage(this.imageLoader.asyncDataURL);
    this.imgElement = imgElement;
    this.imgElement.then((img) => {
      if (this.imgElement != imgElement) {
        return; // image already changed
      }
      this.resizeCanvasIfNeeded();
      this.redrawImage(img);
    });

    // this.testExif();
  }

  async asyncDataUrlToImage(asyncDataURL: Promise<string | null>): Promise<HTMLImageElement> {
    const dataUrl = await asyncDataURL;
    return new Promise((resolve, reject) => {
      if (!dataUrl) {
        reject();
      } else {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject();
        img.src = dataUrl;
      }
    });
  }

  resizeCanvasIfNeeded() {
    if (!this.imageCanvasRef || !this.overlayCanvasRef) {
      return;
    }
    const canvas = this.imageCanvasRef.nativeElement;
    const overlay = this.overlayCanvasRef.nativeElement;
    const { width, height } = canvas.getBoundingClientRect();
    const canvasWidth = Math.floor(width * devicePixelRatio);
    const canvasHeight = Math.floor(height * devicePixelRatio);
    if (canvasWidth !== canvas.width || canvasHeight !== canvas.height) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      overlay.width = canvasWidth;
      overlay.height = canvasHeight;
    }
  }

  getCanvasAndContext() {
    const canvas = this.imageCanvasRef.nativeElement;
    const ctx = canvas?.getContext('2d') as CanvasRenderingContext2D; // should never be null in this case
    return { canvas, ctx };
  }

  clearCanvas() {
    const { canvas, ctx } = this.getCanvasAndContext();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  redrawImage(img: HTMLImageElement) {
    const { canvas, ctx } = this.getCanvasAndContext();
    // compute image area
    const { canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight } = this.fitImage(
      img.width,
      img.height,
      canvas.width,
      canvas.height,
    );
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight);
  }

  private fitImage(imgWidth: number, imgHeight: number, canvasWidth: number, canvasHeight: number) {
    const hRatio = canvasWidth / imgWidth;
    const vRatio = canvasHeight / imgHeight;
    const scalingFactor = Math.min(hRatio, vRatio, 1); // do not scale up image if it is smaller than canvas
    const scaledImgWidth = Math.floor(imgWidth * scalingFactor);
    const scaledImgHeight = Math.floor(imgHeight * scalingFactor);
    const canvasLeft = Math.floor((canvasWidth - scaledImgWidth) / 2);
    const canvasTop = Math.floor((canvasHeight - scaledImgHeight) / 2);
    return {
      canvasLeft,
      canvasTop,
      scaledImgWidth,
      scaledImgHeight,
    };
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
