import { ChangeDetectionStrategy, Component, ElementRef, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FsItem } from '../fs-item';
import { ImageLoader2 } from '../image-loader-2';
import { CanvasCoordinates } from '../canvas-coordinates';
import { CanvasDraw } from '../canvas-draw';
import { ImageRegion } from '../image-region';

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

  selectedRegion = new ImageRegion();

  @ViewChild('imageCanvas', { static: true }) imageCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayCanvas', { static: true }) overlayCanvasRef!: ElementRef<HTMLCanvasElement>;

  // later: refactor to an input that accepts an image or null, not a file handle
  // file handling should happen outside
  @Input() set selectedFile(fsItem: FsItem<FileSystemFileHandle> | null) {
    if (!fsItem) {
      this.imageLoader = null;
      const { canvas, ctx } = this.getCanvasAndContext();
      CanvasDraw.clearCanvas(ctx, canvas);
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
    this.selectedRegion = new ImageRegion();
    this.selectedRegion.corner1 = imgClipped;
  }

  mouseMove(e: MouseEvent) {
    if (!this.currentImage || !this.coordinates) {
      return;
    }

    const { overlay, overlayCtx: ctx } = this.getOverlayAndContext();
    const canvasCoord = this.coordinates.clientToCanvas(e.clientX, e.clientY);
    const imgCoord = this.coordinates.canvasToImage(canvasCoord.canvasX, canvasCoord.canvasY);

    if (this.selectedRegion.corner1 && !this.selectedRegion.corner2) {
      // select corner 2: the region with corners 1 and 2 is constrained to be square and within image
      const imgC1 = this.selectedRegion.corner1;
      const imgC2 = this.coordinates.getSecondCorner(imgC1, imgCoord);
      const canvasC1 = this.coordinates.imageToCanvas(imgC1.imgX, imgC1.imgY);
      const canvasC2 = this.coordinates.imageToCanvas(imgC2.imgX, imgC2.imgY);
      CanvasDraw.clearCanvas(ctx, overlay);
      CanvasDraw.drawDashedBox(ctx, canvasC1.canvasX, canvasC1.canvasY, canvasC2.canvasX, canvasC2.canvasY);
    }
  }

  mouseUp(e: MouseEvent) {
    if (!this.currentImage || !this.coordinates) {
      return;
    }
    if (this.selectedRegion.corner1) {
      const { overlay, overlayCtx: ctx } = this.getOverlayAndContext();
      const canvasCoord = this.coordinates.clientToCanvas(e.clientX, e.clientY);
      const imgCoord = this.coordinates.canvasToImage(canvasCoord.canvasX, canvasCoord.canvasY);
      const imgC1 = this.selectedRegion.corner1;
      const imgC2 = this.coordinates.getSecondCorner(imgC1, imgCoord);
      this.selectedRegion.corner2 = imgC2;
      const canvasC1 = this.coordinates.imageToCanvas(imgC1.imgX, imgC1.imgY);
      const canvasC2 = this.coordinates.imageToCanvas(imgC2.imgX, imgC2.imgY);
      CanvasDraw.clearCanvas(ctx, overlay);
      CanvasDraw.drawDashedBox(ctx, canvasC1.canvasX, canvasC1.canvasY, canvasC2.canvasX, canvasC2.canvasY);
    }
  }

  mouseEnter(e: MouseEvent) {
    if (!this.selectedRegion.corner2 && (e.buttons & 1) !== 1) {
      // selection not complete but primary button not pressed, cancel selection
      this.selectedRegion = new ImageRegion();
    }
  }

  mouseLeave(e: MouseEvent) {
    if (!this.selectedRegion.corner2) {
      const { overlay, overlayCtx } = this.getOverlayAndContext();
      CanvasDraw.clearCanvas(overlayCtx, overlay);
    }
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
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D; // should never be null in this case
    return { canvas, ctx };
  }

  getOverlayAndContext() {
    const overlay = this.overlayCanvasRef.nativeElement;
    const overlayCtx = overlay.getContext('2d') as CanvasRenderingContext2D; // should never be null in this case
    return { overlay, overlayCtx };
  }

  redrawImage(img: HTMLImageElement, coordinates: CanvasCoordinates) {
    const { canvas, ctx } = this.getCanvasAndContext();
    const { canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight } = coordinates.fitImage();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight);
  }
}
