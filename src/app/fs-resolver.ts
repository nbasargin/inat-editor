import { FsItem } from './fs-item';

export class FsResolver {
  static async resolveINatFolders(imageFile: FsItem<FileSystemFileHandle>): Promise<{
    iNatFolder: FsItem<FileSystemDirectoryHandle>;
    iNatNewFolder: FsItem<FileSystemDirectoryHandle>;
  }> {
    const imageFolder = imageFile.parent;
    if (!imageFolder) {
      throw new Error('Image file has no folder specified');
    }
    const iNatFolderHandle = await imageFolder.handle.getDirectoryHandle('iNat', { create: true });
    const iNatFolder = new FsItem(iNatFolderHandle, imageFolder);
    // export iNat_new folder is inside the iNat folder
    const iNatNewFolderHandle = await iNatFolderHandle.getDirectoryHandle('iNat_new', { create: true });
    const iNatNewFolder = new FsItem<FileSystemDirectoryHandle>(iNatNewFolderHandle, imageFolder);
    return { iNatFolder, iNatNewFolder };
  }

  static async findFreeExportFileName(
    iNatFolder: FsItem<FileSystemDirectoryHandle>,
    originalFileName: string,
  ): Promise<string> {
    // find existing file names in the iNat folder and all subfolders
    const fileNames = await FsResolver.recursivelyGetFileNames(iNatFolder.handle);
    const namesLowercase = new Set([...fileNames].map((name) => name.toLowerCase()));
    // find a free file name: append '_iNat', '_iNat_2', ... to the name until a free one is found
    const fileNameNoExt = originalFileName.replace(/\.[^/.]+$/, '');
    for (let i = 1; i < 10000; i++) {
      const newFileName = i == 1 ? `${fileNameNoExt}_iNat.jpg` : `${fileNameNoExt}_iNat_${i}.jpg`;
      if (!namesLowercase.has(newFileName.toLowerCase())) {
        return newFileName;
      }
    }
    // could not find a free name
    throw new Error(`Could not find a suitable filename for ${originalFileName} in ${iNatFolder.handle.name}`);
  }

  private static async recursivelyGetFileNames(folderHandle: FileSystemDirectoryHandle): Promise<Set<string>> {
    const fileNames = new Set<string>();
    for await (let handle of folderHandle.values()) {
      fileNames.add(handle.name);
      if (handle.kind === 'directory') {
        const subfolderFileNames = await FsResolver.recursivelyGetFileNames(handle);
        for (const name of subfolderFileNames) {
          fileNames.add(name);
        }
      }
    }
    return fileNames;
  }
}
