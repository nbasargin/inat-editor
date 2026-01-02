import { ExifUtils } from './exif-utils';
import { FsItem } from './fs-item';
import { FsResolver } from './fs-resolver';
import { CropArea, UserCommentData } from './user-comment-data';

export interface FileImageData {
  fsItem: FsItem<FileSystemFileHandle>;
  image: HTMLImageElement;
  dataURL: string;
}

export interface RelatedImagesData {
  relatedImages: Array<FsItem<FileSystemFileHandle>>;
  cropAreas: Array<CropArea>;
}

export class ImageLoader3 {
  static async readImageDataURL(handle: FileSystemFileHandle): Promise<string> {
    const file = await handle.getFile();
    if (file.type !== 'image/jpeg') {
      throw new Error(`File type is not allowed: ${file.type}!`);
    }
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        const result = reader.result as string | null;
        if (!result) {
          reject();
        } else {
          resolve(result);
        }
      });
      reader.addEventListener('error', () => {
        reject();
      });
      reader.readAsDataURL(file);
    });
  }

  static async createImage(fsItem: FsItem<FileSystemFileHandle>): Promise<FileImageData> {
    const dataURL = await ImageLoader3.readImageDataURL(fsItem.handle);
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ fsItem, image, dataURL });
      image.onerror = () => reject();
      image.src = dataURL;
    });
  }

  static async readRelatedImagesData(mainImage: FsItem<FileSystemFileHandle>): Promise<RelatedImagesData> {
    const { iNatFolder, iNatNewFolder } = await FsResolver.findINatFolders(mainImage);
    const iNatImages = iNatFolder ? await FsResolver.findRelatedImages(iNatFolder, mainImage.handle.name) : [];
    const iNatNewImages = iNatNewFolder ? await FsResolver.findRelatedImages(iNatNewFolder, mainImage.handle.name) : [];
    const relatedImages = [...iNatImages, ...iNatNewImages];
    const allCropAreas: Array<CropArea | null> = await Promise.all(
      relatedImages.map((img) => ImageLoader3.loadCropArea(img)),
    );
    const cropAreas = allCropAreas.filter((area): area is CropArea => !!area);
    return { relatedImages, cropAreas };
  }

  private static async loadCropArea(image: FsItem<FileSystemFileHandle>): Promise<CropArea | null> {
    try {
      const dataURL = await ImageLoader3.readImageDataURL(image.handle);
      const exif = ExifUtils.readExifFromDataUrl(dataURL).Exif;
      const userCommentAscii = exif ? exif[0x9286] : 'null'; // Exif.Photo.UserComment
      let userComment: UserCommentData | null = null;
      try {
        userComment = JSON.parse(userCommentAscii);
      } catch (e) {
        return null;
      }
      if (!userComment || !userComment.cropArea) {
        return null;
      }
      const { x, y, width, height }: CropArea = userComment.cropArea;
      if (typeof x !== 'number' || typeof y !== 'number' || typeof width !== 'number' || typeof height !== 'number') {
        return null;
      }
      return { x, y, width, height };
    } catch (e) {
      console.error(`Unexpected error when loading crop area for ${image.handle.name}`, e);
      return null;
    }
  }
}
