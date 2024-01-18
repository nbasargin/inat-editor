import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
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
    <canvas
      #overlayCanvas
      class="overlay-canvas"
      (mousemove)="mouseMove($event)"
      (dragstart)="dragStart($event)"
      (drag)="drag($event)"
      (dragend)="dragEnd($event)"
      (dragover)="dragOver($event)"
      draggable="true"
    ></canvas>
  `,
  styleUrl: 'image-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorComponent implements OnInit, OnDestroy {
  imageLoader: ImageLoader2 | null = null;
  currentImage: HTMLImageElement | null = null;
  resizeObserver = new ResizeObserver((entries) => {
    this.resizeCanvasIfNeeded();
    if (this.currentImage) {
      this.redrawImage(this.currentImage);
    }
  });

  @ViewChild('imageCanvas', { static: true }) imageCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayCanvas', { static: true }) overlayCanvasRef!: ElementRef<HTMLCanvasElement>;

  // later: refactor to an input that accepts an image or null, not a file handle
  // file handling should happen outside
  @Input() set selectedFile(fsItem: FsItem<FileSystemFileHandle> | null) {
    if (!fsItem) {
      this.imageLoader = null;
      this.clearCanvas();
      return;
    }
    const imageLoader = new ImageLoader2(fsItem.handle);
    this.imageLoader = imageLoader;
    this.asyncDataUrlToImage(this.imageLoader.asyncDataURL).then((img) => {
      if (this.imageLoader != imageLoader) {
        return; // image already changed
      }
      this.currentImage = img;
      this.resizeCanvasIfNeeded();
      this.redrawImage(img);
    });

    // this.testExif();
  }

  ngOnInit(): void {
    this.resizeObserver.observe(this.imageCanvasRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
  }

  mouseMove(e: MouseEvent) {
    if (!this.currentImage) {
      return;
    }

    const { overlay, overlayCtx: ctx } = this.getOverlayAndContext();
    const { overlayPixelX, overlayPixelY } = this.clientCoordsToOverlayCoords(e.clientX, e.clientY);
    this.clearOverlay();

    this.drawDashedLine(ctx, 0, overlayPixelY, overlay.width, overlayPixelY);
    this.drawDashedLine(ctx, overlayPixelX, 0, overlayPixelX, overlay.height);
  }

  dragStart(e: DragEvent) {
    //console.log('drag start', e);
  }

  drag(e: DragEvent) {
    //console.log('drag', e);
  }

  dragEnd(e: DragEvent) {
    //console.log('drag end', e);
  }

  dragOver(e: DragEvent) {
    //console.log('drag over', e);
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

  clientCoordsToOverlayCoords(clientX: number, clientY: number) {
    const overlay = this.overlayCanvasRef.nativeElement;
    const { x, y } = overlay.getBoundingClientRect();
    const overlayPixelX = (clientX - x) * devicePixelRatio;
    const overlayPixelY = (clientY - y) * devicePixelRatio;
    return { overlayPixelX, overlayPixelY };
  }

  getCanvasAndContext() {
    const canvas = this.imageCanvasRef.nativeElement;
    const ctx = canvas?.getContext('2d') as CanvasRenderingContext2D; // should never be null in this case
    return { canvas, ctx };
  }

  getOverlayAndContext() {
    const overlay = this.overlayCanvasRef.nativeElement;
    const overlayCtx = overlay?.getContext('2d') as CanvasRenderingContext2D; // should never be null in this case
    return { overlay, overlayCtx };
  }

  clearCanvas() {
    const { canvas, ctx } = this.getCanvasAndContext();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  clearOverlay() {
    const { overlay, overlayCtx } = this.getOverlayAndContext();
    overlayCtx.clearRect(0, 0, overlay.width, overlay.height);
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

  drawDashedLine(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
    ctx.strokeStyle = 'white';
    ctx.setLineDash([]); // solid
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    ctx.strokeStyle = 'black';
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
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
