export class FsItem<T extends FileSystemHandle> {
  constructor(
    public readonly handle: T,
    public readonly parent: FsItem<FileSystemDirectoryHandle> | null,
  ) {}
}
