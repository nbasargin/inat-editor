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

    for (const ifd in exifObj) {
      if (ifd == 'thumbnail') {
        const thumbnailData = exifObj[ifd] === null ? 'null' : exifObj[ifd];
        console.log(`- thumbnail: ${thumbnailData}`);
      } else {
        const ifdTyped = ifd as '0th' | 'Exif' | 'GPS' | 'Interop' | '1st';
        console.log(`- ${ifd}`);
        for (const tag in exifObj[ifdTyped]) {
          console.log(`    - ${piexifjs.TAGS[ifdTyped][tag]['name']}: ${exifObj[ifdTyped][tag]}`);
        }
      }
    }
  }
}
