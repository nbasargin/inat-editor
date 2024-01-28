import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { FsItem } from '../fs-item';
import { ImageLoader2 } from '../image-loader-2';
import { CanvasCoordinates, ClientXY, ImageXY } from '../canvas-coordinates';
import { CanvasDraw } from '../canvas-draw';
import { ImageRegion } from '../image-region';
import { Subject } from 'rxjs';

@Component({
  selector: 'ie-image-editor',
  standalone: true,
  imports: [MatButtonModule, CommonModule],
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

      <div class="button-container" *ngIf="selectedRegion.corner1 && selectedRegion.corner2">
        <button mat-raised-button color="primary" (click)="cropImage(selectedRegion.corner1, selectedRegion.corner2)">
          Crop Image
        </button>
      </div>

      <div class="info-container" *ngIf="infoMessage | async as msg">
        {{ msg }}
      </div>
    </div>
  `,
  styleUrl: 'image-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorComponent implements OnInit, OnDestroy {
  imageLoader: ImageLoader2 | null = null;
  currentImage: HTMLImageElement | null = null;
  currentImageDataUrl: string | null = null;
  coordinates: CanvasCoordinates | null = null;
  resizeObserver = new ResizeObserver((entries) => {
    this.resizeCanvasIfNeeded();
    if (this.currentImage && this.coordinates) {
      this.redrawImage(this.currentImage, this.coordinates);
      if (this.selectedRegion.corner1 && this.selectedRegion.corner2) {
        this.redrawSelectedRegionOutline(this.selectedRegion.corner1, this.selectedRegion.corner2, this.coordinates);
      }
    }
  });

  selectedRegion = new ImageRegion();
  infoMessage = new Subject<string>();

  @ViewChild('imageCanvas', { static: true }) imageCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayCanvas', { static: true }) overlayCanvasRef!: ElementRef<HTMLCanvasElement>;

  // later: refactor to an input that accepts an image or null, not a file handle
  // file handling should happen outside
  @Input() set selectedFile(fsItem: FsItem<FileSystemFileHandle> | null) {
    this.selectedRegion = new ImageRegion();
    const { overlay, overlayCtx } = this.getOverlayAndContext();
    CanvasDraw.clearCanvas(overlayCtx, overlay);
    const { canvas, ctx } = this.getCanvasAndContext();
    CanvasDraw.clearCanvas(ctx, canvas);
    this.currentImage = null;
    this.currentImageDataUrl = null;
    this.coordinates = null;
    if (!fsItem) {
      this.imageLoader = null;
      return;
    }
    const imageLoader = new ImageLoader2(fsItem.handle);
    this.imageLoader = imageLoader;
    this.asyncDataUrlToImage(this.imageLoader.asyncDataURL).then(({ img, dataUrl }) => {
      if (this.imageLoader != imageLoader) {
        return; // image already changed
      }
      this.currentImage = img;
      this.currentImageDataUrl = dataUrl;
      this.coordinates = new CanvasCoordinates(this.overlayCanvasRef.nativeElement, img);
      this.resizeCanvasIfNeeded();
      this.redrawImage(img, this.coordinates);
    });
  }

  @Output() cropImageRegion = new EventEmitter<{
    img: HTMLImageElement;
    dataUrl: string;
    minXY: ImageXY;
    maxXY: ImageXY;
  }>();

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
    const canvasCoord = this.coordinates.clientToCanvas(e);
    const imgCoord = this.coordinates.canvasToImage(canvasCoord);
    const imgClipped = this.coordinates.clipImageCoords(imgCoord);
    this.selectedRegion = new ImageRegion();
    this.selectedRegion.corner1 = imgClipped;
  }

  mouseMove(e: MouseEvent) {
    if (!this.currentImage || !this.coordinates) {
      return;
    }
    const canvasCoord = this.coordinates.clientToCanvas(e);
    const imgCoord = this.coordinates.canvasToImage(canvasCoord);

    if (!this.selectedRegion.corner1 || this.selectedRegion.corner2) {
      const withinImage = this.coordinates.clipImageCoords(imgCoord);
      this.infoMessage.next(`X ${withinImage.imgX}; Y ${withinImage.imgY}`);
      return;
    }

    const imgC1 = this.selectedRegion.corner1;
    const imgC2 = this.coordinates.constrainSecondCorner(imgC1, imgCoord);
    this.redrawSelectedRegionOutline(this.selectedRegion.corner1, imgC2, this.coordinates);

    const width = Math.abs(imgC2.imgX - imgC1.imgX);
    const height = Math.abs(imgC2.imgY - imgC1.imgY);
    this.infoMessage.next(`W ${width}; H ${height}`);
  }

  mouseUp(e: MouseEvent) {
    if (!this.currentImage || !this.coordinates || !this.selectedRegion.corner1) {
      return;
    }
    const imgC2 = this.getSecondCorner(this.coordinates, this.selectedRegion.corner1, e);
    const imgBoxWidth = Math.abs(this.selectedRegion.corner1.imgX - imgC2.imgX);
    if (imgBoxWidth > 5) {
      // selected region valid, keep for later
      this.selectedRegion.corner2 = imgC2;
      this.redrawSelectedRegionOutline(this.selectedRegion.corner1, imgC2, this.coordinates);
    } else {
      // box too small
      this.selectedRegion = new ImageRegion();
      const { overlay, overlayCtx } = this.getOverlayAndContext();
      CanvasDraw.clearCanvas(overlayCtx, overlay);
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
    this.infoMessage.next('');
  }

  cropImage(imgC1: ImageXY, imgC2: ImageXY) {
    if (!this.currentImage || !this.currentImageDataUrl) {
      return;
    }
    const minX = Math.min(imgC1.imgX, imgC2.imgX);
    const maxX = Math.max(imgC1.imgX, imgC2.imgX);
    const minY = Math.min(imgC1.imgY, imgC2.imgY);
    const maxY = Math.max(imgC1.imgY, imgC2.imgY);
    const minXY = { imgX: minX, imgY: minY };
    const maxXY = { imgX: maxX, imgY: maxY };
    const img = this.currentImage;
    this.cropImageRegion.next({ img, dataUrl: this.currentImageDataUrl, minXY, maxXY });
  }

  async asyncDataUrlToImage(asyncDataURL: Promise<string | null>): Promise<{ img: HTMLImageElement; dataUrl: string }> {
    const dataUrl = await asyncDataURL;
    return new Promise((resolve, reject) => {
      if (!dataUrl) {
        reject();
      } else {
        const img = new Image();
        img.onload = () => resolve({ img, dataUrl });
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
    CanvasDraw.clearCanvas(ctx, canvas);
    ctx.drawImage(img, canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight);
  }

  redrawSelectedRegionOutline(imgC1: ImageXY, imgC2: ImageXY, coordinates: CanvasCoordinates) {
    const canvasC1 = coordinates.imageToCanvas(imgC1);
    const canvasC2 = coordinates.imageToCanvas(imgC2);
    const { overlay, overlayCtx } = this.getOverlayAndContext();
    CanvasDraw.clearCanvas(overlayCtx, overlay);
    CanvasDraw.drawDashedBox(overlayCtx, canvasC1.canvasX, canvasC1.canvasY, canvasC2.canvasX, canvasC2.canvasY);
  }

  getSecondCorner(coordinates: CanvasCoordinates, imgC1: ImageXY, clientXY: ClientXY) {
    const canvasCoord = coordinates.clientToCanvas(clientXY);
    const imgCoord = coordinates.canvasToImage(canvasCoord);
    const imgC2 = coordinates.constrainSecondCorner(imgC1, imgCoord);
    return imgC2;
  }
}
