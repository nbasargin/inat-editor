/**
 * Loads an image as object URL given a file handle.
 * Only JPG and PNG images allowed.
 * Object URL can be asynchronously retrieved from asyncObjectURL.
 * This loader should be destroyed when the image is no longer needed.
 */
export class ImageLoader {
  asyncObjectURL: Promise<string | null>;
  private destroyed = false;
  private objectURL: string | null = null;

  constructor(public readonly handle: FileSystemFileHandle) {
    this.asyncObjectURL = this.handle.getFile().then((file) => {
      if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
        return null;
      }
      if (this.destroyed) {
        return null;
      }
      this.objectURL = URL.createObjectURL(file);
      return this.objectURL;
    });
  }

  destroy() {
    this.destroyed = true;
    if (this.objectURL) {
      URL.revokeObjectURL(this.objectURL);
      this.objectURL = null;
    }
  }
}
