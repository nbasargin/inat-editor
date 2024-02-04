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
import { CanvasCoordinates, ImageXY } from '../canvas-coordinates';
import { CanvasDraw } from '../canvas-draw';
import { Subject } from 'rxjs';
import { RegionSelector } from './region-selector';

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

      <div class="button-container" *ngIf="regionSelector && regionSelector.state.state === 'DEFINED'">
        <button mat-raised-button color="warn" (click)="cancelCrop()">Cancel</button>
        <button
          mat-raised-button
          color="primary"
          (click)="cropImage(regionSelector.state.imgCorner1, regionSelector.state.imgCorner2)"
        >
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
  regionSelector: RegionSelector | null = null;
  resizeObserver = new ResizeObserver((entries) => {
    this.resizeCanvasIfNeeded();
    if (this.currentImage && this.coordinates) {
      this.redrawImage(this.currentImage, this.coordinates);
      this.redrawOverlay();
    }
    if (this.regionSelector && this.coordinates) {
      this.regionSelector.distThreshold = this.coordinates.getDistanceThreshold();
    }
  });

  infoMessage = new Subject<string>();

  @ViewChild('imageCanvas', { static: true }) imageCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayCanvas', { static: true }) overlayCanvasRef!: ElementRef<HTMLCanvasElement>;

  // later: refactor to an input that accepts an image or null, not a file handle
  // file handling should happen outside
  @Input() set selectedFile(fsItem: FsItem<FileSystemFileHandle> | null) {
    //this.selectedRegion = new ImageRegion();
    const { overlay, overlayCtx } = this.getOverlayAndContext();
    CanvasDraw.clearCanvas(overlayCtx, overlay);
    const { canvas, ctx } = this.getCanvasAndContext();
    CanvasDraw.clearCanvas(ctx, canvas);
    this.currentImage = null;
    this.currentImageDataUrl = null;
    this.coordinates = null;
    this.regionSelector = null;
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
      const distThreshold = this.coordinates.getDistanceThreshold();
      this.regionSelector = new RegionSelector(img.width, img.height, distThreshold);
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
    if (!this.currentImage || !this.coordinates || !this.regionSelector) {
      return;
    }
    e.preventDefault();
    const imgXY = this.coordinates.clientToImage(e);
    this.regionSelector.mouseDown(imgXY);
    this.overlayCanvasRef.nativeElement.style.cursor = this.regionSelector.getCursor(imgXY);
  }

  mouseMove(e: MouseEvent) {
    if (!this.currentImage || !this.coordinates || !this.regionSelector) {
      return;
    }
    const imgXY = this.coordinates.clientToImage(e);
    this.regionSelector.mouseMove(imgXY);
    this.overlayCanvasRef.nativeElement.style.cursor = this.regionSelector.getCursor(imgXY);
    this.redrawOverlay();
  }

  mouseUp(e: MouseEvent) {
    if (!this.currentImage || !this.coordinates || !this.regionSelector) {
      return;
    }
    const imgXY = this.coordinates.clientToImage(e);
    this.regionSelector.mouseUp(imgXY);
    this.overlayCanvasRef.nativeElement.style.cursor = this.regionSelector.getCursor(imgXY);
    this.redrawOverlay();
  }

  mouseEnter(e: MouseEvent) {
    if (!this.regionSelector) {
      return;
    }
    const primaryButtonUp = (e.buttons & 1) !== 1;
    const state = this.regionSelector.state.state;
    if (primaryButtonUp && (state === 'MOVE_ONE_CORNER' || state === 'MOVE_REGION')) {
      // selection not complete but primary button not pressed, cancel selection
      this.regionSelector.resetState();
    }
  }

  mouseLeave(e: MouseEvent) {
    if (!this.regionSelector) {
      return;
    }
    const state = this.regionSelector.state;
    if (state.state === 'MOVE_ONE_CORNER' || state.state == 'MOVE_REGION') {
      const { overlay, overlayCtx } = this.getOverlayAndContext();
      CanvasDraw.clearCanvas(overlayCtx, overlay);
      this.infoMessage.next('');
    }
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

  cancelCrop() {
    if (!this.regionSelector) {
      return;
    }
    this.regionSelector.resetState();
    this.redrawOverlay();
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

  redrawOverlay() {
    if (!this.coordinates) {
      return;
    }
    const region = this.getRegionSelectorArea();
    if (!region) {
      const { overlay, overlayCtx } = this.getOverlayAndContext();
      CanvasDraw.clearCanvas(overlayCtx, overlay);
      this.infoMessage.next('');
      return;
    }
    // outline
    const canvasC1 = this.coordinates.imageToCanvas(region.corner1);
    const canvasC2 = this.coordinates.imageToCanvas(region.corner2);
    const { overlay, overlayCtx } = this.getOverlayAndContext();
    CanvasDraw.clearCanvas(overlayCtx, overlay);
    CanvasDraw.drawDarkArea(overlayCtx, overlay, canvasC1, canvasC2);
    CanvasDraw.drawDashedBox(overlayCtx, canvasC1.canvasX, canvasC1.canvasY, canvasC2.canvasX, canvasC2.canvasY);
    // message
    const x = Math.min(region.corner1.imgX, region.corner2.imgX);
    const y = Math.min(region.corner1.imgY, region.corner2.imgY);
    const width = Math.abs(region.corner1.imgX - region.corner2.imgX);
    const height = Math.abs(region.corner1.imgY - region.corner2.imgY);
    this.infoMessage.next(`X ${x}; Y ${y}; W ${width}; H ${height}`);
  }

  private getRegionSelectorArea() {
    if (!this.regionSelector) {
      return null;
    }
    const state = this.regionSelector.state;
    if (state.state === 'DEFINED') {
      return { corner1: state.imgCorner1, corner2: state.imgCorner2 };
    }
    if (state.state === 'MOVE_ONE_CORNER') {
      return { corner1: state.fixedCorner, corner2: state.movedCorner };
    }
    if (state.state === 'MOVE_REGION') {
      return { corner1: state.newCorner1, corner2: state.newCorner2 };
    }
    return null;
  }
}
