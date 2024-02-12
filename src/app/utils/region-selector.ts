import { CanvasCoordinates, ImageXY } from './canvas-coordinates';

export type RegionSelectorState =
  | {
      state: 'EMPTY';
    }
  | {
      state: 'MOVE_ONE_CORNER';
      fixedCorner: ImageXY;
      movedCorner: ImageXY;
    }
  | {
      state: 'MOVE_REGION';
      oldCorner1: ImageXY;
      oldCorner2: ImageXY;
      newCorner1: ImageXY;
      newCorner2: ImageXY;
      mouseDownCoords: ImageXY;
    }
  | {
      state: 'DEFINED';
      imgCorner1: ImageXY;
      imgCorner2: ImageXY;
    };

/**
 * Region selection and adjustment, in image coordinates.
 */
export class RegionSelector {
  state: RegionSelectorState = { state: 'EMPTY' };

  constructor(
    public imgWidth: number,
    public imgHeight: number,
    public coordinates: CanvasCoordinates,
  ) {}

  resetState() {
    this.state = { state: 'EMPTY' };
  }

  mouseDown(imageXY: ImageXY) {
    if (this.state.state === 'EMPTY') {
      const imgCoord = this.clipImageCoords(imageXY);
      this.state = {
        state: 'MOVE_ONE_CORNER',
        fixedCorner: imgCoord,
        movedCorner: imgCoord,
      };
    } else if (this.state.state === 'DEFINED') {
      const closeCorner = this.getCloseCorner(this.state.imgCorner1, this.state.imgCorner2, imageXY);
      if (closeCorner) {
        // mouse down close to a selected corner
        this.state = {
          state: 'MOVE_ONE_CORNER',
          fixedCorner: closeCorner.oppositeCorner,
          movedCorner: closeCorner.corner,
        };
      } else if (this.isWithinRegion(this.state.imgCorner1, this.state.imgCorner2, imageXY)) {
        // mouse down inside the selected region
        this.state = {
          state: 'MOVE_REGION',
          oldCorner1: this.state.imgCorner1,
          oldCorner2: this.state.imgCorner2,
          newCorner1: this.state.imgCorner1,
          newCorner2: this.state.imgCorner2,
          mouseDownCoords: imageXY,
        };
      }
    } else {
      console.warn('Undefined transition for mouseDown event, state:', this.state);
    }
  }

  mouseMove(imageXY: ImageXY) {
    if (this.state.state === 'MOVE_ONE_CORNER') {
      const corner2 = this.constrainSecondCorner(this.state.fixedCorner, imageXY);
      this.state = {
        state: 'MOVE_ONE_CORNER',
        fixedCorner: this.state.fixedCorner,
        movedCorner: corner2,
      };
    } else if (this.state.state === 'MOVE_REGION') {
      const { oldCorner1, oldCorner2, mouseDownCoords } = this.state;
      const mouseDx = imageXY.imgX - mouseDownCoords.imgX;
      const mouseDy = imageXY.imgY - mouseDownCoords.imgY;
      const { dx, dy } = this.constrainRegionMovement(oldCorner1, oldCorner2, mouseDx, mouseDy);
      const newCorner1 = { imgX: oldCorner1.imgX + dx, imgY: oldCorner1.imgY + dy };
      const newCorner2 = { imgX: oldCorner2.imgX + dx, imgY: oldCorner2.imgY + dy };
      this.state = { state: 'MOVE_REGION', oldCorner1, oldCorner2, newCorner1, newCorner2, mouseDownCoords };
    }
  }

  mouseUp(imageXY: ImageXY) {
    if (this.state.state === 'MOVE_ONE_CORNER') {
      const corner2 = this.constrainSecondCorner(this.state.fixedCorner, imageXY);
      const imgBoxWidth = Math.abs(this.state.fixedCorner.imgX - corner2.imgX);
      if (imgBoxWidth < 5) {
        // selected region too small, discard
        this.state = { state: 'EMPTY' };
      } else {
        this.state = {
          state: 'DEFINED',
          imgCorner1: this.state.fixedCorner,
          imgCorner2: corner2,
        };
      }
    } else if (this.state.state === 'MOVE_REGION') {
      const { oldCorner1, oldCorner2, mouseDownCoords } = this.state;
      const mouseDx = imageXY.imgX - mouseDownCoords.imgX;
      const mouseDy = imageXY.imgY - mouseDownCoords.imgY;
      const { dx, dy } = this.constrainRegionMovement(oldCorner1, oldCorner2, mouseDx, mouseDy);
      const imgCorner1 = { imgX: oldCorner1.imgX + dx, imgY: oldCorner1.imgY + dy };
      const imgCorner2 = { imgX: oldCorner2.imgX + dx, imgY: oldCorner2.imgY + dy };
      this.state = { state: 'DEFINED', imgCorner1, imgCorner2 };
    }
  }

  getCursor(imageXY: ImageXY) {
    if (this.state.state === 'DEFINED') {
      const closeCorner = this.getCloseCorner(this.state.imgCorner1, this.state.imgCorner2, imageXY);
      if (closeCorner) {
        return closeCorner.cursor;
      }
      if (this.isWithinRegion(this.state.imgCorner1, this.state.imgCorner2, imageXY)) {
        return 'move';
      }
      return 'default';
    }
    if (this.state.state === 'MOVE_REGION') {
      return 'move';
    }
    return 'crosshair'; // EMPTY or MOVE_CORNER
  }

  /**
   * Clip a point to be within the image.
   * Output coorninate values from 0 to width/height (including) are possible.
   */
  private clipImageCoords({ imgX, imgY }: ImageXY): ImageXY {
    imgX = Math.min(this.imgWidth, Math.max(0, imgX));
    imgY = Math.min(this.imgHeight, Math.max(0, imgY));
    return { imgX, imgY };
  }

  /**
   * @param corner1 point within the image, representing one of the box corners
   * @param anotherPoint any point (can be outside, in image coordinates)
   * @returns point within the image, represents the other corner of a square selection
   */
  private constrainSecondCorner(corner1: ImageXY, anotherPoint: ImageXY): ImageXY {
    const clipImgEnd = this.clipImageCoords(anotherPoint);
    const width = clipImgEnd.imgX - corner1.imgX;
    const height = clipImgEnd.imgY - corner1.imgY;
    const maxSize = Math.min(Math.abs(width), Math.abs(height));
    const boxEndX = corner1.imgX + maxSize * Math.sign(width);
    const boxEndY = corner1.imgY + maxSize * Math.sign(height);
    return { imgX: boxEndX, imgY: boxEndY };
  }

  private constrainRegionMovement(oldCorner1: ImageXY, oldCorner2: ImageXY, dx: number, dy: number) {
    const { minX, maxX, minY, maxY } = this.cornersToMinMax(oldCorner1, oldCorner2);
    if (dx > 0) {
      const maxDx = this.imgWidth - maxX;
      dx = Math.min(dx, maxDx);
    }
    if (dy > 0) {
      const maxDy = this.imgHeight - maxY;
      dy = Math.min(dy, maxDy);
    }
    if (dx < 0) {
      const minDx = -minX;
      dx = Math.max(dx, minDx);
    }
    if (dy < 0) {
      const minDy = -minY;
      dy = Math.max(dy, minDy);
    }
    return { dx, dy };
  }

  private cornersToMinMax(
    corner1: ImageXY,
    corner2: ImageXY,
  ): { minX: number; maxX: number; minY: number; maxY: number } {
    const minX = Math.min(corner1.imgX, corner2.imgX);
    const maxX = Math.max(corner1.imgX, corner2.imgX);
    const maxY = Math.max(corner1.imgY, corner2.imgY);
    const minY = Math.min(corner1.imgY, corner2.imgY);
    return { minX, maxX, minY, maxY };
  }

  private getCloseCorner(
    corner1: ImageXY,
    corner2: ImageXY,
    imageXY: ImageXY,
  ): { corner: ImageXY; oppositeCorner: ImageXY; cursor: 'nwse-resize' | 'nesw-resize' } | null {
    const { minX, maxX, minY, maxY } = this.cornersToMinMax(corner1, corner2);
    const cornerNW: ImageXY = { imgX: minX, imgY: minY };
    const cornerNE: ImageXY = { imgX: maxX, imgY: minY };
    const cornerSW: ImageXY = { imgX: minX, imgY: maxY };
    const cornerSE: ImageXY = { imgX: maxX, imgY: maxY };
    const distThreshold = this.coordinates.getDistanceThreshold();
    if (this.distance(imageXY, cornerNW) < distThreshold) {
      return { corner: cornerNW, oppositeCorner: cornerSE, cursor: 'nwse-resize' };
    }
    if (this.distance(imageXY, cornerNE) < distThreshold) {
      return { corner: cornerNE, oppositeCorner: cornerSW, cursor: 'nesw-resize' };
    }
    if (this.distance(imageXY, cornerSW) < distThreshold) {
      return { corner: cornerSW, oppositeCorner: cornerNE, cursor: 'nesw-resize' };
    }
    if (this.distance(imageXY, cornerSE) < distThreshold) {
      return { corner: cornerSE, oppositeCorner: cornerNW, cursor: 'nwse-resize' };
    }
    return null;
  }

  private isWithinRegion(corner1: ImageXY, corner2: ImageXY, { imgX, imgY }: ImageXY) {
    const { minX, maxX, minY, maxY } = this.cornersToMinMax(corner1, corner2);
    return imgX >= minX && imgX <= maxX && imgY >= minY && imgY <= maxY;
  }

  private distance(point1: ImageXY, point2: ImageXY) {
    return Math.sqrt((point1.imgX - point2.imgX) ** 2 + (point1.imgY - point2.imgY) ** 2);
  }
}
