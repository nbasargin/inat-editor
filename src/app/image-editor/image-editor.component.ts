import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as piexifjs from 'piexifjs';
import { FsItem } from '../fs-item';
import { ImageLoader2 } from '../image-loader-2';
import { CanvasCoordinates } from '../canvas-coordinates';

@Component({
  selector: 'ie-image-editor',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="canvas-area">
      <canvas #imageCanvas class="image-canvas"></canvas>
      <canvas
        #overlayCanvas
        class="overlay-canvas"
        (mousedown)="mouseDown($event)"
        (mousemove)="mouseMove($event)"
        (mouseup)="mouseUp($event)"
        (mouseenter)="mouseEnter($event)"
        (mouseleave)="mouseLeave($event)"
      ></canvas>
      <div></div>
    </div>
  `,
  styleUrl: 'image-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorComponent implements OnInit, OnDestroy {
  imageLoader: ImageLoader2 | null = null;
  currentImage: HTMLImageElement | null = null;
  coordinates: CanvasCoordinates | null = null;
  resizeObserver = new ResizeObserver((entries) => {
    this.resizeCanvasIfNeeded();
    if (this.currentImage && this.coordinates) {
      this.redrawImage(this.currentImage, this.coordinates);
    }
  });

  selectingRegion = false;
  startImgX = -1;
  startImgY = -1;

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
      this.coordinates = new CanvasCoordinates(this.overlayCanvasRef.nativeElement, img);
      this.resizeCanvasIfNeeded();
      this.redrawImage(img, this.coordinates);
    });

    // this.testExif();
  }

  ngOnInit(): void {
    this.resizeObserver.observe(this.imageCanvasRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
  }

  mouseDown(e: MouseEvent) {
    if (!this.currentImage || !this.coordinates) {
      return;
    }
    e.preventDefault();
    const canvasCoord = this.coordinates.clientToCanvas(e.clientX, e.clientY);
    const imgCoord = this.coordinates.canvasToImage(canvasCoord.canvasX, canvasCoord.canvasY);
    const imgClipped = this.coordinates.clipImageCoords(imgCoord.imgX, imgCoord.imgY);
    this.startImgX = imgClipped.imgX;
    this.startImgY = imgClipped.imgY;
    this.selectingRegion = true;
  }

  mouseMove(e: MouseEvent) {
    if (!this.currentImage || !this.coordinates) {
      return;
    }
    this.clearOverlay();

    const { overlay, overlayCtx } = this.getOverlayAndContext();
    const canvasCoord = this.coordinates.clientToCanvas(e.clientX, e.clientY);
    const imgCoord = this.coordinates.canvasToImage(canvasCoord.canvasX, canvasCoord.canvasY);
    //this.drawCircle(overlayCtx, canvasClipped.canvasX, canvasClipped.canvasY, 5);

    if (!this.selectingRegion) {
      // point within image + two lines through it
      const imgClipped = this.coordinates.clipImageCoords(imgCoord.imgX, imgCoord.imgY);
      const canvasClipped = this.coordinates.imageToCanvas(imgClipped.imgX, imgClipped.imgY);
      this.drawDashedLine(overlayCtx, 0, canvasClipped.canvasY, overlay.width, canvasClipped.canvasY);
      this.drawDashedLine(overlayCtx, canvasClipped.canvasX, 0, canvasClipped.canvasX, overlay.height);
    } else {
      // box from starting point to the final point, constrained to be square and within image
      const boxEnd = this.coordinates.squareBoxWithinImage(
        this.startImgX,
        this.startImgY,
        imgCoord.imgX,
        imgCoord.imgY,
      );
      const canvasStart = this.coordinates.imageToCanvas(this.startImgX, this.startImgY);
      const canvasEnd = this.coordinates.imageToCanvas(boxEnd.boxEndX, boxEnd.boxEndY);
      // lines from start to intermediate points
      this.drawDashedLine(overlayCtx, canvasStart.canvasX, canvasStart.canvasY, canvasEnd.canvasX, canvasStart.canvasY);
      this.drawDashedLine(overlayCtx, canvasStart.canvasX, canvasStart.canvasY, canvasStart.canvasX, canvasEnd.canvasY);
      // lines from end to intermediate points
      this.drawDashedLine(overlayCtx, canvasEnd.canvasX, canvasEnd.canvasY, canvasStart.canvasX, canvasEnd.canvasY);
      this.drawDashedLine(overlayCtx, canvasEnd.canvasX, canvasEnd.canvasY, canvasEnd.canvasX, canvasStart.canvasY);
    }
  }

  mouseUp(e: MouseEvent) {
    this.startImgX = -1;
    this.startImgY = -1;
    this.selectingRegion = false;
  }

  mouseEnter(e: MouseEvent) {
    if ((e.buttons & 1) !== 1) {
      this.mouseUp(e); // primary button not pressed, trigger mouseup
    }
  }

  mouseLeave(e: MouseEvent) {
    this.clearOverlay();
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

  redrawImage(img: HTMLImageElement, coordinates: CanvasCoordinates) {
    const { canvas, ctx } = this.getCanvasAndContext();
    const { canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight } = coordinates.fitImage();
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

  drawCircle(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, fillStyle: string = 'red') {
    ctx.fillStyle = fillStyle;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
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
