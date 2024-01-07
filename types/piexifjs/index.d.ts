export interface ExifObject {
  '0th': { [key: number]: any };
  Exif: { [key: number]: any };
  GPS: { [key: number]: any };
  Interop: { [key: number]: any };
  '1st': { [key: number]: any };
  thumbnail: string;
}

declare module 'piexifjs' {
  export const load: (jpegData: string) => ExifObject;
  export const dump: (exifObj: ExifObject) => string;
  export const insert: (exifbytes: string, jpegData: string) => string;
  export const remove: (jpegData: string) => string;
  export const TAGS: {
    Image: { [key: number]: { name: string; type: string } };
    Exif: { [key: number]: { name: string; type: string } };
    GPS: { [key: number]: { name: string; type: string } };
    Interop: { [key: number]: { name: string; type: string } };
    '0th': { [key: number]: { name: string; type: string } };
    '1st': { [key: number]: { name: string; type: string } };
  };
}
