import { ExifObject } from 'piexifjs';
import { ImageXY } from './canvas-coordinates';
import { ExifUtils } from './exif-utils';
import { FsItem } from './fs-item';

export class ExportImage {
  constructor() {}

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
    return ''; // TODO
  }

  adjustExif(originalExif: ExifObject, minXY: ImageXY, maxXY: ImageXY): ExifObject {
    return originalExif; // TODO
  }

  dataUrlToBlob(dataUrl: string): Blob {
    return new Blob(); // TODO
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
