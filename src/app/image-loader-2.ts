export class ImageLoader2 {
  asyncDataURL: Promise<string>;

  constructor(public readonly handle: FileSystemFileHandle) {
    this.asyncDataURL = this.startLoading();
  }

  private async startLoading(): Promise<string> {
    const file = await this.handle.getFile();
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
}
