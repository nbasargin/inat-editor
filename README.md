# iNatEditor

A web app to speed up iNaturalist observation cropping.

Deployed version: https://nbasargin.github.io/inat-editor/

### Cropping workflow

- select a folder with photos
- select an image (list on the left, or with arrow keys)
- place the bounding box
- click "Crop Image" or press Enter
- the cropped image will be saved in the `iNat` subfolder

### Notes

- only JPG images are currently supported
- selected image EXIF tags (camera settings, GPS, ...) are saved with the cropped image
- the crop box is always a square
- cropped images have the maximal size of 2048px (matching iNaturalist limits as of May 2024)
- the app gets access to local files through the File System Access API, see supporting browsers: https://caniuse.com/native-filesystem-api

### Running locally

This is a standard Angular project. Clone the repository, install dependencies (`npm i`), run `ng serve` for a dev server, and open `http://localhost:4200/`.
