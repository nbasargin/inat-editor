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
import { FsItem } from '../utils/fs-item';
import { CanvasCoordinates, ImageXY } from '../utils/canvas-coordinates';
import { CanvasDraw } from '../utils/canvas-draw';
import { Subject } from 'rxjs';
import { RegionSelector } from '../utils/region-selector';
import { FileImageData, RelatedImagesData } from '../utils/image-loader-3';

interface ImageEditorState {
  fsItem: FsItem<FileSystemFileHandle>;
  image: HTMLImageElement;
  dataURL: string;
  coordinates: CanvasCoordinates;
  regionSelector: RegionSelector;
}

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

      <div
        class="button-container"
        *ngIf="allowCrop && imageState && imageState.regionSelector.state.state === 'DEFINED'"
      >
        <button mat-raised-button color="warn" (click)="cancelCrop()">Cancel</button>
        <button mat-raised-button color="primary" (click)="cropImage()">Crop Image</button>
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
  imageState: ImageEditorState | null = null;

  resizeObserver = new ResizeObserver(() => {
    this.resizeCanvasIfNeeded();
    if (this.imageState) {
      this.redrawImage();
      this.redrawOverlay();
    }
  });

  infoMessage = new Subject<string>();

  @ViewChild('imageCanvas', { static: true }) imageCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayCanvas', { static: true }) overlayCanvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() allowCrop: boolean = false;

  @Input() set imageData(data: FileImageData | null) {
    if (!data) {
      this.imageState = null;
    } else {
      const coordinates = new CanvasCoordinates(this.overlayCanvasRef.nativeElement, data.image);
      const regionSelector = new RegionSelector(data.image.width, data.image.height, coordinates);
      this.imageState = {
        fsItem: data.fsItem,
        image: data.image,
        dataURL: data.dataURL,
        coordinates: coordinates,
        regionSelector: regionSelector,
      };
    }
    // update everything
    this.overlayCanvasRef.nativeElement.style.cursor = 'default';
    this.resizeCanvasIfNeeded();
    this.redrawOverlay();
    this.redrawImage();
  }
  @Input() set relatedImagesData(data: RelatedImagesData | null) {
    // todo
  }

  @Output() cropImageRegion = new EventEmitter<{
    data: FileImageData;
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
    if (!this.allowCrop || !this.imageState) {
      return;
    }
    e.preventDefault();
    const imgXY = this.imageState.coordinates.clientToImage(e);
    this.imageState.regionSelector.mouseDown(imgXY);
    this.overlayCanvasRef.nativeElement.style.cursor = this.imageState.regionSelector.getCursor(imgXY);
  }

  mouseMove(e: MouseEvent) {
    if (!this.allowCrop || !this.imageState) {
      return;
    }
    const imgXY = this.imageState.coordinates.clientToImage(e);
    this.imageState.regionSelector.mouseMove(imgXY);
    this.overlayCanvasRef.nativeElement.style.cursor = this.imageState.regionSelector.getCursor(imgXY);
    this.redrawOverlay();
  }

  mouseUp(e: MouseEvent) {
    if (!this.allowCrop || !this.imageState) {
      return;
    }
    const imgXY = this.imageState.coordinates.clientToImage(e);
    this.imageState.regionSelector.mouseUp(imgXY);
    this.overlayCanvasRef.nativeElement.style.cursor = this.imageState.regionSelector.getCursor(imgXY);
    this.redrawOverlay();
  }

  mouseEnter(e: MouseEvent) {
    if (!this.allowCrop || !this.imageState) {
      return;
    }
    const primaryButtonUp = (e.buttons & 1) !== 1;
    const state = this.imageState.regionSelector.state.state;
    if (primaryButtonUp && (state === 'MOVE_ONE_CORNER' || state === 'MOVE_REGION')) {
      // selection not complete but primary button not pressed, cancel selection
      this.imageState.regionSelector.resetState();
    }
  }

  mouseLeave(e: MouseEvent) {
    if (!this.allowCrop || !this.imageState) {
      return;
    }
    const state = this.imageState.regionSelector.state;
    if (state.state === 'MOVE_ONE_CORNER' || state.state == 'MOVE_REGION') {
      const { overlay, overlayCtx } = this.getOverlayAndContext();
      CanvasDraw.clearCanvas(overlayCtx, overlay);
      this.infoMessage.next('');
    }
  }

  cropImage() {
    if (!this.imageState || this.imageState.regionSelector.state.state !== 'DEFINED') {
      return;
    }
    const { fsItem, image, dataURL } = this.imageState;
    const imgC1 = this.imageState.regionSelector.state.imgCorner1;
    const imgC2 = this.imageState.regionSelector.state.imgCorner2;
    const minX = Math.min(imgC1.imgX, imgC2.imgX);
    const maxX = Math.max(imgC1.imgX, imgC2.imgX);
    const minY = Math.min(imgC1.imgY, imgC2.imgY);
    const maxY = Math.max(imgC1.imgY, imgC2.imgY);
    const minXY = { imgX: minX, imgY: minY };
    const maxXY = { imgX: maxX, imgY: maxY };
    this.imageState.regionSelector.resetState();
    this.redrawOverlay();
    this.cropImageRegion.next({ data: { fsItem, image, dataURL }, minXY, maxXY });
  }

  cancelCrop() {
    if (!this.imageState) {
      return;
    }
    this.imageState.regionSelector.resetState();
    this.redrawOverlay();
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

  redrawImage() {
    const { canvas, ctx } = this.getCanvasAndContext();
    CanvasDraw.clearCanvas(ctx, canvas);
    if (!this.imageState) {
      return;
    }
    const { canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight } = this.imageState.coordinates.fitImage();
    CanvasDraw.clearCanvas(ctx, canvas);
    ctx.drawImage(this.imageState.image, canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight);
  }

  redrawOverlay() {
    const { overlay, overlayCtx } = this.getOverlayAndContext();
    CanvasDraw.clearCanvas(overlayCtx, overlay);
    const region = this.getRegionSelectorArea();
    if (!this.imageState || !region) {
      this.infoMessage.next(this.allowCrop ? '' : 'Cropping is disabled in the iNat folder.');
      return;
    }
    // outline
    const canvasC1 = this.imageState.coordinates.imageToCanvas(region.corner1);
    const canvasC2 = this.imageState.coordinates.imageToCanvas(region.corner2);
    CanvasDraw.drawDarkArea(overlayCtx, overlay, canvasC1, canvasC2);
    CanvasDraw.drawThirds(overlayCtx, canvasC1, canvasC2);
    CanvasDraw.drawDashedBox(overlayCtx, canvasC1.canvasX, canvasC1.canvasY, canvasC2.canvasX, canvasC2.canvasY);
    // message
    const x = Math.min(region.corner1.imgX, region.corner2.imgX);
    const y = Math.min(region.corner1.imgY, region.corner2.imgY);
    const width = Math.abs(region.corner1.imgX - region.corner2.imgX);
    const height = Math.abs(region.corner1.imgY - region.corner2.imgY);
    this.infoMessage.next(`X ${x}; Y ${y}; W ${width}; H ${height}`);
  }

  private getRegionSelectorArea() {
    if (!this.imageState) {
      return null;
    }
    const state = this.imageState.regionSelector.state;
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
