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

  static createNewExif(
    originalExif: piexifjs.ExifObject,
    imgWidth: number,
    imgHeight: number,
    userCommentAscii: string,
  ): piexifjs.ExifObject {
    // validate userCommentAscii
    const asciiRangeValid = /^[\x00-\x7F]*$/.test(userCommentAscii);
    if (!asciiRangeValid) {
      // the user comment string should only contain ascii characters
      throw new Error('User comment may only contain ASCII characters!');
    }

    const newExif: piexifjs.ExifObject = {
      '0th': {},
      Exif: {},
      GPS: {},
      Interop: {},
      '1st': {},
      thumbnail: null,
    };

    // extract whitelisted IDF0 tags
    const whitelistedIDF0Tags = [
      0x010f, // Exif.Image.Make
      0x0110, // Exif.Image.Model
      0x0131, // Exif.Image.Software
      0x0132, // Exif.Image.DateTime
    ];
    for (const tag of whitelistedIDF0Tags) {
      if (tag in originalExif['0th']) {
        newExif['0th'][tag] = originalExif['0th'][tag];
      }
    }
    // extract whitelisted EXIF / Photo tags
    const whitelistedExifTags = [
      0x829a, // Exif.Photo.ExposureTime
      0x829d, // Exif.Photo.FNumber
      0x8822, // Exif.Photo.ExposureProgram
      0x8827, // Exif.Photo.ISOSpeedRatings
      0x8830, // Exif.Photo.SensitivityType
      0x8832, // Exif.Photo.RecommendedExposureIndex
      0x9000, // Exif.Photo.ExifVersion
      0x9003, // Exif.Photo.DateTimeOriginal
      0x9004, // Exif.Photo.DateTimeDigitized
      0x9010, // Exif.Photo.OffsetTime
      0x9011, // Exif.Photo.OffsetTimeOriginal
      0x9012, // Exif.Photo.OffsetTimeDigitized
      0x9201, // Exif.Photo.ShutterSpeedValue
      0x9202, // Exif.Photo.ApertureValue
      0x9203, // Exif.Photo.BrightnessValue
      0x9204, // Exif.Photo.ExposureBiasValue
      0x9205, // Exif.Photo.MaxApertureValue
      0x9207, // Exif.Photo.MeteringMode
      0x9208, // Exif.Photo.LightSource
      0x9209, // Exif.Photo.Flash
      0x920a, // Exif.Photo.FocalLength
      0xa402, // Exif.Photo.ExposureMode
      0xa403, // Exif.Photo.WhiteBalance
      0xa404, // Exif.Photo.DigitalZoomRatio
      0xa405, // Exif.Photo.FocalLengthIn35mmFilm
      0xa406, // Exif.Photo.SceneCaptureType
      0xa408, // Exif.Photo.Contrast
      0xa409, // Exif.Photo.Saturation
      0xa40a, // Exif.Photo.Sharpness
      0xa432, // Exif.Photo.LensSpecification
      0xa433, // Exif.Photo.LensMake
      0xa434, // Exif.Photo.LensModel
    ];
    for (const tag of whitelistedExifTags) {
      if (tag in originalExif.Exif) {
        newExif.Exif[tag] = originalExif.Exif[tag];
      }
    }
    // extract all GPS tags
    newExif.GPS = originalExif.GPS;

    // write new data to EXIF tags
    newExif.Exif[0xa002] = imgWidth; // Exif.Photo.PixelXDimension
    newExif.Exif[0xa003] = imgHeight; // Exif.Photo.PixelYDimension
    newExif.Exif[0x9286] = userCommentAscii; // Exif.Photo.UserComment

    // write new data to IDF0 tags
    newExif['0th'][0x0100] = imgWidth; // Exif.Image.ImageWidth
    newExif['0th'][0x0101] = imgHeight; // Exif.Image.ImageLength

    return newExif;
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
