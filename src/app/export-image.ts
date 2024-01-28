import { ExifObject } from 'piexifjs';
import { ImageXY } from './canvas-coordinates';
import { ExifUtils } from './exif-utils';
import { FsItem } from './fs-item';

export class ExportImage {
  constructor(
    public maxCropSize: number = 2048,
    public jpegExportQuality: number = 0.9,
  ) {}

  async exportImage(
    imageFile: FsItem<FileSystemFileHandle>,
    img: HTMLImageElement,
    imgDataUrl: string,
    minXY: ImageXY,
    maxXY: ImageXY,
  ) {
    console.log(
      `minx ${minXY.imgX}, miny ${minXY.imgY}, width ${maxXY.imgX - minXY.imgX}, height ${maxXY.imgY - minXY.imgY}`,
    );
    // read exif data for original dataurl
    const originalExif: ExifObject = ExifUtils.readExifFromDataUrl(imgDataUrl);
    // modify exif to include correct dimensions, old x,y + width, height
    const newExif: ExifObject = this.adjustExif(originalExif, minXY, maxXY);
    // croppedImage to dataurl
    const croppedImageDataUrl = this.cropImageToDataUrl(img, minXY, maxXY);
    // write modified exif into croppedImage dataurl
    const finalDataUrl = ExifUtils.writeExifToDataUrl(croppedImageDataUrl, newExif);
    // convert dataurl to blob
    const imgBlob = this.dataUrlToBlob(finalDataUrl);

    return; // TEMP TODO

    // save cropped image to disk
    const exportFolder = await this.getExportFolder(imageFile);
    const outFileName = 'test_dummy_2.jpg';
    const fileHandle = await exportFolder.getFileHandle(outFileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(imgBlob);
    await writable.close();
  }

  cropImageToDataUrl(img: HTMLImageElement, minXY: ImageXY, maxXY: ImageXY): string {
    const canvas = document.createElement('canvas');
    const { imgSize, canvasSize } = this.imgPointsToSize(minXY, maxXY);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not obtain canvas context to crop the image!');
    }
    ctx.drawImage(img, minXY.imgX, minXY.imgY, imgSize, imgSize, 0, 0, canvasSize, canvasSize);
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return croppedDataUrl;
  }

  adjustExif(originalExif: ExifObject, minXY: ImageXY, maxXY: ImageXY): ExifObject {
    ExifUtils.logExif(originalExif);

    const { imgWidth, imgHeight, imgSize, canvasSize } = this.imgPointsToSize(minXY, maxXY);
    // TODO extract useful EXIF data, not everything
    // write image size metadata
    // write software tag
    // write user comment to store crop box

    // user comment
    const userComment = {
      cropBox: {
        x: minXY.imgX,
        y: minXY.imgX,
        width: imgWidth,
        height: imgHeight,
      },
      downscaled: imgSize > canvasSize,
      jpegExportQuality: this.jpegExportQuality,
    };
    const userCommentAscii = JSON.stringify(userComment);
    const asciiRangeValid = /^[\x00-\x7F]*$/.test(userCommentAscii);
    if (!asciiRangeValid) {
      // the user comment string should only contain ascii characters
      throw new Error('Invalid user comment metadata!');
    }

    return originalExif; // TODO
  }

  dataUrlToBlob(dataUrl: string): Blob {
    if (!dataUrl.startsWith('data:image/jpeg;base64,')) {
      throw new Error('Only data URLs starting with "data:image/jpeg;base64" allowed!');
    }
    const base64String = dataUrl.split(',')[1];
    const byteString = atob(base64String);
    const typedArray = new Uint8Array(new ArrayBuffer(byteString.length));
    for (var i = 0; i < byteString.length; i++) {
      typedArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([typedArray], { type: 'image/jpeg' });
  }

  async getExportFolder(imageFile: FsItem<FileSystemFileHandle>) {
    const imageFolder = imageFile.parent;
    if (!imageFolder) {
      throw new Error('Image file has no folder specified');
    }
    const exportFolder = await imageFolder.handle.getDirectoryHandle('iNat_new', { create: true });
    return exportFolder;
  }

  private imgPointsToSize(minXY: ImageXY, maxXY: ImageXY) {
    const imgWidth = maxXY.imgX - minXY.imgX;
    const imgHeight = maxXY.imgY - minXY.imgY;
    if (imgWidth != imgHeight) {
      throw new Error('only square images allowed!');
    }
    const imgSize = imgWidth;
    const canvasSize = Math.min(imgWidth, this.maxCropSize);
    return {
      imgWidth,
      imgHeight,
      imgSize,
      canvasSize,
    };
  }
}
