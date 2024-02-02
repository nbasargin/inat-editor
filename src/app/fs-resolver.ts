import { FsItem } from './fs-item';

export class FsResolver {
  static async resolveExportFolders(imageFile: FsItem<FileSystemFileHandle>): Promise<{
    iNatFolder: FsItem<FileSystemDirectoryHandle> | null;
    exportFolder: FsItem<FileSystemDirectoryHandle>;
  }> {
    const imageFolder = imageFile.parent;
    if (!imageFolder) {
      throw new Error('Image file has no folder specified');
    }
    let iNatFolder: FsItem<FileSystemDirectoryHandle> | null = null;
    for await (let handle of imageFolder.handle.values()) {
      if (handle.name.toLowerCase() === 'inat' && handle.kind === 'directory') {
        iNatFolder = new FsItem(handle, imageFolder);
      }
    }
    const exportFolderHandle = await imageFolder.handle.getDirectoryHandle('iNat_new', { create: true });
    const exportFolder = new FsItem<FileSystemDirectoryHandle>(exportFolderHandle, imageFolder);
    return { iNatFolder, exportFolder };
  }

  static async findFreeExportFileName(
    exportFolder: FsItem<FileSystemDirectoryHandle>,
    iNatFolder: FsItem<FileSystemDirectoryHandle> | null,
    originalFileName: string,
  ): Promise<string> {
    // fine existing file names in both the export folder and the iNat folder (if exists)
    const existingFileNames = new Set<string>();
    for await (let handle of exportFolder.handle.values()) {
      existingFileNames.add(handle.name.toLowerCase());
    }
    if (iNatFolder) {
      for await (let handle of iNatFolder.handle.values()) {
        existingFileNames.add(handle.name.toLowerCase());
      }
    }
    // find a free file name
    const fileNameNoExt = originalFileName.replace(/\.[^/.]+$/, '');
    let newFileName = `${fileNameNoExt}_iNat.jpg`;
    if (!existingFileNames.has(newFileName.toLowerCase())) {
      return newFileName;
    }
    // already has a file with _iNat appended -> try adding a number
    for (let i = 2; i < 10000; i++) {
      newFileName = `${fileNameNoExt}_iNat_${i}.jpg`;
      if (!existingFileNames.has(newFileName.toLowerCase())) {
        return newFileName;
      }
    }
    // could not find a free name (should never happen)
    throw new Error(`Could not find a suitable filename for ${originalFileName} in ${exportFolder.handle.name}`);
  }
}
