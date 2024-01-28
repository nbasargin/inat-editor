import { ExifObject } from 'piexifjs';
import { ImageXY } from './canvas-coordinates';
import { ExifUtils } from './exif-utils';
import { FsItem } from './fs-item';

export class ExportImage {
  constructor(public maxCropSize: number = 2048) {}

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
    const imgWidth = maxXY.imgX - minXY.imgX;
    const imgHeight = maxXY.imgY - minXY.imgY;
    if (imgWidth != imgHeight) {
      throw new Error('only square images allowed!');
    }
    const canvasSize = Math.min(imgWidth, this.maxCropSize);
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not obtain canvas context to crop the image!');
    }
    ctx.drawImage(img, minXY.imgX, minXY.imgY, imgWidth, imgHeight, 0, 0, canvasSize, canvasSize);
    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    return croppedDataUrl;
  }

  adjustExif(originalExif: ExifObject, minXY: ImageXY, maxXY: ImageXY): ExifObject {
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
}
