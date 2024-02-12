export interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface UserCommenData {
  cropArea: CropArea;
  downscaled: boolean;
  jpegExportQuality: number;
}
