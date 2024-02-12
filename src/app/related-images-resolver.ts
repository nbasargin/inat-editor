import { ExifUtils } from './exif-utils';
import { FsItem } from './fs-item';
import { FsResolver } from './fs-resolver';
import { ImageLoader2 } from './image-loader-2';
import { CropArea, UserCommenData } from './user-comment-data';

export interface RelatedImagesData {
  relatedImages: Array<FsItem<FileSystemFileHandle>>;
  cropAreas: Array<CropArea>;
}

export class RelatedImagesResolver {
  asyncRelatedData: Promise<RelatedImagesData>;

  constructor(mainImage: FsItem<FileSystemFileHandle>) {
    this.asyncRelatedData = this.startLoading(mainImage);
  }

  // given an fs item, find related images, load them, extract cropAreas from the bounding boxes, provide as promise
  private async startLoading(mainImage: FsItem<FileSystemFileHandle>): Promise<RelatedImagesData> {
    const { iNatFolder, iNatNewFolder } = await FsResolver.findINatFolders(mainImage);
    const iNatImages = iNatFolder ? await FsResolver.findRelatedImages(iNatFolder, mainImage.handle.name) : [];
    const iNatNewImages = iNatNewFolder ? await FsResolver.findRelatedImages(iNatNewFolder, mainImage.handle.name) : [];
    const relatedImages = [...iNatImages, ...iNatNewImages];
    const allCropAreas: Array<CropArea | null> = await Promise.all(relatedImages.map((img) => this.loadCropArea(img)));
    const cropAreas = allCropAreas.filter((area): area is CropArea => !!area);
    return { relatedImages, cropAreas };
  }

  private async loadCropArea(image: FsItem<FileSystemFileHandle>): Promise<CropArea | null> {
    try {
      const imageLoader = new ImageLoader2(image.handle);
      const dataURL = await imageLoader.asyncDataURL;
      const exif = ExifUtils.readExifFromDataUrl(dataURL);
      const userCommentAscii = exif.Exif[0x9286]; // Exif.Photo.UserComment
      let userComment: UserCommenData | null = null;
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
