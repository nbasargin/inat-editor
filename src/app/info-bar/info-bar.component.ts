import { Component, Input } from '@angular/core';
import { RelatedImagesData } from '../utils/image-loader-3';
import { CropArea } from '../utils/user-comment-data';

@Component({
  selector: 'ie-info-bar',
  imports: [],
  template: `
    @if (!allowCrop) {
      <div>Cropping is disabled in the iNat folder.</div>
    }
    @if (allowCrop && relatedImagesData) {
      <div>
        {{ relatedImagesData.relatedImages.length }} related images, {{ relatedImagesData.cropAreas.length }} crop areas
        found.
      </div>
    }
    @if (selectedCropArea) {
      <div class="right-align">
        Selected area: X {{ selectedCropArea.x }}; Y {{ selectedCropArea.y }}; {{ selectedCropArea.width }} x
        {{ selectedCropArea.height }}
      </div>
    }
  `,
  styleUrl: 'info-bar.component.scss',
})
export class InfoBarComponent {
  @Input() allowCrop = false;
  @Input() relatedImagesData: RelatedImagesData | null = null;
  @Input() selectedCropArea: CropArea | null = null;
}

