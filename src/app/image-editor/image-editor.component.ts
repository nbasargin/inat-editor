import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
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
import { RegionSelector } from '../utils/region-selector';
import { FileImageData, RelatedImagesData } from '../utils/image-loader-3';
import { CropArea } from '../utils/user-comment-data';

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
      <canvas #overlayCanvas class="overlay-canvas" (mousedown)="mouseDownCanvas($event)"></canvas>
      <div
        class="button-container"
        *ngIf="allowCrop && imageState && imageState.regionSelector.state.state === 'DEFINED'"
      >
        <button mat-raised-button color="warn" (click)="cancelCrop()">Cancel</button>
        <button mat-raised-button color="primary" (click)="cropImage()">Crop Image</button>
      </div>
    </div>
  `,
  styleUrl: 'image-editor.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageEditorComponent implements OnInit, OnDestroy {
  imageState: ImageEditorState | null = null;
  relatedImages: RelatedImagesData | null = null;
  resizeObserver = new ResizeObserver(() => this.canvasResize());

  @ViewChild('imageCanvas', { static: true }) imageCanvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('overlayCanvas', { static: true }) overlayCanvasRef!: ElementRef<HTMLCanvasElement>;

  @Input() allowCrop: boolean = false;
  @Input() set imageData(data: FileImageData | null) {
    this.initializeImage(data);
  }
  @Input() set relatedImagesData(data: RelatedImagesData | null) {
    this.relatedImages = data;
    this.redrawImage();
  }

  @Output() cropImageRegion = new EventEmitter<{
    data: FileImageData;
    minXY: ImageXY;
    maxXY: ImageXY;
  }>();
  @Output() selectCropArea = new EventEmitter<CropArea | null>();

  ngOnInit(): void {
    this.resizeObserver.observe(this.imageCanvasRef.nativeElement);
  }

  ngOnDestroy(): void {
    this.resizeObserver.disconnect();
  }

  @HostListener('document:keydown', ['$event']) keydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.cropImage();
    }
    if (event.key === 'Escape') {
      this.cancelCrop();
    }
  }

  mouseDownCanvas(e: MouseEvent) {
    if (!this.allowCrop || !this.imageState) {
      return;
    }
    e.preventDefault();
    const imgXY = this.imageState.coordinates.clientToImage(e);
    this.imageState.regionSelector.mouseDown(imgXY);
    this.overlayCanvasRef.nativeElement.style.cursor = this.imageState.regionSelector.getCursor(imgXY);
  }

  @HostListener('document:mousemove', ['$event'])
  mouseMoveDocument(e: MouseEvent) {
    if (!this.allowCrop || !this.imageState) {
      return;
    }
    const imgXY = this.imageState.coordinates.clientToImage(e);
    this.imageState.regionSelector.mouseMove(imgXY);
    this.overlayCanvasRef.nativeElement.style.cursor = this.imageState.regionSelector.getCursor(imgXY);
    this.redrawOverlay();
  }

  @HostListener('document:mouseup', ['$event'])
  mouseUpDocument(e: MouseEvent) {
    if (!this.allowCrop || !this.imageState) {
      return;
    }
    const imgXY = this.imageState.coordinates.clientToImage(e);
    this.imageState.regionSelector.mouseUp(imgXY);
    this.overlayCanvasRef.nativeElement.style.cursor = this.imageState.regionSelector.getCursor(imgXY);
    this.redrawOverlay();
  }

  private canvasResize() {
    this.resizeCanvasIfNeeded();
    if (this.imageState) {
      this.redrawImage();
      this.redrawOverlay();
    }
  }

  private initializeImage(data: FileImageData | null) {
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

  cropImage() {
    if (!this.allowCrop || !this.imageState || this.imageState.regionSelector.state.state !== 'DEFINED') {
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

  private resizeCanvasIfNeeded() {
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

  private getCanvasAndContext() {
    const canvas = this.imageCanvasRef.nativeElement;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D; // should never be null in this case
    return { canvas, ctx };
  }

  private getOverlayAndContext() {
    const overlay = this.overlayCanvasRef.nativeElement;
    const overlayCtx = overlay.getContext('2d') as CanvasRenderingContext2D; // should never be null in this case
    return { overlay, overlayCtx };
  }

  private redrawImage() {
    const { canvas, ctx } = this.getCanvasAndContext();
    CanvasDraw.clearCanvas(ctx, canvas);
    if (!this.imageState) {
      return;
    }
    const { canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight } = this.imageState.coordinates.fitImage();
    CanvasDraw.clearCanvas(ctx, canvas);
    ctx.drawImage(this.imageState.image, canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight);
    // related images bounding boxes
    if (!this.relatedImages) {
      return;
    }

    for (const cropArea of this.relatedImages.cropAreas) {
      const { x, y, width, height } = cropArea;
      const c1 = this.imageState.coordinates.imageToCanvas({ imgX: x, imgY: y });
      const c2 = this.imageState.coordinates.imageToCanvas({ imgX: x + width, imgY: y + height });
      CanvasDraw.drawDashedBox(ctx, c1.canvasX, c1.canvasY, c2.canvasX, c2.canvasY);
    }
  }

  private redrawOverlay() {
    const { overlay, overlayCtx } = this.getOverlayAndContext();
    CanvasDraw.clearCanvas(overlayCtx, overlay);
    const region = this.getRegionSelectorArea();
    if (!this.imageState || !region) {
      this.selectCropArea.next(null);
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
    this.selectCropArea.next({ x, y, width, height });
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
      return { corner1: state.fixedCorner, corner2: state.newMovedCorner };
    }
    if (state.state === 'MOVE_REGION') {
      return { corner1: state.newCorner1, corner2: state.newCorner2 };
    }
    return null;
  }
}
