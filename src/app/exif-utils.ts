import * as piexifjs from 'piexifjs';

export class ExifUtils {
  static readExifFromDataUrl(dataUrl: string) {
    return piexifjs.load(dataUrl);
  }

  static writeExifToDataUrl(dataUrl: string, exifObj: piexifjs.ExifObject) {
    const dataClean = piexifjs.remove(dataUrl);
    const exifBytes = piexifjs.dump(exifObj);
    return piexifjs.insert(exifBytes, dataClean);
  }

  static logExif(exifObj: piexifjs.ExifObject) {
    for (const ifd in exifObj) {
      if (ifd == 'thumbnail') {
        const thumbnailData = exifObj[ifd];
        const thumbComment = thumbnailData ? `available, ${thumbnailData.length} chars` : 'missing';
        console.log(`- thumbnail: ${thumbComment}`);
      } else {
        const ifdTyped = ifd as '0th' | 'Exif' | 'GPS' | 'Interop' | '1st';
        console.log(`- ${ifd}`);
        for (const tag in exifObj[ifdTyped]) {
          const stringValue = `${exifObj[ifdTyped][tag]}`;
          console.log(`    - ${piexifjs.TAGS[ifdTyped][tag]['name']}: ${stringValue.substring(0, 30)}`);
        }
      }
    }
  }

  static testExif(jpegData: string) {
    if (!jpegData) return;
    const exifObj = piexifjs.load(jpegData);
    const exifBytes = piexifjs.dump(exifObj);
    const jpegDataClean = piexifjs.remove(jpegData);
    const newData = piexifjs.insert(exifBytes, jpegDataClean);
    console.log('exifObj', exifObj);
    console.log('jpegData', jpegData.length);
    console.log('jpegDataClean', jpegDataClean.length);
    console.log('newData', newData.length);

    ExifUtils.logExif(exifObj);
  }
}
