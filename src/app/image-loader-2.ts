export class ImageLoader2 {
  asyncDataURL: Promise<string | null>;

  constructor(public readonly handle: FileSystemFileHandle) {
    this.asyncDataURL = this.startLoading();
  }

  private async startLoading(): Promise<string | null> {
    const file = await this.handle.getFile();
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      return null;
    }
    return new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => {
        resolve(reader.result as string);
      });
      reader.addEventListener('error', () => {
        resolve(null);
      });
      reader.readAsDataURL(file);
    });
  }
}
