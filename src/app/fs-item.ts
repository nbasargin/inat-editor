export class FsItem<T extends FileSystemHandle> {
  constructor(
    public readonly handle: T,
    public readonly parent: FsItem<FileSystemDirectoryHandle> | null,
  ) {}

  getFullPath() {
    const path: Array<FsItem<T | FileSystemDirectoryHandle>> = [this];
    let parent = this.parent;
    while (parent !== null) {
      path.unshift(parent);
      parent = parent.parent;
    }
    return path;
  }
}
