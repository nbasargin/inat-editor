export class CanvasCoordinates {
  constructor(
    public canvas: HTMLCanvasElement,
    public img: HTMLImageElement,
    public canvasPadding: number = 8,
  ) {}

  clientToCanvas(clientX: number, clientY: number) {
    const { x, y } = this.canvas.getBoundingClientRect();
    const canvasX = (clientX - x) * devicePixelRatio;
    const canvasY = (clientY - y) * devicePixelRatio;
    return { canvasX, canvasY };
  }

  canvasToImage(canvasX: number, canvasY: number) {
    const { canvasLeft, canvasTop, scaledImgWidth, scaledImgHeight } = this.fitImage();
    const scalingFactorX = scaledImgWidth / this.img.width;
    const scalingFactorY = scaledImgHeight / this.img.height;
    const imgX = (canvasX - canvasLeft) / scalingFactorX;
    const imgY = (canvasY - canvasTop) / scalingFactorY;
    return { imgX, imgY };
  }

  // allow values from 0 to width/height (including)
  clipImageCoords(imgX: number, imgY: number) {
    imgX = Math.min(this.img.width, Math.max(0, imgX));
    imgY = Math.min(this.img.height, Math.max(0, imgY));
    return { imgX, imgY };
  }

  // inputs: img start within the image, imgEnd can be outside
  squareBoxWithinImage(imgStartX: number, imgStartY: number, imgEndX: number, imgEndY: number) {
    const clipImgEnd = this.clipImageCoords(imgEndX, imgEndY);
    const width = clipImgEnd.imgX - imgStartX;
    const height = clipImgEnd.imgY - imgStartY;
    const maxSize = Math.min(Math.abs(width), Math.abs(height));
    const boxEndX = imgStartX + maxSize * Math.sign(width);
    const boxEndY = imgStartY + maxSize * Math.sign(height);
    return { boxEndX, boxEndY };
  }

  imageToCanvas(imgX: number, imgY: number) {
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
}
