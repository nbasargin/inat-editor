import { ImageXY } from './canvas-coordinates';
import { FsItem } from './fs-item';

export class ExportImage {
  constructor() {}

  async exportImage(imageFile: FsItem<FileSystemFileHandle>, img: HTMLImageElement, minXY: ImageXY, maxXY: ImageXY) {
    console.log(`minx ${minXY.imgX}, maxx ${maxXY.imgX}, miny ${minXY.imgY}, maxy ${maxXY.imgY}`);
    console.log(`width ${maxXY.imgX - minXY.imgX}, height ${maxXY.imgY - minXY.imgY}`);
    console.log(imageFile.handle.name);
    const croppedImage = this.cropImage(img, minXY, maxXY);
    const exportFolder = await this.getExportFolder(imageFile);
    await this.saveImage(croppedImage, exportFolder, 'test_dummy.txt');
  }

  async getExportFolder(imageFile: FsItem<FileSystemFileHandle>) {
    const imageFolder = imageFile.parent;
    if (!imageFolder) {
      throw new Error('Image file has no folder specified');
    }
    const exportFolder = await imageFolder.handle.getDirectoryHandle('iNat_new', { create: true });
    return exportFolder;
  }

  cropImage(img: HTMLImageElement, minXY: ImageXY, maxXY: ImageXY) {
    return img; // todo
  }

  async saveImage(img: HTMLImageElement, exportFolder: FileSystemDirectoryHandle, imageName: string) {
    const fileHandle = await exportFolder.getFileHandle(imageName, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write('something');
    await writable.close();
  }
}
