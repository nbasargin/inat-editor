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
    const newExif: ExifObject = this.createNewExif(originalExif, minXY, maxXY);
    // croppedImage to dataurl
    const croppedImageDataUrl = this.cropImageToDataUrl(img, minXY, maxXY);
    // write modified exif into croppedImage dataurl
    const finalDataUrl = ExifUtils.writeExifToDataUrl(croppedImageDataUrl, newExif);
    // convert dataurl to blob
    const imgBlob = this.dataUrlToBlob(finalDataUrl);
    // save cropped image to disk
    const exportFolder = await this.getExportFolder(imageFile);
    const outFileName = 'test_dummy_with_exif.jpg';
    await this.writeBlobToFile(imgBlob, exportFolder, outFileName);
  }

  async writeBlobToFile(blob: Blob, exportFolder: FileSystemDirectoryHandle, fileName: string) {
    const fileHandle = await exportFolder.getFileHandle(fileName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
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

  createUserComment(minXY: ImageXY, maxXY: ImageXY): string {
    const { imgWidth, imgHeight, imgSize, canvasSize } = this.imgPointsToSize(minXY, maxXY);
    const userComment = {
      cropSoftware: 'iNat Editor v0.1',
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
    return userCommentAscii;
  }

  createNewExif(originalExif: ExifObject, minXY: ImageXY, maxXY: ImageXY): ExifObject {
    const newExif: ExifObject = {
      '0th': {},
      Exif: {},
      GPS: {},
      Interop: {},
      '1st': {},
      thumbnail: null,
    };

    // extract whitelisted IDF0 tags
    const whitelistedIDF0Tags = [
      0x010f, // Exif.Image.Make
      0x0110, // Exif.Image.Model
      0x0131, // Exif.Image.Software
      0x0132, // Exif.Image.DateTime
    ];
    for (const tag of whitelistedIDF0Tags) {
      if (tag in originalExif['0th']) {
        newExif['0th'][tag] = originalExif['0th'][tag];
      }
    }
    // extract whitelisted EXIF / Photo tags
    const whitelistedExifTags = [
      0x829a, // Exif.Photo.ExposureTime
      0x829d, // Exif.Photo.FNumber
      0x8822, // Exif.Photo.ExposureProgram
      0x8827, // Exif.Photo.ISOSpeedRatings
      0x8830, // Exif.Photo.SensitivityType
      0x8832, // Exif.Photo.RecommendedExposureIndex
      0x9000, // Exif.Photo.ExifVersion
      0x9003, // Exif.Photo.DateTimeOriginal
      0x9004, // Exif.Photo.DateTimeDigitized
      0x9010, // Exif.Photo.OffsetTime
      0x9011, // Exif.Photo.OffsetTimeOriginal
      0x9012, // Exif.Photo.OffsetTimeDigitized
      0x9201, // Exif.Photo.ShutterSpeedValue
      0x9202, // Exif.Photo.ApertureValue
      0x9203, // Exif.Photo.BrightnessValue
      0x9204, // Exif.Photo.ExposureBiasValue
      0x9205, // Exif.Photo.MaxApertureValue
      0x9207, // Exif.Photo.MeteringMode
      0x9208, // Exif.Photo.LightSource
      0x9209, // Exif.Photo.Flash
      0x920a, // Exif.Photo.FocalLength
      0xa402, // Exif.Photo.ExposureMode
      0xa403, // Exif.Photo.WhiteBalance
      0xa404, // Exif.Photo.DigitalZoomRatio
      0xa405, // Exif.Photo.FocalLengthIn35mmFilm
      0xa406, // Exif.Photo.SceneCaptureType
      0xa408, // Exif.Photo.Contrast
      0xa409, // Exif.Photo.Saturation
      0xa40a, // Exif.Photo.Sharpness
      0xa432, // Exif.Photo.LensSpecification
      0xa433, // Exif.Photo.LensMake
      0xa434, // Exif.Photo.LensModel
    ];
    for (const tag of whitelistedExifTags) {
      if (tag in originalExif.Exif) {
        newExif.Exif[tag] = originalExif.Exif[tag];
      }
    }
    // extract all GPS tags
    newExif.GPS = originalExif.GPS;

    // write new data to EXIF tags
    const { imgWidth, imgHeight } = this.imgPointsToSize(minXY, maxXY);
    newExif.Exif[0xa002] = imgWidth; // Exif.Photo.PixelXDimension
    newExif.Exif[0xa003] = imgHeight; // Exif.Photo.PixelYDimension
    newExif.Exif[0x9286] = this.createUserComment(minXY, maxXY); // Exif.Photo.UserComment

    // write new data to IDF0 tags
    newExif['0th'][0x0100] = imgWidth; // Exif.Image.ImageWidth
    newExif['0th'][0x0101] = imgHeight; // Exif.Image.ImageLength

    return newExif;
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
