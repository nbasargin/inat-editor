export interface ClientXY {
  clientX: number;
  clientY: number;
}

export interface CanvasXY {
  canvasX: number;
  canvasY: number;
}

export interface ImageXY {
  imgX: number;
  imgY: number;
}

/**
 * Coordinate transformations: client -> canvas <-> image
 */
export class CanvasCoordinates {
  constructor(
    public canvas: HTMLCanvasElement,
    public img: HTMLImageElement,
    public canvasPadding: number = 16,
  ) {}

  clientToCanvas({ clientX, clientY }: ClientXY) {
    const { x, y } = this.canvas.getBoundingClientRect();
    const canvasX = (clientX - x) * devicePixelRatio;
    const canvasY = (clientY - y) * devicePixelRatio;
    return { canvasX, canvasY };
  }

  canvasToImage({ canvasX, canvasY }: CanvasXY) {
    const { canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight } = this.fitImage();
    const scalingFactorX = scaledImgWidth / this.img.width;
    const scalingFactorY = scaledImgHeight / this.img.height;
    const imgX = Math.round((canvasX - canvasLeft) / scalingFactorX);
    const imgY = Math.round((canvasY - canvasTop) / scalingFactorY);
    return { imgX, imgY };
  }

  clientToImage(clientXY: ClientXY) {
    return this.canvasToImage(this.clientToCanvas(clientXY));
  }

  imageToCanvas({ imgX, imgY }: ImageXY): CanvasXY {
    const { canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight } = this.fitImage();
    const scalingFactorX = scaledImgWidth / this.img.width;
    const scalingFactorY = scaledImgHeight / this.img.height;
    const canvasX = imgX * scalingFactorX + canvasLeft;
    const canvasY = imgY * scalingFactorY + canvasTop;
    return { canvasX, canvasY };
  }

  fitImage() {
    const innerWidth = this.canvas.width - this.canvasPadding * 2;
    const innerHeight = this.canvas.height - this.canvasPadding * 2;
    const hRatio = innerWidth / this.img.width;
    const vRatio = innerHeight / this.img.height;
    const scalingFactor = Math.min(hRatio, vRatio, 1); // do not scale up image if it is smaller than canvas
    const scaledImgWidth = Math.round(this.img.width * scalingFactor);
    const scaledImgHeight = Math.round(this.img.height * scalingFactor);
    const canvasLeft = Math.floor((innerWidth - scaledImgWidth) / 2) + this.canvasPadding;
    const canvasTop = Math.floor((innerHeight - scaledImgHeight) / 2) + this.canvasPadding;
    return {
      canvasLeft,
      canvasTop,
      scaledImgWidth,
      scaledImgHeight,
    };
  }

  getDistanceThreshold(): number {
    const c1 = this.clientToCanvas({ clientX: 0, clientY: 0 });
    const c2 = this.clientToCanvas({ clientX: 24, clientY: 0 });
    const i1 = this.canvasToImage(c1);
    const i2 = this.canvasToImage(c2);
    return i2.imgX - i1.imgX;
  }
}
