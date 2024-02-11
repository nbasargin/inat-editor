import { ExifObject } from 'piexifjs';
import { ImageXY } from './canvas-coordinates';
import { ExifUtils } from './exif-utils';
import { FsItem } from './fs-item';
import { FsResolver } from './fs-resolver';

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
  ): Promise<FsItem<FileSystemFileHandle>> {
    // read exif data for original dataurl
    const originalExif: ExifObject = ExifUtils.readExifFromDataUrl(imgDataUrl);
    // create new exif with selected tags, correct dimensions, and a user comment with some metadata
    const { imgWidth, imgHeight } = this.imgPointsToSize(minXY, maxXY);
    const usercommentAscii = this.createUserComment(minXY, maxXY);
    const newExif: ExifObject = ExifUtils.createNewExif(originalExif, imgWidth, imgHeight, usercommentAscii);
    // crop image to dataurl
    const croppedImageDataUrl = this.cropImageToDataUrl(img, minXY, maxXY);
    // write modified exif into croppedImage dataurl
    const finalDataUrl = ExifUtils.writeExifToDataUrl(croppedImageDataUrl, newExif);
    // convert dataurl to blob
    const imgBlob = this.dataUrlToBlob(finalDataUrl);
    // find a free file name
    const { iNatFolder, iNatNewFolder } = await FsResolver.resolveINatFolders(imageFile);
    const outFileName = await FsResolver.findFreeExportFileName(iNatFolder, imageFile.handle.name);
    // save cropped image to disk
    const outFile = await this.writeBlobToFile(imgBlob, iNatNewFolder, outFileName);
    return outFile;
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

  private createUserComment(minXY: ImageXY, maxXY: ImageXY): string {
    const { imgWidth, imgHeight, imgSize, canvasSize } = this.imgPointsToSize(minXY, maxXY);
    const userComment = {
      cropArea: {
        x: minXY.imgX,
        y: minXY.imgY,
        width: imgWidth,
        height: imgHeight,
      },
      downscaled: imgSize > canvasSize,
      jpegExportQuality: this.jpegExportQuality,
    };
    const userCommentAscii = JSON.stringify(userComment);
    return userCommentAscii;
  }

  private cropImageToDataUrl(img: HTMLImageElement, minXY: ImageXY, maxXY: ImageXY): string {
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

  private dataUrlToBlob(dataUrl: string): Blob {
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

  private async writeBlobToFile(blob: Blob, folder: FsItem<FileSystemDirectoryHandle>, fileName: string) {
    const fileHandle = await folder.handle.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return new FsItem(fileHandle, folder);
  }
}
